import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AuditLogEntry,
  ContactMessage,
  DocumentGuide,
  MonitoredSource,
  NationalUpdate,
  NotificationSubscription,
  Opportunity,
  ProblemReport,
  PublicProblemSummary,
  SyncEngineState,
} from '../src/types.ts';
import {
  ENGINE_SEED_AUDIT_LOGS,
  ENGINE_SEED_SOURCES,
  ENGINE_SEED_STATE,
  ENGINE_SEED_UPDATES,
} from './engineSeed.ts';

interface AdminCredential {
  salt: string;
  hash: string;
  createdAt: string;
}

export interface DatabaseSchema {
  opportunities: Opportunity[];
  guides: DocumentGuide[];
  problems: ProblemReport[];
  contactMessages: ContactMessage[];
  adminCredential: AdminCredential | null;
  monitoredSources: MonitoredSource[];
  nationalUpdates: NationalUpdate[];
  notificationSubscriptions: NotificationSubscription[];
  syncAuditLogs: AuditLogEntry[];
  syncEngineState: SyncEngineState;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'raasta-db.json');

const SEED_DATA: DatabaseSchema = {
  adminCredential: null,
  monitoredSources: ENGINE_SEED_SOURCES,
  nationalUpdates: ENGINE_SEED_UPDATES,
  notificationSubscriptions: [],
  syncAuditLogs: ENGINE_SEED_AUDIT_LOGS,
  syncEngineState: ENGINE_SEED_STATE,
  opportunities: [
    {
      id: 'sch-sindh-01',
      category: 'scholarship',
      titleEn: 'Sindh Higher Education Merit & Need Scholarship (DEMO)',
      titleUr: 'سندھ ہائر ایجوکیشن میرٹ اور ضرورت مند اسکالرشپ (ڈیمو)',
      organizationEn: 'Sindh HEC / College Education Department (Demo Record)',
      organizationUr: 'سندھ ہائر ایجوکیشن کمیشن / محکمہ کالج ایجوکیشن (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'All Districts of Sindh',
      cityOrScopeUr: 'سندھ کے تمام اضلاع',
      educationLevel: 'Undergraduate',
      deadline: '2026-12-30',
      stipendOrScopeEn: 'Tuition support + monthly stipend (Check official portal)',
      stipendOrScopeUr: 'فیس میں مدد اور ماہانہ وظیفہ (سرکاری پورٹل دیکھیں)',
      eligibilityEn: [
        'Permanent resident and domicile holder of Sindh province.',
        'Enrolled in an accredited public sector university or degree college.',
        'Family monthly income verified via official declaration.',
      ],
      eligibilityUr: [
        'صوبہ سندھ کا مستقل رہائشی اور ڈومیسائل ہونا ضروری ہے۔',
        'کسی منظور شدہ سرکاری یونیورسٹی یا ڈگری کالج میں داخلہ ضروری ہے۔',
        'خاندان کی ماہانہ آمدنی کا سرکاری تصدیق نامہ لازمی ہے۔',
      ],
      requiredDocsEn: [
        'CNIC or NADRA B-Form copy',
        'Sindh Domicile & PRC',
        'Latest Academic Transcript / Marksheet',
        'University Fee Challan / Enrollment Letter',
        'Guardian Income Certificate',
      ],
      requiredDocsUr: [
        'قومی شناختی کارڈ یا نادرا ب فارم کی کاپی',
        'سندھ ڈومیسائل اور پی آر سی',
        'تازہ ترین تعلیمی رزلٹ کارڈ / مارک شیٹ',
        'یونیورسٹی فیس چالان یا داخلہ سرٹیفکیٹ',
        'سرپرست کا آمدنی سرٹیفکیٹ',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD: Illustrates financial aid pathways for undergraduate students across Karachi, Hyderabad, Sukkur, Larkana, and Mirpurkhas. Always verify active dates and fee coverage on the official Sindh government portal.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: کراچی، حیدرآباد، سکھر، لاڑکانہ اور میرپورخاص کے طلبہ کے لیے تعلیمی وظائف کی رہنمائی۔ براہ کرم حتمی تاریخوں کے لیے سرکاری ویب سائٹ ضرور چیک کریں۔',
      officialUrl: 'https://sindhhec.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-20',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-01T09:00:00.000Z',
    },
    {
      id: 'sch-fed-02',
      category: 'scholarship',
      titleEn: 'HEC Need-Based & Undergraduate Scholarship Portal (DEMO)',
      titleUr: 'ایچ ای سی ضرورت مند اور انڈرگریجویٹ اسکالرشپ پورٹل (ڈیمو)',
      organizationEn: 'Higher Education Commission Pakistan (Demo Record)',
      organizationUr: 'ہائر ایجوکیشن کمیشن پاکستان (ڈیمو)',
      province: 'Federal',
      cityOrScopeEn: 'Nationwide Public Universities',
      cityOrScopeUr: 'پاکستان بھر کی سرکاری جامعات',
      educationLevel: 'Undergraduate',
      deadline: '2027-01-15',
      stipendOrScopeEn: 'Tuition + Living Allowance (Verify at HEC)',
      stipendOrScopeUr: 'ٹیوشن فیس اور رہائشی وظیفہ (ایچ ای سی پورٹل دیکھیں)',
      eligibilityEn: [
        'Pakistani / AJK national admitted on merit to a participating HEC university.',
        'Financial need assessed by university Financial Aid Office.',
      ],
      eligibilityUr: [
        'پاکستانی شہری جو کسی منظور شدہ سرکاری جامعہ میں میرٹ پر داخل ہو۔',
        'مالی ضرورت کی جانچ متعلقہ یونیورسٹی کے فنانشل ایڈ دفتر سے ہوگی۔',
      ],
      requiredDocsEn: [
        'HEC Online Application Form',
        'CNIC / B-Form & Father/Guardian CNIC',
        'Utility Bills (last 3 months)',
        'Salary Slip or Income Affidavit',
      ],
      requiredDocsUr: [
        'ایچ ای سی آن لائن درخواست فارم',
        'شناختی کارڈ / ب فارم اور والد/سرپرست کا شناختی کارڈ',
        'گزشتہ 3 ماہ کے بجلی/گیس کے بل',
        'تنخواہ کی سلپ یا آمدنی کا حلف نامہ',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD: Official gateway reference for Pakistani students seeking university financial aid through HEC and institutional financial aid offices.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: سرکاری جامعات میں مالی امداد حاصل کرنے کے لیے ایچ ای سی کے سرکاری پورٹل کی رہنمائی۔',
      officialUrl: 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-18',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-02T10:00:00.000Z',
    },
    {
      id: 'sch-sindh-03',
      category: 'scholarship',
      titleEn: 'SEEF Sindh Education Endowment Trust (DEMO)',
      titleUr: 'سندھ ایجوکیشن انڈومنٹ فنڈ اسکالرشپ (ڈیمو)',
      organizationEn: 'Sindh Education Endowment Fund (Demo Record)',
      organizationUr: 'سندھ ایجوکیشن انڈومنٹ فنڈ (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'Sindh (Engineering, Medical, IT, Business)',
      cityOrScopeUr: 'سندھ (انجینئرنگ، میڈیکل، آئی ٹی، بزنس)',
      educationLevel: 'Matric/Inter',
      deadline: '2026-12-22',
      stipendOrScopeEn: 'Annual fee reimbursement (Check SEEF portal)',
      stipendOrScopeUr: 'سالانہ فیس کی واپسی (سرکاری پورٹل چیک کریں)',
      eligibilityEn: [
        'Sindh Domicile mandatory.',
        'Minimum 60% marks in previous board examination.',
        'Household income below official SEEF threshold.',
      ],
      eligibilityUr: [
        'سندھ کا ڈومیسائل لازمی ہے۔',
        'گزشتہ بورڈ امتحان میں کم از کم 60 فیصد نمبر۔',
        'گھریلو آمدنی SEEF کی مقررہ حد سے کم ہونی چاہیے۔',
      ],
      requiredDocsEn: [
        'Sindh Domicile & PRC',
        'Matric / Intermediate Marksheet',
        'Institute Bonafide Certificate',
        'Bank Account IBAN of Student/Guardian',
      ],
      requiredDocsUr: [
        'سندھ ڈومیسائل اور پی آر سی',
        'میٹرک / انٹرمیڈیٹ کی مارک شیٹ',
        'تعلیمی ادارے کا بونافائیڈ سرٹیفکیٹ',
        'طالب علم یا سرپرست کا بینک اکاؤنٹ IBAN',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD: Sample structure for SEEF scholarships supporting deserving students across Sindh.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: سندھ کے مستحق طلبہ کے لیے تعلیمی وظائف کا نمونہ ریکارڈ۔',
      officialUrl: 'https://seef.sindh.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-15',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-03T11:00:00.000Z',
    },
    {
      id: 'job-sindh-01',
      category: 'job',
      titleEn: 'Sindh Public Service Commission — General Recruitment Portal (DEMO)',
      titleUr: 'سندھ پبلک سروس کمیشن — سرکاری ملازمتوں کا پورٹل (ڈیمو)',
      organizationEn: 'Sindh Public Service Commission (SPSC) (Demo Record)',
      organizationUr: 'سندھ پبلک سروس کمیشن (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'Sindh Government Departments (BPS-16 to BPS-18)',
      cityOrScopeUr: 'حکومت سندھ کے محکمے (BPS-16 تا BPS-18)',
      educationLevel: 'Graduate',
      deadline: '2026-12-28',
      stipendOrScopeEn: 'BPS-16 / BPS-17 Govt Pay Scale (Verify official adv)',
      stipendOrScopeUr: 'سرکاری پے اسکیل BPS-16 / BPS-17 (اشتہار دیکھیں)',
      eligibilityEn: [
        'Sindh Domicile (Urban or Rural quota as per official SPSC advertisement).',
        'Bachelor or Master degree from HEC-recognized university.',
        'Age limit as specified in official SPSC circular.',
      ],
      eligibilityUr: [
        'سندھ ڈومیسائل (شہری یا دیہی کوٹہ سرکاری اشتہار کے مطابق)۔',
        'ایچ ای سی سے منظور شدہ یونیورسٹی سے گریجویشن یا ماسٹرز ڈگری۔',
        'عمر کی حد سرکاری اشتہار کے مطابق۔',
      ],
      requiredDocsEn: [
        'Online SPSC Profile Registration',
        'Original Challan Deposit Receipt (National Bank / State Bank)',
        'CNIC, Domicile, PRC (Form-D)',
        'Attested Educational Degrees & Transcripts',
      ],
      requiredDocsUr: [
        'SPSC آن لائن پروفائل رجسٹریشن',
        'چالان فیس کی اصل رسید',
        'شناختی کارڈ، ڈومیسائل، پی آر سی',
        'تصدیق شدہ تعلیمی اسناد',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD: Always read the official SPSC advertisement PDF on spsc.gos.pk before depositing any challan fee.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: چالان جمع کرانے سے پہلے ہمیشہ spsc.gos.pk پر اصل سرکاری اشتہار ضرور پڑھیں۔',
      officialUrl: 'https://spsc.gos.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-22',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-04T09:30:00.000Z',
    },
    {
      id: 'job-fed-02',
      category: 'job',
      titleEn: 'Federal Public Service Commission — Consolidated Advertisements (DEMO)',
      titleUr: 'فیڈرل پبلک سروس کمیشن — وفاقی سرکاری ملازمتیں (ڈیمو)',
      organizationEn: 'Federal Public Service Commission (FPSC) (Demo Record)',
      organizationUr: 'فیڈرل پبلک سروس کمیشن (ڈیمو)',
      province: 'Federal',
      cityOrScopeEn: 'All Pakistan (Sindh, Punjab, KP, Balochistan, ICT)',
      cityOrScopeUr: 'پاکستان بھر میں (سندھ، پنجاب، کے پی، بلوچستان)',
      educationLevel: 'Graduate',
      deadline: '2027-01-10',
      stipendOrScopeEn: 'Federal BPS-16 & Above (Check FPSC Adv)',
      stipendOrScopeUr: 'وفاقی سرکاری اسکیل BPS-16 اور بالا (اشتہار دیکھیں)',
      eligibilityEn: [
        'Pakistani citizen meeting specific post qualifications on fpsc.gov.pk.',
        'Provincial/Regional quota clearly listed per post in official PDF.',
      ],
      eligibilityUr: [
        'پاکستانی شہری جو fpsc.gov.pk پر دی گئی تعلیمی اہلیت پوری کرتا ہو۔',
        'صوبائی کوٹہ ہر آسامی کے لیے سرکاری اشتہار میں درج ہوتا ہے۔',
      ],
      requiredDocsEn: [
        'CNIC',
        'HEC Verified Degree',
        'Domicile Certificate',
        'Treasury Receipt / Fee Challan',
      ],
      requiredDocsUr: [
        'قومی شناختی کارڈ',
        'ایچ ای سی سے تصدیق شدہ ڈگری',
        'ڈومیسائل سرٹیفکیٹ',
        'فیس چالان رسید',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD: Official Federal recruitment gateway. Never pay any third-party agent; apply directly at fpsc.gov.pk.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: وفاقی ملازمتوں کا سرکاری پورٹل۔ کسی ایجنٹ کو پیسے نہ دیں، براہ راست fpsc.gov.pk پر درخواست دیں۔',
      officialUrl: 'https://www.fpsc.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-21',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-05T12:00:00.000Z',
    },
    {
      id: 'job-sindh-03',
      category: 'job',
      titleEn: 'Sindh Police Constable & Junior Clerk Recruitment Info (DEMO)',
      titleUr: 'سندھ پولیس کانسٹیبل اور جونیئر کلرک بھرتی رہنمائی (ڈیمو)',
      organizationEn: 'Sindh Police / STS IBA Testing (Demo Record)',
      organizationUr: 'سندھ پولیس / ایس ٹی ایس آئی بی اے ٹیسٹنگ (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'Karachi, Hyderabad, Sukkur, Larkana Ranges',
      cityOrScopeUr: 'کراچی، حیدرآباد، سکھر، لاڑکانہ رینجز',
      educationLevel: 'Matric/Inter',
      deadline: '2026-10-15',
      stipendOrScopeEn: 'BPS-07 / BPS-11 (Verify active cycle)',
      stipendOrScopeUr: 'BPS-07 / BPS-11 (تازہ بھرتی چیک کریں)',
      eligibilityEn: [
        'Matriculation or Intermediate from recognized Sindh Board.',
        'Valid CNIC and district domicile of Sindh.',
      ],
      eligibilityUr: [
        'سندھ بورڈ سے میٹرک یا انٹرمیڈیٹ پاس۔',
        'سندھ کے متعلقہ ضلع کا ڈومیسائل اور شناختی کارڈ۔',
      ],
      requiredDocsEn: [
        'CNIC & Sindh Domicile',
        'Matric / Inter Certificate',
        'Passport-size Photographs',
      ],
      requiredDocsUr: [
        'شناختی کارڈ اور سندھ ڈومیسائل',
        'میٹرک / انٹر کی سند',
        'پاسپورٹ سائز تصاویر',
      ],
      descriptionEn:
        'DEMO SAMPLE RECORD (Marked Expired to demonstrate deadline tracking): Always check sindhpolice.gov.pk for new official hiring cycles.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ (میعاد ختم شدہ مثال): نئی بھرتیوں کے لیے ہمیشہ sindhpolice.gov.pk چیک کریں۔',
      officialUrl: 'https://www.sindhpolice.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-10-20',
      status: 'expired',
      isDemo: true,
      createdAt: '2026-09-10T08:00:00.000Z',
    },
    {
      id: 'int-sindh-01',
      category: 'internship',
      titleEn: 'Sindh Youth Affairs Civic & Digital Internship (DEMO)',
      titleUr: 'سندھ یوتھ افیئرز سِوک اور ڈیجیٹل انٹرن شپ (ڈیمو)',
      organizationEn: 'Department of Sports & Youth Affairs Sindh (Demo Record)',
      organizationUr: 'محکمہ کھیل و امورِ نوجوانان سندھ (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'Karachi, Hyderabad & Sukkur Divisions',
      cityOrScopeUr: 'کراچی، حیدرآباد اور سکھر ڈویژن',
      educationLevel: 'Undergraduate',
      deadline: '2026-12-18',
      stipendOrScopeEn: '3 Months · Stipend per official cycle',
      stipendOrScopeUr: '3 ماہ · سرکاری پالیسی کے مطابق وظیفہ',
      eligibilityEn: [
        'Final-year student or fresh graduate domiciled in Sindh.',
        'Basic computer and Urdu/English/Sindhi communication skills.',
      ],
      eligibilityUr: [
        'سندھ ڈومیسائل کے حامل آخری سال کے طلبہ یا نئے گریجویٹس۔',
        'کمپیوٹر اور اردو/انگریزی/سندھی بول چال کی بنیادی مہارت۔',
      ],
      requiredDocsEn: ['CV / Resume', 'University Transcript', 'CNIC & Domicile'],
      requiredDocsUr: ['سی وی / ریزیومے', 'یونیورسٹی ٹرانسکرپٹ', 'شناختی کارڈ اور ڈومیسائل'],
      descriptionEn:
        'DEMO SAMPLE RECORD: Sample public-sector youth internship structure connecting Sindh graduates with administrative and digital public service desks.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: سندھ کے نوجوان گریجویٹس کے لیے سرکاری اور ڈیجیٹل عوامی خدمات میں تربیتی پروگرام کا نمونہ۔',
      officialUrl: 'https://sindh.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-19',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-06T09:00:00.000Z',
    },
    {
      id: 'int-fed-02',
      category: 'internship',
      titleEn: 'PSEB / Ignite Tech Graduate Internship Track (DEMO)',
      titleUr: 'پی ایس ای بی / اگنائٹ ٹیک گریجویٹ انٹرن شپ (ڈیمو)',
      organizationEn: 'Pakistan Software Export Board (Demo Record)',
      organizationUr: 'پاکستان سافٹ ویئر ایکسپورٹ بورڈ (ڈیمو)',
      province: 'Federal',
      cityOrScopeEn: 'Karachi, Lahore, Islamabad, Peshawar, Quetta',
      cityOrScopeUr: 'کراچی، لاہور، اسلام آباد، پشاور، کوئٹہ',
      educationLevel: 'Graduate',
      deadline: '2027-01-05',
      stipendOrScopeEn: '6 Months · Industry Placement (Verify at PSEB)',
      stipendOrScopeUr: '6 ماہ · آئی ٹی کمپنی میں تربیت (پورٹل دیکھیں)',
      eligibilityEn: [
        'Fresh IT / CS / Software Engineering graduates.',
        'Completed 16 years of education from HEC-recognized university.',
      ],
      eligibilityUr: [
        'آئی ٹی / کمپیوٹر سائنس / سافٹ ویئر انجینئرنگ کے نئے گریجویٹس۔',
        'ایچ ای سی سے منظور شدہ جامعہ سے 16 سالہ تعلیم مکمل ہو۔',
      ],
      requiredDocsEn: ['CNIC', 'Provisional Certificate / Degree', 'Updated Tech CV'],
      requiredDocsUr: ['شناختی کارڈ', 'عارضی سرٹیفکیٹ / ڈگری', 'تازہ ترین ٹیک سی وی'],
      descriptionEn:
        'DEMO SAMPLE RECORD: Connects Pakistani IT graduates with registered software houses for supervised industry experience.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: پاکستانی آئی ٹی گریجویٹس کو سافٹ ویئر ہاؤسز میں عملی تربیت دلانے کا پروگرام۔',
      officialUrl: 'https://techdestination.com/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-17',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-07T14:00:00.000Z',
    },
    {
      id: 'crs-fed-01',
      category: 'course',
      titleEn: 'DigiSkills.pk Free Freelancing & Digital Literacy Courses (DEMO)',
      titleUr: 'ڈیجی اسکلز ڈاٹ پی کے — مفت آن لائن ہنر اور فری لانسنگ کورسز (ڈیمو)',
      organizationEn: 'Ignite & Virtual University of Pakistan (Demo Record)',
      organizationUr: 'اگنائٹ اور ورچوئل یونیورسٹی آف پاکستان (ڈیمو)',
      province: 'Federal',
      cityOrScopeEn: '100% Online Across Pakistan (Urdu & English)',
      cityOrScopeUr: 'پاکستان بھر میں 100 فیصد مفت آن لائن',
      educationLevel: 'Open to All',
      deadline: 'Rolling',
      stipendOrScopeEn: 'Free Government Certificate · 12 Weeks',
      stipendOrScopeUr: 'مفت سرکاری سرٹیفکیٹ · 12 ہفتے',
      eligibilityEn: [
        'Any Pakistani citizen with valid CNIC or B-Form.',
        'Basic mobile or computer internet access.',
      ],
      eligibilityUr: [
        'کوئی بھی پاکستانی شہری جس کے پاس شناختی کارڈ یا ب فارم ہو۔',
        'موبائل یا کمپیوٹر پر انٹرنیٹ کی بنیادی سہولت۔',
      ],
      requiredDocsEn: ['Valid Email & Mobile Number', 'CNIC / B-Form Number'],
      requiredDocsUr: ['ای میل اور موبائل نمبر', 'شناختی کارڈ یا ب فارم نمبر'],
      descriptionEn:
        'DEMO SAMPLE RECORD: Free government-backed training in Freelancing, Graphic Design, Digital Marketing, QuickBooks, WordPress, and E-Commerce.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: فری لانسنگ، گرافک ڈیزائن، ڈیجیٹل مارکیٹنگ اور ای کامرس کی مفت سرکاری تربیت۔',
      officialUrl: 'https://digiskills.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-23',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-08T10:00:00.000Z',
    },
    {
      id: 'crs-sindh-02',
      category: 'course',
      titleEn: 'Sindh TEVTA Vocational & Technical Trades Training (DEMO)',
      titleUr: 'سندھ ٹیوٹا — مفت فنی اور تکنیکی تربیتی کورسز (ڈیمو)',
      organizationEn: 'Sindh Technical Education & Vocational Training Authority (Demo Record)',
      organizationUr: 'سندھ ٹیکنیکل ایجوکیشن اینڈ ووکیشنل ٹریننگ اتھارٹی (ڈیمو)',
      province: 'Sindh',
      cityOrScopeEn: 'In-Person Institutes Across Sindh Districts',
      cityOrScopeUr: 'سندھ کے تمام اضلاع کے فنی تربیتی مراکز',
      educationLevel: 'Matric/Inter',
      deadline: '2026-12-25',
      stipendOrScopeEn: 'Free Tuition + Trade Certificate',
      stipendOrScopeUr: 'مفت تربیت اور فنی سرٹیفکیٹ',
      eligibilityEn: [
        'Youth aged 15–35 residing in Sindh.',
        'Middle / Matric pass depending on trade (Electrician, Solar, Plumber, IT, Tailoring).',
      ],
      eligibilityUr: [
        'سندھ کے 15 سے 35 سال کے نوجوان۔',
        'مڈل یا میٹرک پاس (الیکٹریشن، سولر ٹیکنیشن، کمپیوٹر، سلائی کڑھائی وغیرہ)۔',
      ],
      requiredDocsEn: ['CNIC / B-Form', 'School Leaving / Matric Certificate', '2 Photographs'],
      requiredDocsUr: ['شناختی کارڈ / ب فارم', 'اسکول سرٹیفکیٹ / میٹرک سند', '2 تصاویر'],
      descriptionEn:
        'DEMO SAMPLE RECORD: Hands-on vocational skills in Solar PV installation, Electrician, HVAC, Mobile Repair, and Office IT across Sindh.',
      descriptionUr:
        'ڈیمو نمونہ ریکارڈ: سندھ بھر میں سولر پینل، الیکٹریشن، موبائل ریپئر اور کمپیوٹر کے مفت عملی کورسز۔',
      officialUrl: 'https://stevta.gos.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-18',
      status: 'active',
      isDemo: true,
      createdAt: '2026-11-09T11:30:00.000Z',
    },
    {
      id: 'sch-pending-01',
      category: 'scholarship',
      titleEn: 'Karachi Community Merit Bursary Submission (Pending Verification)',
      titleUr: 'کراچی کمیونٹی میرٹ وظیفہ تجویز (تصدیق کے انتظار میں)',
      organizationEn: 'Submitted by Citizen Contributor',
      organizationUr: 'شہری کی جانب سے بھیجی گئی معلومات',
      province: 'Sindh',
      cityOrScopeEn: 'Karachi Division',
      cityOrScopeUr: 'کراچی ڈویژن',
      educationLevel: 'Matric/Inter',
      deadline: '2026-12-31',
      stipendOrScopeEn: 'Pending Admin Verification',
      stipendOrScopeUr: 'ایڈمن تصدیق کے بعد شائع ہوگا',
      eligibilityEn: ['Students enrolled in Karachi government colleges.'],
      eligibilityUr: ['کراچی کے سرکاری کالجوں کے طلبہ۔'],
      requiredDocsEn: ['College ID Card', 'CNIC / B-Form'],
      requiredDocsUr: ['کالج کارڈ', 'شناختی کارڈ / ب فارم'],
      descriptionEn:
        'Pending sample submission demonstrating the Admin Dashboard approval & source verification queue.',
      descriptionUr:
        'ایڈمن ڈیش بورڈ کی منظوری اور سرکاری تصدیق کے عمل کو دکھانے کے لیے زیر التواء درخواست۔',
      officialUrl: 'https://sindh.gov.pk/',
      verifiedSource: false,
      lastVerifiedDate: '2026-11-24',
      status: 'pending',
      isDemo: true,
      submittedBy: 'Citizen Portal Contributor',
      createdAt: '2026-11-24T14:00:00.000Z',
    },
  ],
  guides: [
    {
      id: 'guide-cnic',
      slug: 'nadra-cnic',
      titleEn: 'How to Apply or Renew CNIC (NADRA)',
      titleUr: 'قومی شناختی کارڈ (CNIC) بنوانے یا تجدید کا آسان طریقہ',
      authorityEn: 'NADRA (National Database & Registration Authority)',
      authorityUr: 'نادرا (نیشنل ڈیٹا بیس اینڈ رجسٹریشن اتھارٹی)',
      province: 'Federal',
      summaryEn:
        'Step-by-step plain guide for first-time 18+ CNIC, renewal, or Pak-Identity online tracking.',
      summaryUr:
        '18 سال کی عمر میں پہلی بار شناختی کارڈ بنوانے، تجدید کروانے یا آن لائن ٹریکنگ کا آسان طریقہ۔',
      requiredDocsEn: [
        'Original Birth Certificate or NADRA Child Registration Certificate (B-Form)',
        'Original CNIC of Mother or Father (or blood relative for verification)',
        'Matric Certificate (if educated, for exact date of birth & name spelling)',
        'Expired CNIC (in case of renewal only)',
      ],
      requiredDocsUr: [
        'اصل پیدائشی سرٹیفکیٹ یا نادرا ب فارم (CRC)',
        'والد یا والدہ کا اصل شناختی کارڈ (بائیومیٹرک تصدیق کے لیے)',
        'میٹرک کی سند (اگر تعلیم یافتہ ہوں تو نام اور تاریخ پیدائش کے لیے)',
        'پرانا شناختی کارڈ (صرف تجدید کی صورت میں)',
      ],
      stepsEn: [
        'Collect your original B-Form / Birth Certificate and bring one parent (or blood relative) with their original CNIC.',
        'Visit your nearest NADRA Registration Center (or use the official Pak-Identity portal/app for renewal).',
        'Take a queue token at the entrance desk and wait for biometric fingerprint & photograph capture.',
        'Carefully check your Urdu and English name spelling on the printed review slip before signing.',
        'Pay the official fee at the NADRA counter or via e-Sahulat/JazzCash/Easypaisa and keep your tracking receipt safely.',
      ],
      stepsUr: [
        'اپنا اصل ب فارم / پیدائشی سرٹیفکیٹ لیں اور والد یا والدہ (یا قریبی خونی رشتہ دار) کو ان کے اصل شناختی کارڈ کے ساتھ لے جائیں۔',
        'قریبی نادرا رجسٹریشن سینٹر تشریف لے جائیں (تجدید کے لیے Pak-Identity ایپ بھی استعمال ہو سکتی ہے)۔',
        'کاؤنٹر سے ٹوکن لیں اور تصویر و فنگر پرنٹس کی باری کا انتظار کریں۔',
        'پرنٹ شدہ فارم پر اپنا نام اردو اور انگریزی میں اچھی طرح چیک کر کے دستخط کریں۔',
        'مقررہ سرکاری فیس کاؤنٹر پر جمع کرائیں اور ٹریکنگ رسید سنبھال کر رکھیں۔',
      ],
      feeNoteEn:
        'Official Normal, Urgent, and Executive fees change periodically. Always confirm current rates directly on id.nadra.gov.pk before paying.',
      feeNoteUr:
        'نارمل، ارجنٹ اور ایگزیکٹو فیس وقتاً فوقتاً تبدیل ہوتی ہے۔ ادائیگی سے پہلے ہمیشہ id.nadra.gov.pk پر تازہ فیس چیک کریں۔',
      officialUrl: 'https://www.nadra.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-22',
      isDemo: true,
    },
    {
      id: 'guide-domicile',
      slug: 'sindh-domicile-prc',
      titleEn: 'Sindh Domicile & PRC (Form-D / Form-C)',
      titleUr: 'سندھ ڈومیسائل اور پی آر سی (PRC) بنوانے کا طریقہ',
      authorityEn: 'Deputy Commissioner Office / e-Services Sindh',
      authorityUr: 'ڈپٹی کمشنر آفس / ای سروسز سندھ',
      province: 'Sindh',
      summaryEn:
        'Essential document for Sindh university admissions, scholarships, and provincial government jobs.',
      summaryUr:
        'سندھ کی یونیورسٹیوں میں داخلے، اسکالرشپ اور سرکاری ملازمتوں کے لیے نہایت ضروری دستاویز۔',
      requiredDocsEn: [
        'Applicant CNIC or B-Form (copy + original)',
        'Father / Guardian CNIC and Father Domicile (if available)',
        'Birth Certificate (Union Council / NADRA)',
        'Educational Certificates (Matric / Inter Marksheets)',
        'Utility Bill or Rental Agreement / Residence Proof in the District',
        '2–4 Passport-size Photographs (blue/white background)',
      ],
      requiredDocsUr: [
        'درخواست گزار کا شناختی کارڈ یا ب فارم (اصل اور کاپی)',
        'والد کا شناختی کارڈ اور والد کا ڈومیسائل (اگر موجود ہو)',
        'پیدائشی سرٹیفکیٹ (یونین کونسل / نادرا)',
        'تعلیمی اسناد (میٹرک / انٹر مارک شیٹ)',
        'بجلی یا گیس کا بل / رہائش کا ثبوت',
        '2 سے 4 پاسپورٹ سائز تصاویر',
      ],
      stepsEn: [
        'Check whether your district Deputy Commissioner office uses Sindh e-Services online portal or physical Domicile Branch counter.',
        'Fill out Form-P (for Domicile) and Form-D / Form-C (for Permanent Residence Certificate).',
        'Get the application form and photographs attested by a Grade-17 or above Government Officer if required by your DC office.',
        'Deposit the official government treasury challan (National Bank of Pakistan) — never pay unreceipted cash to middlemen.',
        'Submit the file at the DC Domicile counter and collect your receipt with verification date.',
      ],
      stepsUr: [
        'اپنے ضلع کے ڈپٹی کمشنر دفتر یا سندھ ای سروسز پورٹل سے معلوم کریں کہ آن لائن یا کاؤنٹر پر درخواست جمع ہوگی۔',
        'ڈومیسائل (Form-P) اور پی آر سی (Form-D / C) کا فارم مکمل پُر کریں۔',
        'ضرورت کے مطابق گریڈ 17 کے سرکاری افسر سے فارم اور تصاویر تصدیق کروائیں۔',
        'نیشنل بینک میں سرکاری چالان جمع کرائیں — کسی ایجنٹ کو اضافی پیسے نہ دیں۔',
        'فائل ڈپٹی کمشنر آفس کے کاؤنٹر پر جمع کرا کر وصولی کی رسید لیں۔',
      ],
      feeNoteEn:
        'Official challan fees are nominal government treasury charges. Verify exact challan code at your district DC office or sindh.gov.pk.',
      feeNoteUr:
        'سرکاری چالان فیس بہت کم ہوتی ہے۔ درست چالان کوڈ ہمیشہ اپنے ضلع کے ڈی سی آفس یا sindh.gov.pk سے تصدیق کریں۔',
      officialUrl: 'https://sindh.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-20',
      isDemo: true,
    },
    {
      id: 'guide-passport',
      slug: 'pakistani-passport',
      titleEn: 'Pakistani Machine-Readable / e-Passport Guide',
      titleUr: 'پاکستانی پاسپورٹ (نیا یا تجدید) بنوانے کا طریقہ',
      authorityEn: 'Directorate General of Immigration & Passports (DGIP)',
      authorityUr: 'ڈائریکٹوریٹ جنرل آف امیگریشن اینڈ پاسپورٹس',
      province: 'Federal',
      summaryEn:
        'Clear checklist for visiting Regional Passport Offices (Karachi, Hyderabad, Sukkur, etc.) or renewing online.',
      summaryUr:
        'علاقائی پاسپورٹ آفس جانے یا آن لائن پاسپورٹ تجدید کروانے کے لیے مکمل اور آسان رہنمائی۔',
      requiredDocsEn: [
        'Original valid CNIC / NICOP (or B-Form + parents CNIC for minors under 18)',
        'Original Passport Fee Deposit Receipt (NBP or Passport Fee Asaan App)',
        'Previous Passport (if applying for renewal)',
        'NOC (No Objection Certificate) if employed in a government department',
      ],
      requiredDocsUr: [
        'اصل اور کارآمد شناختی کارڈ (18 سال سے کم بچوں کے لیے ب فارم اور والدین کا شناختی کارڈ)',
        'فیس جمع کرانے کی اصل رسید (NBP یا Passport Fee Asaan ایپ)',
        'پرانا پاسپورٹ (اگر تجدید کروا رہے ہوں)',
        'این او سی (صرف سرکاری ملازمین کے لیے)',
      ],
      stepsEn: [
        'Pay the official passport fee first using the official "Passport Fee Asaan" app or National Bank of Pakistan branch.',
        'Visit your Regional Passport Office early with original CNIC and fee receipt (no photocopies needed at counter in most e-offices, carry copies as backup).',
        'Complete token issuance, photograph, biometric fingerprints, and data entry verification.',
        'Verify your spelling, passport validity (5 or 10 years), and pages before final submission.',
        'Track passport readiness via official SMS service or onlinemrp.dgip.gov.pk.',
      ],
      stepsUr: [
        'سب سے پہلے سرکاری Passport Fee Asaan ایپ یا نیشنل بینک کے ذریعے پاسپورٹ فیس جمع کرائیں۔',
        'اصل شناختی کارڈ اور فیس رسید لے کر قریبی پاسپورٹ آفس تشریف لے جائیں۔',
        'ٹوکن، تصویر، فنگر پرنٹس اور ڈیٹا انٹری کا مرحلہ مکمل کریں۔',
        'جمع کرنے سے پہلے اپنے نام کے ہجے، مدت (5 یا 10 سال) اور صفحات ضرور چیک کریں۔',
        'سرکاری ایس ایم ایس یا onlinemrp.dgip.gov.pk سے اپنا اسٹیٹس چیک کریں۔',
      ],
      feeNoteEn:
        'Fees vary by 36/72/100 pages, 5 vs 10 years, Normal vs Urgent, and e-Passport. Verify current official fee schedule at dgip.gov.pk.',
      feeNoteUr:
        'فیس کا دارومدار صفحات، مدت (5 یا 10 سال) اور نارمل/ارجنٹ کیٹیگری پر ہے۔ درست فیس dgip.gov.pk پر دیکھیں۔',
      officialUrl: 'https://dgip.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-21',
      isDemo: true,
    },
    {
      id: 'guide-license',
      slug: 'sindh-driving-license',
      titleEn: 'Sindh Driving License (Learner & Permanent)',
      titleUr: 'سندھ ڈرائیونگ لائسنس (لرنر اور مستقل) بنوانے کا طریقہ',
      authorityEn: 'Driving License Sindh (DLS — Sindh Police)',
      authorityUr: 'ڈرائیونگ لائسنس سندھ (سندھ پولیس)',
      province: 'Sindh',
      summaryEn:
        'How to get a Learner Permit online or at DLS branches (Clifton, Korangi, Nazimabad, Hyderabad, Sukkur) and pass the permanent test.',
      summaryUr:
        'آن لائن یا DLS برانچ سے لرنر پرمٹ بنوانے اور مستقل ڈرائیونگ ٹیسٹ پاس کرنے کا طریقہ۔',
      requiredDocsEn: [
        'Original valid CNIC + 2 copies',
        'Medical Fitness Certificate (available at DLS center medical counter)',
        'Original Learner Permit (held for at least 42 days before permanent test)',
      ],
      requiredDocsUr: [
        'اصل شناختی کارڈ اور 2 فوٹو کاپیاں',
        'میڈیکل فٹنس سرٹیفکیٹ (سینٹر کے اندر میڈیکل کاؤنٹر سے ملتا ہے)',
        'اصل لرنر پرمٹ (مستقل ٹیسٹ سے کم از کم 42 دن پرانا ہو)',
      ],
      stepsEn: [
        'Apply for a Learner License online at dls.gos.pk or visit a Sindh Police DLS branch with your original CNIC.',
        'Hold the Learner Permit for the mandatory waiting period (typically 42 days for car/bike).',
        'Book/visit your DLS branch for medical check, computerized road-sign theory test, and practical driving track test.',
        'Upon passing, pay the official card fee at the bank counter inside DLS and receive your receipt.',
      ],
      stepsUr: [
        'dls.gos.pk پر آن لائن یا قریبی ڈرائیونگ لائسنس برانچ سے لرنر پرمٹ حاصل کریں۔',
        'مستقل ٹیسٹ سے پہلے لرنر پرمٹ کی مقررہ مدت (عموماً 42 دن) مکمل کریں۔',
        'برانچ میں جا کر میڈیکل چیک، کمپیوٹرائزڈ ٹریفک سائن ٹیسٹ اور عملی ڈرائیونگ ٹیسٹ دیں۔',
        'پاس ہونے کے بعد سینٹر کے بینک کاؤنٹر پر سرکاری فیس جمع کرا کے رسید لیں۔',
      ],
      feeNoteEn:
        'Check exact motorcycle, LTV, HTV, and learner fee schedules directly on dls.gos.pk.',
      feeNoteUr:
        'موٹر سائیکل، کار (LTV) اور بڑی گاڑی (HTV) کی درست فیس dls.gos.pk پر چیک کریں۔',
      officialUrl: 'https://dls.gos.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-19',
      isDemo: true,
    },
    {
      id: 'guide-hec',
      slug: 'hec-degree-attestation',
      titleEn: 'HEC Degree & Transcript Attestation',
      titleUr: 'ایچ ای سی (HEC) سے ڈگری تصدیق کرانے کا طریقہ',
      authorityEn: 'Higher Education Commission (HEC)',
      authorityUr: 'ہائر ایجوکیشن کمیشن (HEC)',
      province: 'Federal',
      summaryEn:
        'Required before MOFA attestation, foreign university applications, and many senior jobs.',
      summaryUr:
        'بیرون ملک تعلیم، ملازمت اور وزارت خارجہ (MOFA) سے تصدیق کے لیے ضروری مرحلہ۔',
      requiredDocsEn: [
        'Original Degrees & Transcripts (from Matric up to highest degree)',
        'CNIC / Passport copy',
        'HEC E-Portal Online Application & Printed Receipt',
      ],
      requiredDocsUr: [
        'اصل ڈگریاں اور ٹرانسکرپٹس (میٹرک سے آخری ڈگری تک)',
        'شناختی کارڈ یا پاسپورٹ کی کاپی',
        'ایچ ای سی ای پورٹل کی آن لائن درخواست اور پرنٹ رسید',
      ],
      stepsEn: [
        'Create an account on eservices.hec.gov.pk and upload clear scans of your degrees and transcripts.',
        'Submit your application for initial online scrutiny by HEC.',
        'Once approved for slot booking, choose Urgent (in-person at Karachi/Islamabad/Lahore/Peshawar/Quetta HEC center) or Courier mode (TCS).',
        'Pay the official per-document attestation fee shown on the HEC portal and keep your tracking slip.',
      ],
      stepsUr: [
        'eservices.hec.gov.pk پر اکاؤنٹ بنائیں اور اپنی تمام ڈگریوں کے صاف اسکین اپ لوڈ کریں۔',
        'ابتدائی آن لائن جانچ پڑتال کے لیے درخواست جمع کرائیں۔',
        'منظوری کے بعد کراچی یا دیگر علاقائی ایچ ای سی سینٹر کی تاریخ منتخب کریں یا کوریئر سروس چنیں۔',
        'پورٹل پر ظاہر ہونے والی سرکاری فیس جمع کرا کے ٹریکنگ سلپ سنبھالیں۔',
      ],
      feeNoteEn:
        'Confirm exact per-page original vs photocopy attestation fees on eservices.hec.gov.pk.',
      feeNoteUr:
        'اصل ڈگری اور کاپی کی تصدیق کی درست فیس eservices.hec.gov.pk پر دیکھیں۔',
      officialUrl: 'https://eservices.hec.gov.pk/',
      verifiedSource: true,
      lastVerifiedDate: '2026-11-16',
      isDemo: true,
    },
  ],
  problems: [
    {
      id: 'prb-demo-01',
      referenceCode: 'RST-SND-1042',
      category: 'Water & Sewerage',
      province: 'Sindh',
      district: 'Karachi East',
      area: 'Gulistan-e-Johar Block 13',
      title: 'Broken main sewerage line near primary school gate (DEMO)',
      description:
        'DEMO SAMPLE REPORT: Standing wastewater near the girls primary school entrance for 4 days causing health hazard for children.',
      reporterName: 'Demo Citizen',
      reporterContact: '0300-0000000',
      status: 'forwarded',
      adminNote: 'Sample note: Forwarded to KW&SC District East complaint desk.',
      isDemo: true,
      createdAt: '2026-11-21T08:15:00.000Z',
      updatedAt: '2026-11-23T14:20:00.000Z',
    },
    {
      id: 'prb-demo-02',
      referenceCode: 'RST-SND-1043',
      category: 'Road & Streetlights',
      province: 'Sindh',
      district: 'Hyderabad',
      area: 'Latifabad Unit 8',
      title: 'Non-functional streetlights along hospital road (DEMO)',
      description:
        'DEMO SAMPLE REPORT: 12 streetlights along the main approach road to the public clinic have been dark for two weeks.',
      reporterName: 'Demo Resident',
      reporterContact: 'demo@example.com',
      status: 'under_review',
      adminNote: 'Sample note: Awaiting municipal electrical division inspection.',
      isDemo: true,
      createdAt: '2026-11-22T17:45:00.000Z',
      updatedAt: '2026-11-24T09:10:00.000Z',
    },
    {
      id: 'prb-demo-03',
      referenceCode: 'RST-SND-1044',
      category: 'Garbage & Sanitation',
      province: 'Sindh',
      district: 'Sukkur',
      area: 'Minara Road Market',
      title: 'Overflowing solid waste collection point (DEMO)',
      description:
        'DEMO SAMPLE REPORT: Waste container has not been cleared in 5 days near the vegetable market.',
      status: 'resolved',
      adminNote: 'Sample note: Marked resolved after local municipal sanitation cleanup.',
      isDemo: true,
      createdAt: '2026-11-18T11:00:00.000Z',
      updatedAt: '2026-11-20T16:30:00.000Z',
    },
  ],
  contactMessages: [],
};

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : SEED_DATA.opportunities,
      guides: Array.isArray(parsed.guides) ? parsed.guides : SEED_DATA.guides,
      problems: Array.isArray(parsed.problems) ? parsed.problems : SEED_DATA.problems,
      contactMessages: Array.isArray(parsed.contactMessages) ? parsed.contactMessages : [],
      adminCredential: parsed.adminCredential ?? null,
      monitoredSources:
        Array.isArray(parsed.monitoredSources) && parsed.monitoredSources.length > 0
          ? parsed.monitoredSources
          : structuredClone(SEED_DATA.monitoredSources),
      nationalUpdates: Array.isArray(parsed.nationalUpdates)
        ? parsed.nationalUpdates
        : structuredClone(SEED_DATA.nationalUpdates),
      notificationSubscriptions: Array.isArray(parsed.notificationSubscriptions)
        ? parsed.notificationSubscriptions
        : [],
      syncAuditLogs: Array.isArray(parsed.syncAuditLogs)
        ? parsed.syncAuditLogs
        : structuredClone(SEED_DATA.syncAuditLogs),
      syncEngineState:
        parsed.syncEngineState && typeof parsed.syncEngineState === 'object'
          ? { ...structuredClone(SEED_DATA.syncEngineState), ...parsed.syncEngineState }
          : structuredClone(SEED_DATA.syncEngineState),
    };
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    return structuredClone(SEED_DATA);
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDbFile();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function toPublicProblem(problem: ProblemReport): PublicProblemSummary {
  return {
    id: problem.id,
    referenceCode: problem.referenceCode,
    category: problem.category,
    province: problem.province,
    district: problem.district,
    area: problem.area,
    title: problem.title,
    description: problem.description,
    status: problem.status,
    adminNote: problem.adminNote,
    isDemo: problem.isDemo,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
