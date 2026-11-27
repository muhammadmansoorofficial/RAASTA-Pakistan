import crypto from 'node:crypto';
import type {
  MonitoredSource,
  NationalUpdate,
  Province,
  UpdateCategory,
  UpdateVerificationStatus,
} from '../src/types.ts';
import type { RawDiscoveredItem } from './sourceFetcher.ts';
import { validateUrlFormat } from './sourceFetcher.ts';

const VALID_CATEGORIES: UpdateCategory[] = [
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

const CATEGORY_URDU_MAP: Record<UpdateCategory, string> = {
  gov_jobs: 'سرکاری ملازمت',
  scholarships: 'اسکالرشپ',
  free_courses: 'مفت کورس',
  gov_schemes: 'سرکاری اسکیم',
  nadra_updates: 'نادرا اپ ڈیٹ',
  police_recruitment: 'پولیس بھرتی',
  armed_forces: 'فوج / نیوی / ایئر فورس بھرتی',
  university_admissions: 'یونیورسٹی داخلہ',
  public_announcements: 'عوامی اعلان',
  citizen_services: 'شہری خدمت',
};

const SENSITIVE_MILITARY_REGEX =
  /\b(classified deployment|troop movement|brigade coordinates|nuclear command|ammunition depot|operational order|intelligence briefing)\b/i;

export function isDeadlineExpired(deadline: string, referenceDate = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  const todayIso = referenceDate.toISOString().slice(0, 10);
  return deadline < todayIso;
}

export function normalizeCanonicalKey(title: string, sourceUrl: string): string {
  const normUrl = sourceUrl.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');
  const normTitle = title
    .toLowerCase()
    .replace(/\(demo\)/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return crypto.createHash('sha256').update(`${normTitle}::${normUrl}`).digest('hex').slice(0, 24);
}

export function computeContentHash(title: string, content: string, deadline: string): string {
  const norm = `${title.trim().toLowerCase()}||${content.trim().toLowerCase().slice(0, 600)}||${deadline}`;
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 24);
}

function detectCategoryDeterministic(text: string, fallback: UpdateCategory): UpdateCategory {
  const lower = text.toLowerCase();
  if (/\b(nadra|pak-id|cnic|b-form|crc|family registration|frcs?)\b/.test(lower)) return 'nadra_updates';
  if (/\b(police|constable|asi|inspector|sindh police|punjab police|kp police)\b/.test(lower))
    return 'police_recruitment';
  if (/\b(pak army|pakistan army|pak navy|pakistan navy|pakistan air force|paf|pma|cadet|airmen|sailor|soldier)\b/.test(lower))
    return 'armed_forces';
  if (/\b(scholarship|stipend|financial aid|tuition grant|ehsaas undergraduate|seef|peef|hec scholarship)\b/.test(lower))
    return 'scholarships';
  if (/\b(admission|admissions|entry test|merit list|undergraduate intake|fall semester|spring semester|university)\b/.test(lower))
    return 'university_admissions';
  if (/\b(free course|vocational|navttc|digiskills|tevta|skill training|certification batch)\b/.test(lower))
    return 'free_courses';
  if (/\b(bisp|benazir|taleemi wazaif|kafalat|subsidy|ration|scheme|relief package|solar scheme)\b/.test(lower))
    return 'gov_schemes';
  if (/\b(fpsc|spsc|ppsc|kppsc|bpsc|njp|job|jobs|vacancies|bps-\d+|bs-\d+|recruitment)\b/.test(lower))
    return 'gov_jobs';
  if (/\b(domicile|prc|passport|driving license|vehicle tax|e-services|birth certificate|citizen service)\b/.test(lower))
    return 'citizen_services';
  return VALID_CATEGORIES.includes(fallback) ? fallback : 'public_announcements';
}

function detectProvinceAndCity(
  text: string,
  fallbackProvince: Province,
): { province: Province; city: string } {
  const lower = text.toLowerCase();
  const cities: string[] = [];
  const cityChecks: Array<[string, Province]> = [
    ['Karachi', 'Sindh'],
    ['Hyderabad', 'Sindh'],
    ['Sukkur', 'Sindh'],
    ['Larkana', 'Sindh'],
    ['Mirpurkhas', 'Sindh'],
    ['Jamshoro', 'Sindh'],
    ['Islamabad', 'Federal'],
    ['Rawalpindi', 'Punjab'],
    ['Lahore', 'Punjab'],
    ['Multan', 'Punjab'],
    ['Faisalabad', 'Punjab'],
    ['Peshawar', 'Khyber Pakhtunkhwa'],
    ['Quetta', 'Balochistan'],
  ];

  let inferredProvince: Province | null = null;
  for (const [cityName, prov] of cityChecks) {
    if (lower.includes(cityName.toLowerCase())) {
      cities.push(cityName);
      if (!inferredProvince) inferredProvince = prov;
    }
  }

  if (!inferredProvince) {
    if (/\bsindh\b|\bspsc\b|\bkarachi\b/.test(lower)) inferredProvince = 'Sindh';
    else if (/\bpunjab\b|\bppsc\b|\blahore\b/.test(lower)) inferredProvince = 'Punjab';
    else if (/\bkhyber pakhtunkhwa\b|\bkp\b|\bkppsc\b|\bpeshawar\b/.test(lower))
      inferredProvince = 'Khyber Pakhtunkhwa';
    else if (/\bbalochistan\b|\bbpsc\b|\bquetta\b/.test(lower)) inferredProvince = 'Balochistan';
    else if (/\bfederal\b|\bislamabad\b|\bfpsc\b|\bnadra\b/.test(lower)) inferredProvince = 'Federal';
    else if (/\bnationwide\b|\ball pakistan\b/.test(lower)) inferredProvince = 'All';
  }

  const province = inferredProvince ?? fallbackProvince ?? 'All';
  const city =
    cities.length > 0
      ? cities.join(', ')
      : province === 'All'
        ? 'All Pakistan'
        : province === 'Federal'
          ? 'Islamabad / Nationwide'
          : `${province} Districts`;

  return { province, city };
}

function extractDeadlineFromText(text: string, explicitDeadline?: string): string {
  if (explicitDeadline) {
    const trimmed = explicitDeadline.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^rolling$/i.test(trimmed)) return 'Rolling';
  }

  // Match ISO YYYY-MM-DD near deadline words or standalone
  const isoMatch = /(?:deadline|last date|closing date|apply before|due date)[:\s-]*(\d{4}-\d{2}-\d{2})/i.exec(
    text,
  );
  if (isoMatch?.[1]) return isoMatch[1];

  // Match DD Month YYYY or Month DD, YYYY
  const textDateMatch =
    /(?:deadline|last date|closing date|apply before|valid till|until)[:\s-]*([0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-3]?\d,?\s+\d{4})/i.exec(
      text,
    );
  if (textDateMatch?.[1]) {
    const parsed = new Date(textDateMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch =
    /(?:deadline|last date|closing date|apply before)[:\s-]*([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/i.exec(
      text,
    );
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  if (/\brolling\b|\bopen year[- ]?round\b|\bno fixed deadline\b/i.test(text)) {
    return 'Rolling';
  }

  return 'Not specified';
}

function extractFeeNote(text: string): { en: string; ur: string } {
  const pkrMatch = /(?:fee|challan|charges|cost)[^.\n]{0,60}?(?:rs\.?|pkr)\s*[\d,]+(?:\.\d+)?[^.\n]{0,40}/i.exec(
    text,
  );
  if (pkrMatch) {
    const snippet = pkrMatch[0].trim();
    return {
      en: snippet,
      ur: `اعلان میں درج فیس: ${snippet}`,
    };
  }
  if (/\b(free of cost|no application fee|100% free|tuition[- ]?free|no fee)\b/i.test(text)) {
    return {
      en: 'No fee stated (Free / Tuition-free in source notice).',
      ur: 'اعلان کے مطابق کوئی فیس نہیں (مفت)۔',
    };
  }
  return {
    en: 'Not stated in announcement.',
    ur: 'اعلان میں کوئی فیس بیان نہیں کی گئی۔',
  };
}

function extractEligibility(text: string): { en: string[]; ur: string[] } {
  const bullets: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bmatric(?:ulation)?\b/i, 'Matriculation qualification mentioned in official notice.'],
    [/\bintermediate|hssc|fa\/fsc\b/i, 'Intermediate (HSSC / FA / FSc) mentioned in notice.'],
    [/\bbachelor|bs\b|graduation/i, 'Bachelor degree / Graduation criteria mentioned.'],
    [/\bmaster|mphil|phd\b/i, 'Master / Postgraduate qualification mentioned.'],
    [/\bdomicile\b/i, 'Relevant provincial / district domicile required.'],
    [/\bcnic|b-form\b/i, 'Valid Pakistani CNIC or NADRA B-Form required.'],
    [/\bage limit[:\s]*[^\n.;]{3,40}/i, 'Specific age limit criteria apply per official ad.'],
  ];

  for (const [re, label] of patterns) {
    if (re.test(text)) bullets.push(label);
  }

  if (bullets.length === 0) {
    bullets.push('Check the linked official announcement for complete eligibility details.');
  }

  return {
    en: bullets.slice(0, 4),
    ur: ['مکمل اہلیت اور شرائط کے لیے منسلک سرکاری اعلان ملاحظہ کریں۔'],
  };
}

interface GroqParsedPayload {
  category?: UpdateCategory;
  province?: Province;
  city?: string;
  titleEn?: string;
  titleUr?: string;
  summaryEn?: string;
  summaryUr?: string;
  summaryRomanUrdu?: string;
  eligibilityEn?: string[];
  eligibilityUr?: string[];
  feeNoteEn?: string;
  feeNoteUr?: string;
  deadline?: string;
}

async function processWithGroq(
  item: RawDiscoveredItem,
  source: MonitoredSource,
): Promise<GroqParsedPayload | null> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  const systemPrompt = [
    'You are the RAASTA Pakistan Public Information Extractor.',
    'Extract structured facts ONLY from the provided official announcement text.',
    'STRICT RULES:',
    '1. NEVER invent fees, deadlines, vacancy counts, or rules not explicitly stated in the text.',
    '2. If deadline is missing, return "Not specified". If rolling/ongoing, return "Rolling". Otherwise return YYYY-MM-DD.',
    '3. If fee is not explicitly stated, set feeNoteEn to "Not stated in announcement." and feeNoteUr to "اعلان میں کوئی فیس بیان نہیں کی گئی۔".',
    `4. category MUST be one of: ${VALID_CATEGORIES.join(', ')}.`,
    '5. province MUST be one of: All, Sindh, Federal, Punjab, Khyber Pakhtunkhwa, Balochistan.',
    '6. Provide concise, plain-language summaryEn, natural Urdu summaryUr, and simple Roman Urdu summaryRomanUrdu.',
    '7. Output ONLY valid JSON matching the keys: category, province, city, titleEn, titleUr, summaryEn, summaryUr, summaryRomanUrdu, eligibilityEn, eligibilityUr, feeNoteEn, feeNoteUr, deadline.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    sourceName: source.nameEn,
    defaultCategory: source.categoryDefault,
    defaultProvince: source.provinceDefault,
    title: item.title,
    url: item.url,
    publishedDate: item.publishedDate,
    explicitDeadline: item.explicitDeadline || null,
    content: item.content.slice(0, 3000),
  });

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawJson = data.choices?.[0]?.message?.content;
    if (!rawJson) return null;
    return JSON.parse(rawJson) as GroqParsedPayload;
  } catch {
    return null;
  }
}

