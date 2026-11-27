import crypto from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import {
  claimAdminCredential,
  deleteGuideById,
  deleteMonitoredSourceById,
  deleteNationalUpdateById,
  deleteOpportunityById,
  deleteProblemById,
  getAdminCredential,
  getDbMode,
  getOrCreateSessionSecret,
  hashPassword,
  initDb,
  insertAuditLogEntry,
  insertContactMessage,
  insertGuide,
  insertOpportunity,
  insertProblem,
  persistSyncBatch,
  readDb,
  saveSyncEngineState,
  toPublicProblem,
  updateGuide,
  updateOpportunity,
  updateProblem,
  upsertMonitoredSource,
  upsertNationalUpdate,
  upsertNotificationSubscription,
  verifyPassword,
} from './db.ts';
import {
  extractItemsFromBody,
  validateSafePublicUrl,
  validateUrlFormat,
} from './sourceFetcher.ts';
import {
  buildAuditLog,
  computeEngineStats,
  ingestRawItem,
  runSyncCycle,
  sweepExpiredItems,
} from './syncEngine.ts';
import type {
  DocumentGuide,
  ListingStatus,
  MonitoredSource,
  NotificationTopic,
  Opportunity,
  OpportunityCategory,
  ProblemCategory,
  ProblemReport,
  ProblemStatus,
  Province,
  SourceType,
  UpdateCategory,
  UpdateVerificationStatus,
} from '../src/types.ts';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function cleanStr(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function cleanStrArray(value: unknown, maxItems = 20, maxItemLen = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim().slice(0, maxItemLen) : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

function timingSafeMatch(aStr: string, bStr: string): boolean {
  const a = Buffer.from(aStr);
  const b = Buffer.from(bStr);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createApiApp(): Promise<Express> {
  await initDb();
  const sessionSecret = await getOrCreateSessionSecret();

  function signAdminToken(): string {
    const payload = Buffer.from(
      JSON.stringify({
        role: 'admin',
        exp: Date.now() + TOKEN_TTL_MS,
        nonce: crypto.randomBytes(8).toString('hex'),
      }),
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifyAdminToken(token: string | undefined): boolean {
    if (!token || !token.includes('.')) return false;
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expectedSig = crypto
      .createHmac('sha256', sessionSecret)
      .update(payload)
      .digest('base64url');
    if (!timingSafeMatch(sig, expectedSig)) {
      return false;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
        role?: string;
        exp?: number;
      };
      return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
    } catch {
      return false;
    }
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    if (!verifyAdminToken(token)) {
      res.status(401).json({ error: 'Admin authentication required.' });
      return;
    }
    next();
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Basic health check
  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      const db = await readDb();
      res.json({
        ok: true,
        database: getDbMode(),
        counts: {
          opportunities: db.opportunities.filter((o) => o.status === 'active').length,
          guides: db.guides.length,
          problems: db.problems.length,
        },
      });
    }),
  );

  // Public opportunities listing (only active & expired visible publicly; pending/rejected stay in admin queue)
  app.get(
    '/api/opportunities',
    asyncHandler(async (req, res) => {
      const db = await readDb();
      const category = cleanStr(req.query.category, 30);
      const province = cleanStr(req.query.province, 40);
      const includeExpired = req.query.includeExpired !== 'false';

      let items = db.opportunities.filter(
        (o) => o.status === 'active' || (includeExpired && o.status === 'expired'),
      );
      if (category && category !== 'all') {
        items = items.filter((o) => o.category === category);
      }
      if (province && province !== 'All') {
        items = items.filter((o) => o.province === province);
      }
      res.json({ items });
    }),
  );

  // Public suggest-an-opportunity endpoint (goes to 'pending' for admin verification & approval)
  app.post(
    '/api/opportunities/suggest',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const category = cleanStr(body.category, 30) as OpportunityCategory;
      const validCategories: OpportunityCategory[] = ['scholarship', 'job', 'internship', 'course'];
      if (!validCategories.includes(category)) {
        res.status(400).json({ error: 'Invalid opportunity category.' });
        return;
      }
      const titleEn = cleanStr(body.titleEn, 160);
      const organizationEn = cleanStr(body.organizationEn, 140);
      const officialUrl = cleanStr(body.officialUrl, 300);
      const province = (cleanStr(body.province, 40) || 'Sindh') as Exclude<Province, 'All'>;
      const deadline = cleanStr(body.deadline, 40) || 'Rolling';
      const descriptionEn = cleanStr(body.descriptionEn, 600);
      const submittedBy = cleanStr(body.submittedBy, 100) || 'Citizen Contributor';

      if (!titleEn || !organizationEn || !isValidHttpUrl(officialUrl)) {
        res
          .status(400)
          .json({ error: 'Title, organization, and a valid http/https official URL are required.' });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const newItem: Opportunity = {
        id: `sub-${crypto.randomBytes(4).toString('hex')}`,
        category,
        titleEn,
        titleUr: cleanStr(body.titleUr, 160) || titleEn,
        organizationEn,
        organizationUr: cleanStr(body.organizationUr, 140) || organizationEn,
        province,
        cityOrScopeEn: cleanStr(body.cityOrScopeEn, 100) || province,
        cityOrScopeUr: cleanStr(body.cityOrScopeUr, 100) || province,
        educationLevel: cleanStr(body.educationLevel, 60) || 'Open',
        deadline,
        stipendOrScopeEn: cleanStr(body.stipendOrScopeEn, 120) || 'Verify on official portal',
        stipendOrScopeUr: cleanStr(body.stipendOrScopeUr, 120) || 'سرکاری پورٹل پر تصدیق کریں',
        eligibilityEn: cleanStrArray(body.eligibilityEn).length
          ? cleanStrArray(body.eligibilityEn)
          : ['Check official source link for full eligibility criteria.'],
        eligibilityUr: ['مکمل اہلیت کے لیے سرکاری ویب سائٹ دیکھیں۔'],
        requiredDocsEn: cleanStrArray(body.requiredDocsEn).length
          ? cleanStrArray(body.requiredDocsEn)
          : ['CNIC / B-Form'],
        requiredDocsUr: ['قومی شناختی کارڈ / ب فارم'],
        descriptionEn: descriptionEn || 'Citizen-submitted listing pending source verification.',
        descriptionUr:
          descriptionEn || 'شہری کی جانب سے بھیجی گئی تفصیل تصدیق کے انتظار میں ہے۔',
        officialUrl,
        verifiedSource: false,
        lastVerifiedDate: today,
        status: 'pending',
        isDemo: false,
        submittedBy,
        createdAt: new Date().toISOString(),
      };

      await insertOpportunity(newItem);
      res.status(201).json({ message: 'Submitted for admin verification.', id: newItem.id });
    }),
  );

  // Public document guides
  app.get(
    '/api/guides',
    asyncHandler(async (req, res) => {
      const db = await readDb();
      const province = cleanStr(req.query.province, 40);
      let items = db.guides;
      if (province && province !== 'All') {
        items = items.filter((g) => g.province === province || g.province === 'Federal');
      }
      res.json({ items });
    }),
  );

  // Public problem tracker (strips reporter PII!)
  app.get(
    '/api/problems',
    asyncHandler(async (_req, res) => {
      const db = await readDb();
      res.json({ items: db.problems.map(toPublicProblem) });
    }),
  );

  // Submit public problem report
  app.post(
    '/api/problems',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const validCategories: ProblemCategory[] = [
        'Water & Sewerage',
        'Electricity & Gas',
        'Road & Streetlights',
        'Garbage & Sanitation',
        'Education & School',
        'Health & Hospital',
        'Government Office Service',
      ];
      const category = cleanStr(body.category, 60) as ProblemCategory;
      if (!validCategories.includes(category)) {
        res.status(400).json({ error: 'Please select a valid civic issue category.' });
        return;
      }

      const district = cleanStr(body.district, 80);
      const area = cleanStr(body.area, 120);
      const title = cleanStr(body.title, 160);
      const description = cleanStr(body.description, 1000);
      const province = (cleanStr(body.province, 40) || 'Sindh') as Exclude<Province, 'All'>;

      if (!district || !area || !title || !description) {
        res.status(400).json({ error: 'District, area, title, and description are required.' });
        return;
      }

      const db = await readDb();
      const now = new Date().toISOString();
      const randomNum = 1050 + db.problems.length + Math.floor(Math.random() * 90);
      const prefix = province === 'Sindh' ? 'SND' : 'PAK';
      const report: ProblemReport = {
        id: `prb-${crypto.randomBytes(4).toString('hex')}`,
        referenceCode: `RST-${prefix}-${randomNum}`,
        category,
        province,
        district,
        area,
        title,
        description,
        reporterName: cleanStr(body.reporterName, 80) || undefined,
        reporterContact: cleanStr(body.reporterContact, 80) || undefined,
        status: 'submitted',
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      };

      await insertProblem(report);
      res.status(201).json({ item: toPublicProblem(report) });
    }),
  );

  // Contact / Feedback submission
  app.post(
    '/api/contact',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const name = cleanStr(body.name, 100);
      const contact = cleanStr(body.contact, 120);
      const topic = cleanStr(body.topic, 100) || 'General Feedback';
      const message = cleanStr(body.message, 1200);

      if (!name || !contact || !message) {
        res.status(400).json({ error: 'Name, contact info, and message are required.' });
        return;
      }

      await insertContactMessage({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        name,
        contact,
        topic,
        message,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json({ ok: true });
    }),
  );

  // --- National Update Engine Public APIs ---

  app.get(
    '/api/updates',
    asyncHandler(async (req, res) => {
      const db = await readDb();
      const sweep = sweepExpiredItems(db, 'scheduler');
      if (sweep.expiredCount > 0) {
        await persistSyncBatch({
          updates: sweep.expiredUpdates,
          expiredOpportunities: sweep.expiredOpportunities,
          logs: sweep.logs,
        });
      }

      const category = cleanStr(req.query.category, 40);
      const province = cleanStr(req.query.province, 40);
      const deadlineFilter = cleanStr(req.query.deadlineFilter, 30) || 'all';
      const search = cleanStr(req.query.search, 120).toLowerCase();

      const todayMs = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      let items = db.nationalUpdates.filter(
        (u) =>
          u.status === 'auto_published' ||
          u.status === 'approved' ||
          u.status === 'expired',
      );

      if (category && category !== 'all') {
        items = items.filter((u) => u.category === category);
      }

      if (province && province !== 'All') {
        items = items.filter(
          (u) => u.province === province || u.province === 'All' || u.province === 'Federal',
        );
      }

      if (deadlineFilter === 'active') {
        items = items.filter((u) => u.status !== 'expired');
      } else if (deadlineFilter === 'expired') {
        items = items.filter((u) => u.status === 'expired');
      } else if (deadlineFilter === 'rolling') {
        items = items.filter((u) => u.deadline === 'Rolling' && u.status !== 'expired');
      } else if (deadlineFilter === 'closing_soon') {
        items = items.filter((u) => {
          if (u.status === 'expired' || !/^\d{4}-\d{2}-\d{2}$/.test(u.deadline)) return false;
          const diff = Date.parse(`${u.deadline}T23:59:59Z`) - todayMs;
          return diff >= 0 && diff <= sevenDaysMs;
        });
      }

      if (search) {
        items = items.filter((u) =>
          `${u.titleEn} ${u.titleUr} ${u.summaryEn} ${u.summaryRomanUrdu} ${u.sourceNameEn} ${u.city}`
            .toLowerCase()
            .includes(search),
        );
      }

      res.json({
        items,
        lastSuccessfulSyncAt: db.syncEngineState.lastSuccessfulSyncAt,
        totalMonitoredSources: db.monitoredSources.filter((s) => s.enabled).length,
      });
    }),
  );

  app.get(
    '/api/notifications/match',
    asyncHandler(async (req, res) => {
      const db = await readDb();
      const province = (cleanStr(req.query.province, 40) || 'All') as Province;
      const rawCats = cleanStr(req.query.categories, 300);
      const categories = rawCats
        ? rawCats.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      const matches = db.nationalUpdates
        .filter((u) => u.status === 'auto_published' || u.status === 'approved')
        .filter(
          (u) =>
            province === 'All' ||
            u.province === province ||
            u.province === 'All' ||
            u.province === 'Federal',
        )
        .filter((u) => categories.length === 0 || categories.includes(u.category))
        .slice(0, 12);

      res.json({ alerts: matches });
    }),
  );

  app.post(
    '/api/notifications/subscribe',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const validProvinces: Province[] = [
        'All',
        'Sindh',
        'Federal',
        'Punjab',
        'Khyber Pakhtunkhwa',
        'Balochistan',
      ];
      const rawProvince = cleanStr(body.province, 40) as Province;
      const province: Province = validProvinces.includes(rawProvince) ? rawProvince : 'Sindh';

      const validCategories: UpdateCategory[] = [
        'gov_jobs',
        'scholarships',
        'free_courses',
        'gov_schemes',
        'nadra_updates',
        'police_recruitment',
        'armed_forces',
        'university_admissions',
        'public_announcements',
        'citizen_services',
      ];
      const categories = cleanStrArray(body.categories, 10, 40).filter(
        (c): c is UpdateCategory => validCategories.includes(c as UpdateCategory),
      );

      const validTopics: NotificationTopic[] = [
        'gov_jobs',
        'scholarships',
        'free_courses',
        'citizen_services',
      ];
      const topics = cleanStrArray(body.topics, 4, 40).filter((t): t is NotificationTopic =>
        validTopics.includes(t as NotificationTopic),
      );

      const db = await readDb();
      const existingId = cleanStr(body.subscriptionId, 40);
      const now = new Date().toISOString();

      const existing = existingId
        ? db.notificationSubscriptions.find((s) => s.id === existingId)
        : undefined;

      const savedId = existing
        ? existing.id
        : `sub-notif-${crypto.randomBytes(4).toString('hex')}`;

      await upsertNotificationSubscription({
        id: savedId,
        province,
        categories,
        topics,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      });

      const matchedAlerts = db.nationalUpdates
        .filter((u) => u.status === 'auto_published' || u.status === 'approved')
        .filter(
          (u) =>
            province === 'All' ||
            u.province === province ||
            u.province === 'All' ||
            u.province === 'Federal',
        )
        .filter((u) => categories.length === 0 || categories.includes(u.category))
        .slice(0, 12);

      res.status(201).json({
        subscriptionId: savedId,
        province,
        categories,
        topics,
        alerts: matchedAlerts,
      });
    }),
  );

  // Vercel Cron / Scheduled Sync endpoint
  const cronSyncHandler = asyncHandler(async (req, res) => {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const authorizedByCron = Boolean(cronSecret && bearer && timingSafeMatch(bearer, cronSecret));
    const authorizedByAdmin = verifyAdminToken(bearer);

    if (!authorizedByCron && !authorizedByAdmin) {
      res.status(401).json({ error: 'Unauthorized cron execution.' });
      return;
    }

    const db = await readDb();
    if (!db.syncEngineState.schedulerEnabled && !authorizedByAdmin) {
      res.json({ ok: true, skipped: true, summary: 'Scheduler is currently disabled.' });
      return;
    }

    const result = await runSyncCycle('scheduler');
    res.json({ ok: result.ok, summary: result.summary, state: result.state });
  });

  app.get('/api/cron/sync', cronSyncHandler);
  app.post('/api/cron/sync', cronSyncHandler);

  // --- Admin Auth & Management APIs ---

  app.get(
    '/api/admin/status',
    asyncHandler(async (req, res) => {
      const cred = await getAdminCredential();
      const envPasscodeSet = Boolean(
        process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0,
      );
      const claimed = Boolean(cred);
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

      res.json({
        needsSetup: !envPasscodeSet && !claimed,
        usesEnvPasscode: envPasscodeSet,
        authenticated: verifyAdminToken(token),
      });
    }),
  );

  app.post(
    '/api/admin/setup',
    asyncHandler(async (req, res) => {
      const envPasscode = process.env.ADMIN_PASSCODE?.trim();
      if (envPasscode) {
        res.status(403).json({ error: 'Admin passcode is managed by environment configuration.' });
        return;
      }
      const existing = await getAdminCredential();
      if (existing) {
        res.status(409).json({ error: 'Admin password has already been claimed.' });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      const { salt, hash } = hashPassword(password);
      const claimed = await claimAdminCredential({
        salt,
        hash,
        createdAt: new Date().toISOString(),
      });
      if (!claimed) {
        res.status(409).json({ error: 'Admin password has already been claimed.' });
        return;
      }

      res.status(201).json({ token: signAdminToken() });
    }),
  );

  app.post(
    '/api/admin/login',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const password = typeof body.password === 'string' ? body.password : '';
      if (!password) {
        res.status(400).json({ error: 'Password is required.' });
        return;
      }

      const envPasscode = process.env.ADMIN_PASSCODE?.trim();
      if (envPasscode) {
        if (!timingSafeMatch(password, envPasscode)) {
          res.status(401).json({ error: 'Invalid admin passcode.' });
          return;
        }
        res.json({ token: signAdminToken() });
        return;
      }

      const cred = await getAdminCredential();
      if (!cred) {
        res
          .status(400)
          .json({ error: 'Admin password is not configured yet. Complete initial setup first.' });
        return;
      }

      if (!verifyPassword(password, cred.salt, cred.hash)) {
        res.status(401).json({ error: 'Invalid admin password.' });
        return;
      }

      res.json({ token: signAdminToken() });
    }),
  );

  // Protected Admin overview & full datasets (includes pending/rejected listings and full problem reports)
  app.get(
    '/api/admin/overview',
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const db = await readDb();
      res.json({
        opportunities: db.opportunities,
        guides: db.guides,
        problems: db.problems,
        contactMessages: db.contactMessages,
      });
    }),
  );

  // Admin create opportunity
  app.post(
    '/api/admin/opportunities',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const category = cleanStr(body.category, 30) as OpportunityCategory;
      const validCategories: OpportunityCategory[] = ['scholarship', 'job', 'internship', 'course'];
      if (!validCategories.includes(category)) {
        res.status(400).json({ error: 'Invalid category.' });
        return;
      }
      const titleEn = cleanStr(body.titleEn, 180);
      const organizationEn = cleanStr(body.organizationEn, 160);
      const officialUrl = cleanStr(body.officialUrl, 300);
      if (!titleEn || !organizationEn || !isValidHttpUrl(officialUrl)) {
        res
          .status(400)
          .json({ error: 'Title, organization, and valid http/https official URL are required.' });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const item: Opportunity = {
        id: `${category.slice(0, 3)}-${crypto.randomBytes(4).toString('hex')}`,
        category,
        titleEn,
        titleUr: cleanStr(body.titleUr, 180) || titleEn,
        organizationEn,
        organizationUr: cleanStr(body.organizationUr, 160) || organizationEn,
        province: (cleanStr(body.province, 40) || 'Sindh') as Exclude<Province, 'All'>,
        cityOrScopeEn: cleanStr(body.cityOrScopeEn, 120) || 'Sindh',
        cityOrScopeUr: cleanStr(body.cityOrScopeUr, 120) || 'سندھ',
        educationLevel: cleanStr(body.educationLevel, 80) || 'Open',
        deadline: cleanStr(body.deadline, 40) || 'Rolling',
        stipendOrScopeEn: cleanStr(body.stipendOrScopeEn, 140) || 'See official notice',
        stipendOrScopeUr: cleanStr(body.stipendOrScopeUr, 140) || 'سرکاری نوٹس دیکھیں',
        eligibilityEn: cleanStrArray(body.eligibilityEn),
        eligibilityUr: cleanStrArray(body.eligibilityUr),
        requiredDocsEn: cleanStrArray(body.requiredDocsEn),
        requiredDocsUr: cleanStrArray(body.requiredDocsUr),
        descriptionEn: cleanStr(body.descriptionEn, 1000),
        descriptionUr: cleanStr(body.descriptionUr, 1000) || cleanStr(body.descriptionEn, 1000),
        officialUrl,
        verifiedSource: Boolean(body.verifiedSource),
        lastVerifiedDate: cleanStr(body.lastVerifiedDate, 20) || today,
        status: (cleanStr(body.status, 20) || 'active') as ListingStatus,
        isDemo: Boolean(body.isDemo),
        createdAt: new Date().toISOString(),
      };

      await insertOpportunity(item);
      res.status(201).json({ item });
    }),
  );

  // Admin update opportunity (edit, verify source, approve/reject, mark expired)
  app.patch(
    '/api/admin/opportunities/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const current = db.opportunities.find((o) => o.id === id);
      if (!current) {
        res.status(404).json({ error: 'Listing not found.' });
        return;
      }

      const nextUrl =
        body.officialUrl !== undefined ? cleanStr(body.officialUrl, 300) : current.officialUrl;
      if (!isValidHttpUrl(nextUrl)) {
        res.status(400).json({ error: 'Official URL must start with http:// or https://.' });
        return;
      }

      const updated: Opportunity = {
        ...current,
        category: (cleanStr(body.category, 30) || current.category) as OpportunityCategory,
        titleEn:
          body.titleEn !== undefined
            ? cleanStr(body.titleEn, 180) || current.titleEn
            : current.titleEn,
        titleUr:
          body.titleUr !== undefined
            ? cleanStr(body.titleUr, 180) || current.titleUr
            : current.titleUr,
        organizationEn:
          body.organizationEn !== undefined
            ? cleanStr(body.organizationEn, 160) || current.organizationEn
            : current.organizationEn,
        organizationUr:
          body.organizationUr !== undefined
            ? cleanStr(body.organizationUr, 160) || current.organizationUr
            : current.organizationUr,
        province: (body.province !== undefined
          ? cleanStr(body.province, 40) || current.province
          : current.province) as Exclude<Province, 'All'>,
        cityOrScopeEn:
          body.cityOrScopeEn !== undefined
            ? cleanStr(body.cityOrScopeEn, 120)
            : current.cityOrScopeEn,
        cityOrScopeUr:
          body.cityOrScopeUr !== undefined
            ? cleanStr(body.cityOrScopeUr, 120)
            : current.cityOrScopeUr,
        educationLevel:
          body.educationLevel !== undefined
            ? cleanStr(body.educationLevel, 80)
            : current.educationLevel,
        deadline: body.deadline !== undefined ? cleanStr(body.deadline, 40) : current.deadline,
        stipendOrScopeEn:
          body.stipendOrScopeEn !== undefined
            ? cleanStr(body.stipendOrScopeEn, 140)
            : current.stipendOrScopeEn,
        stipendOrScopeUr:
          body.stipendOrScopeUr !== undefined
            ? cleanStr(body.stipendOrScopeUr, 140)
            : current.stipendOrScopeUr,
        eligibilityEn:
          body.eligibilityEn !== undefined
            ? cleanStrArray(body.eligibilityEn)
            : current.eligibilityEn,
        eligibilityUr:
          body.eligibilityUr !== undefined
            ? cleanStrArray(body.eligibilityUr)
            : current.eligibilityUr,
        requiredDocsEn:
          body.requiredDocsEn !== undefined
            ? cleanStrArray(body.requiredDocsEn)
            : current.requiredDocsEn,
        requiredDocsUr:
          body.requiredDocsUr !== undefined
            ? cleanStrArray(body.requiredDocsUr)
            : current.requiredDocsUr,
        descriptionEn:
          body.descriptionEn !== undefined
            ? cleanStr(body.descriptionEn, 1000)
            : current.descriptionEn,
        descriptionUr:
          body.descriptionUr !== undefined
            ? cleanStr(body.descriptionUr, 1000)
            : current.descriptionUr,
        officialUrl: nextUrl,
        verifiedSource:
          typeof body.verifiedSource === 'boolean' ? body.verifiedSource : current.verifiedSource,
        lastVerifiedDate:
          body.lastVerifiedDate !== undefined
            ? cleanStr(body.lastVerifiedDate, 20)
            : typeof body.verifiedSource === 'boolean' && body.verifiedSource
              ? new Date().toISOString().slice(0, 10)
              : current.lastVerifiedDate,
        status: (body.status !== undefined
          ? cleanStr(body.status, 20)
          : current.status) as ListingStatus,
        isDemo: typeof body.isDemo === 'boolean' ? body.isDemo : current.isDemo,
      };

      await updateOpportunity(updated);
      res.json({ item: updated });
    }),
  );

  app.delete(
    '/api/admin/opportunities/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const deleted = await deleteOpportunityById(id);
      if (!deleted) {
        res.status(404).json({ error: 'Listing not found.' });
        return;
      }
      res.json({ ok: true });
    }),
  );

  // Admin document guide create/update/delete
  app.post(
    '/api/admin/guides',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const titleEn = cleanStr(body.titleEn, 160);
      const authorityEn = cleanStr(body.authorityEn, 140);
      const officialUrl = cleanStr(body.officialUrl, 300);
      if (!titleEn || !authorityEn || !isValidHttpUrl(officialUrl)) {
        res
          .status(400)
          .json({ error: 'Title, authority, and valid http/https URL are required.' });
        return;
      }

      const guide: DocumentGuide = {
        id: `guide-${crypto.randomBytes(4).toString('hex')}`,
        slug: titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
        titleEn,
        titleUr: cleanStr(body.titleUr, 160) || titleEn,
        authorityEn,
        authorityUr: cleanStr(body.authorityUr, 140) || authorityEn,
        province: (cleanStr(body.province, 40) || 'Federal') as Exclude<Province, 'All'>,
        summaryEn: cleanStr(body.summaryEn, 400),
        summaryUr: cleanStr(body.summaryUr, 400) || cleanStr(body.summaryEn, 400),
        requiredDocsEn: cleanStrArray(body.requiredDocsEn),
        requiredDocsUr: cleanStrArray(body.requiredDocsUr),
        stepsEn: cleanStrArray(body.stepsEn),
        stepsUr: cleanStrArray(body.stepsUr),
        feeNoteEn: cleanStr(body.feeNoteEn, 300) || 'Verify official fee on authority website.',
        feeNoteUr: cleanStr(body.feeNoteUr, 300) || 'سرکاری ویب سائٹ پر فیس چیک کریں۔',
        officialUrl,
        verifiedSource: Boolean(body.verifiedSource),
        lastVerifiedDate: new Date().toISOString().slice(0, 10),
        isDemo: Boolean(body.isDemo),
      };

      await insertGuide(guide);
      res.status(201).json({ item: guide });
    }),
  );

  app.patch(
    '/api/admin/guides/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const current = db.guides.find((g) => g.id === id);
      if (!current) {
        res.status(404).json({ error: 'Guide not found.' });
        return;
      }
      const updated: DocumentGuide = {
        ...current,
        verifiedSource:
          typeof body.verifiedSource === 'boolean' ? body.verifiedSource : current.verifiedSource,
        lastVerifiedDate:
          typeof body.verifiedSource === 'boolean' && body.verifiedSource
            ? new Date().toISOString().slice(0, 10)
            : current.lastVerifiedDate,
        titleEn:
          body.titleEn !== undefined
            ? cleanStr(body.titleEn, 160) || current.titleEn
            : current.titleEn,
        summaryEn:
          body.summaryEn !== undefined
            ? cleanStr(body.summaryEn, 400) || current.summaryEn
            : current.summaryEn,
      };
      await updateGuide(updated);
      res.json({ item: updated });
    }),
  );

  app.delete(
    '/api/admin/guides/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      await deleteGuideById(id);
      res.json({ ok: true });
    }),
  );

  // Admin problem report management
  app.patch(
    '/api/admin/problems/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const current = db.problems.find((p) => p.id === id);
      if (!current) {
        res.status(404).json({ error: 'Problem report not found.' });
        return;
      }

      const validStatuses: ProblemStatus[] = ['submitted', 'under_review', 'forwarded', 'resolved'];
      const nextStatus = cleanStr(body.status, 30) as ProblemStatus;
      if (body.status !== undefined && !validStatuses.includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid status.' });
        return;
      }

      const updated: ProblemReport = {
        ...current,
        status: body.status !== undefined ? nextStatus : current.status,
        adminNote:
          body.adminNote !== undefined ? cleanStr(body.adminNote, 400) : current.adminNote,
        updatedAt: new Date().toISOString(),
      };
      await updateProblem(updated);
      res.json({ item: updated });
    }),
  );

  app.delete(
    '/api/admin/problems/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      await deleteProblemById(id);
      res.json({ ok: true });
    }),
  );

  // --- Admin National Update Engine APIs ---

  app.get(
    '/api/admin/engine/overview',
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const db = await readDb();
      res.json({
        stats: computeEngineStats(db),
        sources: db.monitoredSources,
        updates: db.nationalUpdates,
        auditLogs: db.syncAuditLogs.slice(0, 60),
        subscriptionCount: db.notificationSubscriptions.length,
      });
    }),
  );

  app.post(
    '/api/admin/engine/sync',
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const result = await runSyncCycle('manual_sync');
      const db = await readDb();
      res.json({
        ok: result.ok,
        summary: result.summary,
        stats: computeEngineStats(db),
        sources: db.monitoredSources,
        updates: db.nationalUpdates,
        auditLogs: db.syncAuditLogs.slice(0, 60),
      });
    }),
  );

  app.patch(
    '/api/admin/engine/scheduler',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      if (typeof body.schedulerEnabled === 'boolean') {
        db.syncEngineState.schedulerEnabled = body.schedulerEnabled;
      }
      if (
        typeof body.intervalMinutes === 'number' &&
        body.intervalMinutes >= 5 &&
        body.intervalMinutes <= 1440
      ) {
        db.syncEngineState.intervalMinutes = Math.round(body.intervalMinutes);
      }
      const log = buildAuditLog({
        actor: 'admin',
        action: 'source_updated',
        detail: `Scheduler updated: enabled=${db.syncEngineState.schedulerEnabled}, interval=${db.syncEngineState.intervalMinutes}m.`,
      });
      await saveSyncEngineState(db.syncEngineState);
      await insertAuditLogEntry(log);
      res.json({ stats: computeEngineStats(db) });
    }),
  );

  app.post(
    '/api/admin/engine/sources',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const nameEn = cleanStr(body.nameEn, 160);
      const institutionCode = cleanStr(body.institutionCode, 30).toUpperCase() || 'GOV-PK';
      const url = cleanStr(body.url, 320);
      const sourceType = (cleanStr(body.sourceType, 20) || 'html') as SourceType;
      const categoryDefault = (cleanStr(body.categoryDefault, 40) ||
        'public_announcements') as UpdateCategory;
      const provinceDefault = (cleanStr(body.provinceDefault, 40) || 'Federal') as Province;

      if (!nameEn || !url) {
        res.status(400).json({ error: 'Source name and URL are required.' });
        return;
      }

      const validTypes: SourceType[] = ['rss', 'api', 'sitemap', 'html'];
      if (!validTypes.includes(sourceType)) {
        res.status(400).json({ error: 'Invalid source type.' });
        return;
      }

      // Strict SSRF validation
      const formatCheck = validateUrlFormat(url);
      if (!formatCheck.valid) {
        res.status(400).json({ error: formatCheck.reason || 'Unsafe or invalid source URL.' });
        return;
      }
      const safety = await validateSafePublicUrl(url);
      if (
        !safety.safe &&
        safety.reason &&
        /restricted|private|loopback|blocked|local/i.test(safety.reason)
      ) {
        res.status(400).json({ error: safety.reason });
        return;
      }

      const newSource: MonitoredSource = {
        id: `src-${crypto.randomBytes(4).toString('hex')}`,
        nameEn,
        nameUr: cleanStr(body.nameUr, 160) || nameEn,
        institutionCode,
        sourceType,
        url,
        categoryDefault,
        provinceDefault,
        trusted: typeof body.trusted === 'boolean' ? body.trusted : false,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
        checkIntervalMinutes:
          typeof body.checkIntervalMinutes === 'number' && body.checkIntervalMinutes >= 5
            ? Math.round(body.checkIntervalMinutes)
            : 60,
        lastCheckedAt: null,
        lastSuccessAt: null,
        lastStatus: 'never',
        lastError: null,
        itemsDetected: 0,
        isDemo: Boolean(body.isDemo),
      };

      await upsertMonitoredSource(newSource, true);
      await insertAuditLogEntry(
        buildAuditLog({
          actor: 'admin',
          action: 'source_added',
          targetId: newSource.id,
          detail: `Added monitored source "${newSource.nameEn}" (${newSource.sourceType}, trusted=${newSource.trusted}).`,
        }),
      );
      res.status(201).json({ source: newSource });
    }),
  );

  app.patch(
    '/api/admin/engine/sources/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const current = db.monitoredSources.find((s) => s.id === id);
      if (!current) {
        res.status(404).json({ error: 'Monitored source not found.' });
        return;
      }

      const nextUrl = body.url !== undefined ? cleanStr(body.url, 320) : current.url;
      if (body.url !== undefined) {
        const formatCheck = validateUrlFormat(nextUrl);
        if (!formatCheck.valid) {
          res.status(400).json({ error: formatCheck.reason || 'Invalid URL.' });
          return;
        }
        const safety = await validateSafePublicUrl(nextUrl);
        if (
          !safety.safe &&
          safety.reason &&
          /restricted|private|loopback|blocked|local/i.test(safety.reason)
        ) {
          res.status(400).json({ error: safety.reason });
          return;
        }
      }

      const updated: MonitoredSource = {
        ...current,
        nameEn:
          body.nameEn !== undefined ? cleanStr(body.nameEn, 160) || current.nameEn : current.nameEn,
        nameUr:
          body.nameUr !== undefined ? cleanStr(body.nameUr, 160) || current.nameUr : current.nameUr,
        institutionCode:
          body.institutionCode !== undefined
            ? cleanStr(body.institutionCode, 30).toUpperCase() || current.institutionCode
            : current.institutionCode,
        sourceType: (body.sourceType !== undefined
          ? cleanStr(body.sourceType, 20)
          : current.sourceType) as SourceType,
        url: nextUrl,
        categoryDefault: (body.categoryDefault !== undefined
          ? cleanStr(body.categoryDefault, 40)
          : current.categoryDefault) as UpdateCategory,
        provinceDefault: (body.provinceDefault !== undefined
          ? cleanStr(body.provinceDefault, 40)
          : current.provinceDefault) as Province,
        trusted: typeof body.trusted === 'boolean' ? body.trusted : current.trusted,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
        checkIntervalMinutes:
          typeof body.checkIntervalMinutes === 'number' && body.checkIntervalMinutes >= 5
            ? Math.round(body.checkIntervalMinutes)
            : current.checkIntervalMinutes,
      };

      await upsertMonitoredSource(updated, false);
      await insertAuditLogEntry(
        buildAuditLog({
          actor: 'admin',
          action: 'source_updated',
          targetId: updated.id,
          detail: `Updated source "${updated.nameEn}" (enabled=${updated.enabled}, trusted=${updated.trusted}).`,
        }),
      );
      res.json({ source: updated });
    }),
  );

  app.delete(
    '/api/admin/engine/sources/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const db = await readDb();
      const target = db.monitoredSources.find((s) => s.id === id);
      if (!target) {
        res.status(404).json({ error: 'Monitored source not found.' });
        return;
      }
      await deleteMonitoredSourceById(id);
      await insertAuditLogEntry(
        buildAuditLog({
          actor: 'admin',
          action: 'source_removed',
          targetId: id,
          detail: `Removed monitored source "${target.nameEn}".`,
        }),
      );
      res.json({ ok: true });
    }),
  );

  // Admin ingest & test endpoint: runs announcement or raw feed through rule-based extraction + dedupe + expiry + validation
  app.post(
    '/api/admin/engine/ingest',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const sourceId = cleanStr(body.sourceId, 80);
      const source =
        db.monitoredSources.find((s) => s.id === sourceId) || db.monitoredSources[0];

      if (!source) {
        res.status(400).json({ error: 'No monitored source available.' });
        return;
      }

      const rawFeedBody = typeof body.rawFeedBody === 'string' ? body.rawFeedBody.trim() : '';
      const isDemo = body.isDemo !== undefined ? Boolean(body.isDemo) : false;

      if (rawFeedBody) {
        const feedType = (cleanStr(body.sourceType, 20) || source.sourceType) as SourceType;
        const extracted = extractItemsFromBody(rawFeedBody, feedType, source.url);
        if (extracted.length === 0) {
          res.status(400).json({ error: 'No valid announcement entries detected in feed payload.' });
          return;
        }
        const results = [];
        const touchedUpdates = [];
        const logs = [];
        for (const rawItem of extracted.slice(0, 10)) {
          const resItem = await ingestRawItem(db, rawItem, source, 'ingest_pipeline', isDemo);
          results.push({
            outcome: resItem.outcome,
            update: resItem.update,
            reason: resItem.reason,
          });
          logs.push(...resItem.logs);
          if (resItem.update && (resItem.outcome === 'created' || resItem.outcome === 'deadline_updated')) {
            touchedUpdates.push(resItem.update);
          }
        }
        await persistSyncBatch({
          updates: touchedUpdates,
          logs,
          state: db.syncEngineState,
        });
        res.status(201).json({ results, stats: computeEngineStats(db) });
        return;
      }

      const title = cleanStr(body.title, 220);
      const url = cleanStr(body.url, 320) || source.url;
      const content = cleanStr(body.content, 2500);
      const publishedDate = cleanStr(body.publishedDate, 20);
      const explicitDeadline = cleanStr(body.explicitDeadline, 30);

      if (!title || !content) {
        res.status(400).json({ error: 'Announcement title and content are required.' });
        return;
      }

      const urlCheck = validateUrlFormat(url);
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.reason || 'Invalid announcement URL.' });
        return;
      }

      const result = await ingestRawItem(
        db,
        {
          title,
          url,
          content,
          publishedDate,
          explicitDeadline: explicitDeadline || undefined,
        },
        source,
        'ingest_pipeline',
        isDemo,
      );
      await persistSyncBatch({
        updates:
          result.update && (result.outcome === 'created' || result.outcome === 'deadline_updated')
            ? [result.update]
            : [],
        logs: result.logs,
        state: db.syncEngineState,
      });
      res.status(201).json({
        result: {
          outcome: result.outcome,
          update: result.update,
          reason: result.reason,
        },
        stats: computeEngineStats(db),
      });
    }),
  );

  app.patch(
    '/api/admin/engine/updates/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      const body = req.body as Record<string, unknown>;
      const db = await readDb();
      const current = db.nationalUpdates.find((u) => u.id === id);
      if (!current) {
        res.status(404).json({ error: 'National update not found.' });
        return;
      }

      const validStatuses: UpdateVerificationStatus[] = [
        'auto_published',
        'approved',
        'pending_verification',
        'rejected',
        'expired',
      ];
      const nextStatus = cleanStr(body.status, 30) as UpdateVerificationStatus;
      if (body.status !== undefined && !validStatuses.includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid verification status.' });
        return;
      }

      const updated = {
        ...current,
        titleEn:
          body.titleEn !== undefined ? cleanStr(body.titleEn, 200) || current.titleEn : current.titleEn,
        summaryEn:
          body.summaryEn !== undefined
            ? cleanStr(body.summaryEn, 700) || current.summaryEn
            : current.summaryEn,
        deadline:
          body.deadline !== undefined
            ? cleanStr(body.deadline, 40) || current.deadline
            : current.deadline,
        category: (body.category !== undefined
          ? cleanStr(body.category, 40)
          : current.category) as UpdateCategory,
        province: (body.province !== undefined
          ? cleanStr(body.province, 40)
          : current.province) as Province,
        status: body.status !== undefined ? nextStatus : current.status,
        lastVerifiedDate: new Date().toISOString().slice(0, 10),
      };

      await upsertNationalUpdate(updated);
      if (body.status === 'approved' || body.status === 'auto_published') {
        await insertAuditLogEntry(
          buildAuditLog({
            actor: 'admin',
            action: 'admin_approved',
            targetId: updated.id,
            detail: `Admin approved "${updated.titleEn}" for public display.`,
          }),
        );
      } else if (body.status === 'rejected') {
        await insertAuditLogEntry(
          buildAuditLog({
            actor: 'admin',
            action: 'admin_rejected',
            targetId: updated.id,
            detail: `Admin rejected "${updated.titleEn}".`,
          }),
        );
      } else if (body.status === 'expired') {
        await insertAuditLogEntry(
          buildAuditLog({
            actor: 'admin',
            action: 'marked_expired',
            targetId: updated.id,
            detail: `Admin marked "${updated.titleEn}" expired.`,
          }),
        );
      }

      res.json({ item: updated });
    }),
  );

  app.delete(
    '/api/admin/engine/updates/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = cleanStr(req.params.id, 80);
      await deleteNationalUpdateById(id);
      res.json({ ok: true });
    }),
  );

  // Global JSON error handler for API routes
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[RAASTA API Error]', err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  return app;
}
