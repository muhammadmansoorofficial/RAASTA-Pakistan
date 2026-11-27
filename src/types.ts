export type Language = 'en' | 'ur';
export type ThemeMode = 'light' | 'dark';

export type PageId =
  | 'home'
  | 'updates'
  | 'scholarships'
  | 'jobs'
  | 'internships'
  | 'courses'
  | 'guides'
  | 'calculators'
  | 'report'
  | 'about'
  | 'admin';

export type Province =
  | 'All'
  | 'Sindh'
  | 'Federal'
  | 'Punjab'
  | 'Khyber Pakhtunkhwa'
  | 'Balochistan';

export type OpportunityCategory = 'scholarship' | 'job' | 'internship' | 'course';

export type ListingStatus = 'active' | 'pending' | 'expired' | 'rejected';

export interface Opportunity {
  id: string;
  category: OpportunityCategory;
  titleEn: string;
  titleUr: string;
  organizationEn: string;
  organizationUr: string;
  province: Exclude<Province, 'All'>;
  cityOrScopeEn: string;
  cityOrScopeUr: string;
  educationLevel: string;
  deadline: string; // ISO date YYYY-MM-DD or 'Rolling'
  stipendOrScopeEn: string;
  stipendOrScopeUr: string;
  eligibilityEn: string[];
  eligibilityUr: string[];
  requiredDocsEn: string[];
  requiredDocsUr: string[];
  descriptionEn: string;
  descriptionUr: string;
  officialUrl: string;
  verifiedSource: boolean;
  lastVerifiedDate: string; // YYYY-MM-DD
  status: ListingStatus;
  isDemo: boolean;
  submittedBy?: string;
  createdAt: string;
}

export interface DocumentGuide {
  id: string;
  slug: string;
  titleEn: string;
  titleUr: string;
  authorityEn: string;
  authorityUr: string;
  province: Exclude<Province, 'All'>;
  summaryEn: string;
  summaryUr: string;
  requiredDocsEn: string[];
  requiredDocsUr: string[];
  stepsEn: string[];
  stepsUr: string[];
  feeNoteEn: string;
  feeNoteUr: string;
  officialUrl: string;
  verifiedSource: boolean;
  lastVerifiedDate: string;
  isDemo: boolean;
}

export type ProblemCategory =
  | 'Water & Sewerage'
  | 'Electricity & Gas'
  | 'Road & Streetlights'
  | 'Garbage & Sanitation'
  | 'Education & School'
  | 'Health & Hospital'
  | 'Government Office Service';

export type ProblemStatus = 'submitted' | 'under_review' | 'forwarded' | 'resolved';

export interface ProblemReport {
  id: string;
  referenceCode: string;
  category: ProblemCategory;
  province: Exclude<Province, 'All'>;
  district: string;
  area: string;
  title: string;
  description: string;
  reporterName?: string;
  reporterContact?: string; // PII: stripped in public endpoints, visible only to authenticated Admin
  status: ProblemStatus;
  adminNote?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProblemSummary {
  id: string;
  referenceCode: string;
  category: ProblemCategory;
  province: Exclude<Province, 'All'>;
  district: string;
  area: string;
  title: string;
  description: string;
  status: ProblemStatus;
  adminNote?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  contact: string;
  topic: string;
  message: string;
  createdAt: string;
}

// --- RAASTA NATIONAL UPDATE ENGINE TYPES ---

export type UpdateCategory =
  | 'gov_jobs'
  | 'scholarships'
  | 'free_courses'
  | 'gov_schemes'
  | 'nadra_updates'
  | 'police_recruitment'
  | 'armed_forces'
  | 'university_admissions'
  | 'public_announcements'
  | 'citizen_services';

export type SourceType = 'rss' | 'api' | 'sitemap' | 'html';

export type SourceHealthStatus = 'ok' | 'error' | 'skipped' | 'never';

export interface MonitoredSource {
  id: string;
  nameEn: string;
  nameUr: string;
  institutionCode: string;
  sourceType: SourceType;
  url: string;
  categoryDefault: UpdateCategory;
  provinceDefault: Province;
  trusted: boolean;
  enabled: boolean;
  checkIntervalMinutes: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: SourceHealthStatus;
  lastError: string | null;
  itemsDetected: number;
  isDemo: boolean;
}

export type UpdateVerificationStatus =
  | 'auto_published'
  | 'approved'
  | 'pending_verification'
  | 'rejected'
  | 'expired';

export interface NationalUpdate {
  id: string;
  sourceId: string;
  sourceNameEn: string;
  sourceNameUr: string;
  sourceUrl: string;
  canonicalKey: string;
  contentHash: string;
  category: UpdateCategory;
  province: Province;
  city: string;
  titleEn: string;
  titleUr: string;
  summaryEn: string;
  summaryUr: string;
  summaryRomanUrdu: string;
  eligibilityEn: string[];
  eligibilityUr: string[];
  feeNoteEn: string; // Explicit fee only when stated in source, otherwise "Not stated in announcement"
  feeNoteUr: string;
  deadline: string; // YYYY-MM-DD | 'Rolling' | 'Not specified'
  previousDeadline?: string;
  deadlineChangedAt?: string;
  originalPublishedDate: string; // YYYY-MM-DD
  discoveredAt: string; // ISO timestamp
  lastVerifiedDate: string; // YYYY-MM-DD
  status: UpdateVerificationStatus;
  processingMode: 'groq_ai' | 'deterministic_fallback';
  validationWarnings: string[];
  trustedSource: boolean;
  isDemo: boolean;
}

export type NotificationTopic =
  | 'gov_jobs'
  | 'scholarships'
  | 'free_courses'
  | 'citizen_services';

export interface NotificationSubscription {
  id: string;
  province: Province;
  categories: UpdateCategory[];
  topics: NotificationTopic[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'scheduler' | 'manual_sync' | 'admin' | 'ingest_pipeline';
  action:
    | 'sync_completed'
    | 'source_error'
    | 'source_skipped'
    | 'auto_published'
    | 'queued_for_review'
    | 'duplicate_skipped'
    | 'deadline_updated'
    | 'marked_expired'
    | 'admin_approved'
    | 'admin_rejected'
    | 'source_added'
    | 'source_updated'
    | 'source_removed';
  targetId?: string;
  detail: string;
}

export interface SyncEngineState {
  schedulerEnabled: boolean;
  intervalMinutes: number;
  isSyncing: boolean;
  lastSyncStartedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastScheduledSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  totalSyncRuns: number;
  newAnnouncementsDetected: number;
  autoPublishedCount: number;
  duplicatesSkippedCount: number;
  lastRunSummary: string | null;
}

export interface SyncEngineStats {
  totalSources: number;
  workingSources: number;
  errorSources: number;
  newAnnouncementsDetected: number;
  autoPublishedPosts: number;
  pendingVerification: number;
  expiredAnnouncements: number;
  duplicateAnnouncements: number;
  lastSuccessfulSyncAt: string | null;
  lastScheduledSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  schedulerEnabled: boolean;
  intervalMinutes: number;
  isSyncing: boolean;
  totalSyncRuns: number;
  lastRunSummary: string | null;
}