export async function processDiscoveredAnnouncement(
  item: RawDiscoveredItem,
  source: MonitoredSource,
  isDemo = false,
): Promise<{
  candidate: Omit<NationalUpdate, 'id'>;
  blockedReason?: string;
}> {
  const combinedText = `${item.title}\n${item.content}`;
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  if (SENSITIVE_MILITARY_REGEX.test(combinedText)) {
    return {
      candidate: {} as Omit<NationalUpdate, 'id'>,
      blockedReason: 'Blocked sensitive operational content per RAASTA national safety policy.',
    };
  }

  const groqResult = await processWithGroq(item, source);
  const processingMode: NationalUpdate['processingMode'] = groqResult
    ? 'groq_ai'
    : 'deterministic_fallback';

  const fallbackCategory = detectCategoryDeterministic(combinedText, source.categoryDefault);
  const category =
    groqResult?.category && VALID_CATEGORIES.includes(groqResult.category)
      ? groqResult.category
      : fallbackCategory;

  const { province: detProvince, city: detCity } = detectProvinceAndCity(
    combinedText,
    source.provinceDefault,
  );
  const validProvinces: Province[] = [
    'All',
    'Sindh',
    'Federal',
    'Punjab',
    'Khyber Pakhtunkhwa',
    'Balochistan',
  ];
  const province =
    groqResult?.province && validProvinces.includes(groqResult.province)
      ? groqResult.province
      : detProvince;
  const city = groqResult?.city?.trim() || detCity;

  const detDeadline = extractDeadlineFromText(combinedText, item.explicitDeadline);
  const deadline =
    groqResult?.deadline &&
    (/^\d{4}-\d{2}-\d{2}$/.test(groqResult.deadline.trim()) ||
      groqResult.deadline === 'Rolling' ||
      groqResult.deadline === 'Not specified')
      ? groqResult.deadline.trim()
      : detDeadline;

  const detFee = extractFeeNote(combinedText);
  const feeNoteEn = groqResult?.feeNoteEn?.trim() || detFee.en;
  const feeNoteUr = groqResult?.feeNoteUr?.trim() || detFee.ur;

  const detEligibility = extractEligibility(combinedText);
  const eligibilityEn =
    Array.isArray(groqResult?.eligibilityEn) && groqResult.eligibilityEn.length > 0
      ? groqResult.eligibilityEn.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
      : detEligibility.en;
  const eligibilityUr =
    Array.isArray(groqResult?.eligibilityUr) && groqResult.eligibilityUr.length > 0
      ? groqResult.eligibilityUr.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
      : detEligibility.ur;

  const titleEn = (groqResult?.titleEn?.trim() || item.title).slice(0, 200);
  const titleUr = (groqResult?.titleUr?.trim() || `${CATEGORY_URDU_MAP[category]}: ${titleEn}`).slice(
    0,
    220,
  );

  const summaryEn = (
    groqResult?.summaryEn?.trim() ||
    (item.content.length > 20 ? item.content : `Official announcement from ${source.nameEn}: ${titleEn}. Verify complete notice on source portal.`)
  ).slice(0, 700);

  const summaryUr = (
    groqResult?.summaryUr?.trim() ||
    `${source.nameUr} کی جانب سے ${CATEGORY_URDU_MAP[category]} سے متعلق نیا اعلان۔ مکمل تفصیلات کے لیے سرکاری لنک ملاحظہ کریں۔`
  ).slice(0, 700);

  const summaryRomanUrdu = (
    groqResult?.summaryRomanUrdu?.trim() ||
    `${source.nameEn} ki taraf se ${titleEn} ka elaan jari hua hai. Mukammal tafseelat aur aakhri tareekh ke liye sarkari website check karein.`
  ).slice(0, 700);

  const urlCheck = validateUrlFormat(item.url);
  const validationWarnings: string[] = [];

  if (!urlCheck.valid) {
    validationWarnings.push(urlCheck.reason || 'Source URL failed format validation.');
  }
  if (!source.trusted) {
    validationWarnings.push('Source is marked untrusted/unverified and requires manual review.');
  }
  if (titleEn.length < 10) {
    validationWarnings.push('Extracted title is too short.');
  }
  if (summaryEn.length < 20) {
    validationWarnings.push('Extracted summary lacks sufficient detail.');
  }
  if (
    deadline === 'Not specified' &&
    item.content.trim().length <= item.title.trim().length + 5 &&
    !/\b(2026|2027|open|announced|admissions|recruitment|career|scholarship)\b/i.test(titleEn)
  ) {
    validationWarnings.push('Uncertain bare link without announcement body or deadline; queued for review.');
  }
  if (deadline === 'Not specified' && (category === 'gov_jobs' || category === 'scholarships')) {
    validationWarnings.push('Deadline not explicitly stated; verify before publishing.');
  }

  let status: UpdateVerificationStatus = 'auto_published';
  if (isDeadlineExpired(deadline)) {
    status = 'expired';
  } else if (validationWarnings.length > 0) {
    status = 'pending_verification';
  }

  const canonicalKey = normalizeCanonicalKey(titleEn, item.url);
  const contentHash = computeContentHash(titleEn, summaryEn, deadline);

  return {
    candidate: {
      sourceId: source.id,
      sourceNameEn: source.nameEn,
      sourceNameUr: source.nameUr,
      sourceUrl: urlCheck.valid ? item.url : source.url,
      canonicalKey,
      contentHash,
      category,
      province,
      city,
      titleEn,
      titleUr,
      summaryEn,
      summaryUr,
      summaryRomanUrdu,
      eligibilityEn,
      eligibilityUr,
      feeNoteEn,
      feeNoteUr,
      deadline,
      originalPublishedDate: item.publishedDate || today,
      discoveredAt: nowIso,
      lastVerifiedDate: today,
      status,
      processingMode,
      validationWarnings,
      trustedSource: source.trusted,
      isDemo,
    },
  };
}
