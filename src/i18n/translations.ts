import type { Language, PageId, ProblemStatus } from '../types';

export interface TranslationBundle {
  brand: string;
  nav: Record<PageId, string>;
  topBar: {
    primaryAction: string;
    menu: string;
    close: string;
  };
  theme: {
    label: string;
    light: string;
    dark: string;
  };
  provinceLabel: string;
  provinces: {
    All: string;
    Sindh: string;
    Federal: string;
    Punjab: string;
    'Khyber Pakhtunkhwa': string;
    Balochistan: string;
  };
  demoBanner: string;
  common: {
    searchPlaceholder: string;
    all: string;
    active: string;
    expired: string;
    pending: string;
    verifiedSource: string;
    unverifiedSource: string;
    lastVerified: string;
    deadline: string;
    officialWebsite: string;
    viewDetails: string;
    close: string;
    loading: string;
    retry: string;
    emptyTitle: string;
    emptySubtitle: string;
    resetFilters: string;
    submit: string;
    submitting: string;
    demoTag: string;
    suggestListing: string;
    eligibility: string;
    requiredDocuments: string;
    stepByStep: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
  };
  home: {
    kicker: string;
    heroTitle: string;
    heroSubtitle: string;
    primaryCta: string;
    secondaryCta: string;
    quickStartTitle: string;
    quickStartSubtitle: string;
    quickCards: Array<{
      page: PageId;
      title: string;
      desc: string;
    }>;
    featuredTitle: string;
    featuredSubtitle: string;
    viewAll: string;
    expansionTitle: string;
    expansionSubtitle: string;
    expansionStages: Array<{
      region: string;
      status: string;
      detail: string;
    }>;
  };
  opportunities: {
    titles: {
      scholarships: string;
      jobs: string;
      internships: string;
      courses: string;
    };
    subtitles: {
      scholarships: string;
      jobs: string;
      internships: string;
      courses: string;
    };
    educationFilter: string;
    statusFilter: string;
    suggestTitle: string;
    suggestSubtitle: string;
    suggestSuccess: string;
  };
  guides: {
    title: string;
    subtitle: string;
    checklistHelp: string;
    checklistProgress: string;
    feeNoteLabel: string;
    selectGuide: string;
  };
  calculators: {
    title: string;
    subtitle: string;
    disclaimer: string;
    tabs: {
      electricity: string;
      tax: string;
      zakat: string;
      merit: string;
    };
  };
  report: {
    title: string;
    subtitle: string;
    formTitle: string;
    trackerTitle: string;
    trackerSubtitle: string;
    searchRefPlaceholder: string;
    submitSuccess: string;
    privacyNote: string;
    statuses: Record<ProblemStatus, string>;
  };
  about: {
    title: string;
    subtitle: string;
    missionTitle: string;
    missionBody: string;
    standardsTitle: string;
    standardsItems: string[];
    helplinesTitle: string;
    contactTitle: string;
    contactSuccess: string;
  };
  admin: {
    title: string;
    subtitle: string;
    setupTitle: string;
    setupDesc: string;
    loginTitle: string;
    loginDesc: string;
    signOut: string;
  };
  updates: {
    title: string;
    subtitle: string;
    lastSynced: string;
    monitoredCount: string;
    deadlineFilterLabel: string;
    deadlineFilters: {
      all: string;
      active: string;
      closing_soon: string;
      rolling: string;
      expired: string;
    };
    categories: {
      all: string;
      gov_jobs: string;
      scholarships: string;
      free_courses: string;
      gov_schemes: string;
      nadra_updates: string;
      police_recruitment: string;
      armed_forces: string;
      university_admissions: string;
      public_announcements: string;
      citizen_services: string;
    };
    publishedDate: string;
    discoveredDate: string;
    feeLabel: string;
    romanUrduLabel: string;
    englishSummaryLabel: string;
    urduSummaryLabel: string;
    notificationsTitle: string;
    notificationsSubtitle: string;
    saveAlerts: string;
    alertsSaved: string;
    matchingAlertsTitle: string;
    noAlerts: string;
    homeSectionTitle: string;
    homeSectionSubtitle: string;
  };
  footer: {
    mission: string;
    demoNote: string;
    sindhFocus: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {
    brand: 'RAASTA Pakistan',
    nav: {
      home: 'Home',
      updates: 'National Updates',
      scholarships: 'Scholarships',
      jobs: 'Government Jobs',
      internships: 'Internships',
      courses: 'Free Courses',
      guides: 'Document Guides',
      calculators: 'Daily Calculators',
      report: 'Report Problem',
      about: 'About & Contact',
      admin: 'Admin Panel',
    },
    topBar: {
      primaryAction: 'Report Problem',
      menu: 'Menu',
      close: 'Close',
    },
    theme: {
      label: 'Appearance',
      light: 'Light',
      dark: 'Dark',
    },
    provinceLabel: 'Region Focus',
    provinces: {
      All: 'All Pakistan',
      Sindh: 'Sindh (Active MVP)',
      Federal: 'Federal / ICT',
      Punjab: 'Punjab (Planned)',
      'Khyber Pakhtunkhwa': 'KP (Planned)',
      Balochistan: 'Balochistan (Planned)',
    },
    demoBanner:
      'MVP Demo Notice: Sample opportunities below are clearly labelled DEMO for layout demonstration. Always check the linked official .gov.pk portals for live deadlines and fees.',
    common: {
      searchPlaceholder: 'Search by title, department, city, or keyword...',
      all: 'All',
      active: 'Active',
      expired: 'Expired',
      pending: 'Pending Review',
      verifiedSource: 'Official Source Verified',
      unverifiedSource: 'Source Pending Verification',
      lastVerified: 'Verified',
      deadline: 'Deadline',
      officialWebsite: 'Visit Official Portal',
      viewDetails: 'View Full Details',
      close: 'Close',
      loading: 'Loading records...',
      retry: 'Try Again',
      emptyTitle: 'No matching listings found',
      emptySubtitle: 'Try clearing your search or switching the province filter.',
      resetFilters: 'Reset Filters',
      submit: 'Submit',
      submitting: 'Submitting...',
      demoTag: 'DEMO',
      suggestListing: 'Suggest an Opportunity',
      eligibility: 'Eligibility Criteria',
      requiredDocuments: 'Required Documents',
      stepByStep: 'Step-by-Step Procedure',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
    },
    home: {
      kicker: 'Sindh Citizen Assistance Initiative · Expanding Across Pakistan',
      heroTitle: 'Clear, trusted guidance for education, jobs, and government services.',
      heroSubtitle:
        'RAASTA Pakistan helps students, families, and workers navigate scholarships, government jobs, NADRA & Sindh documents, everyday bills, and civic complaints in Urdu and English—without middlemen or confusion.',
      primaryCta: 'Browse Sindh Document Guides',
      secondaryCta: 'Explore Scholarships',
      quickStartTitle: 'What do you need help with today?',
      quickStartSubtitle: 'Simple starting points designed for every citizen.',
      quickCards: [
        {
          page: 'scholarships',
          title: 'Scholarships & Financial Aid',
          desc: 'Browse Sindh and Federal study grants with required document lists.',
        },
        {
          page: 'jobs',
          title: 'Government Jobs (SPSC / FPSC)',
          desc: 'Official portals, eligibility rules, and direct application links.',
        },
        {
          page: 'guides',
          title: 'CNIC, Domicile & Passport Guides',
          desc: 'Step-by-step checklists so you never miss a paper at the counter.',
        },
        {
          page: 'report',
          title: 'Report a Civic Problem',
          desc: 'Log water, road, sanitation, or utility issues with a tracking code.',
        },
      ],
      featuredTitle: 'Featured Guidance & Opportunities',
      featuredSubtitle: 'Starting in Sindh with verified official government links.',
      viewAll: 'View All',
      expansionTitle: 'Designed for Every Province in Pakistan',
      expansionSubtitle:
        'Starting with a complete Sindh-first pilot in Karachi, Hyderabad, Sukkur, Larkana, and Mirpurkhas before rolling out nationwide.',
      expansionStages: [
        {
          region: 'Phase 1 · Sindh & Federal',
          status: 'Active MVP',
          detail: 'SPSC, Sindh HEC, SEEF, Sindh TEVTA, Sindh Domicile/PRC, and DLS guidance.',
        },
        {
          region: 'Phase 2 · Punjab & Islamabad',
          status: 'Structured Schema Ready',
          detail: 'PPSC, PEEF, Punjab e-Khidmat, and regional university portals.',
        },
        {
          region: 'Phase 3 · KP & Balochistan',
          status: 'Planned Expansion',
          detail: 'KPPSC, BPSC, district civic reporting, and Pashto/Balochi language support.',
        },
      ],
    },
    opportunities: {
      titles: {
        scholarships: 'Scholarships & Study Grants',
        jobs: 'Government Jobs',
        internships: 'Internships & Youth Tracks',
        courses: 'Free Skill & Vocational Courses',
      },
      subtitles: {
        scholarships:
          'Verified financial aid pathways for Matric, Intermediate, and University students.',
        jobs: 'Official provincial and federal recruitment portals with clear qualification criteria.',
        internships: 'Public-sector and industry training opportunities for students and graduates.',
        courses: 'Free government-backed digital and technical courses across Pakistan.',
      },
      educationFilter: 'Education Level',
      statusFilter: 'Listing Status',
      suggestTitle: 'Suggest an Official Opportunity',
      suggestSubtitle:
        'Submissions enter the Admin verification queue before appearing publicly.',
      suggestSuccess: 'Thank you. Your suggestion has been queued for Admin source verification.',
    },
    guides: {
      title: 'Government Document Guides',
      subtitle:
        'Plain-language checklists for essential citizen documents. Tick off each document as you gather it.',
      checklistHelp: 'Tap each item below as you prepare your file:',
      checklistProgress: 'Documents ready',
      feeNoteLabel: 'Official Fee & Verification Note',
      selectGuide: 'Select a Document Guide',
    },
    calculators: {
      title: 'Daily Life Calculators',
      subtitle:
        'Practical calculators for Pakistani households, salaried workers, and students.',
      disclaimer:
        'Estimates only: Utility surcharges, FPA, and Finance Act slabs update periodically. Always verify final amounts on your official bill, FBR IRIS, or university portal.',
      tabs: {
        electricity: 'Electricity Bill (DEMO)',
        tax: 'Salary Tax (DEMO)',
        zakat: 'Zakat Calculator',
        merit: 'University Merit',
      },
    },
    report: {
      title: 'Report a Public Problem',
      subtitle:
        'Log local water, road, electricity, sanitation, school, or government office service issues. Receive a tracking code immediately.',
      formTitle: 'Submit a Civic Issue',
      trackerTitle: 'Public Problem Status Tracker',
      trackerSubtitle:
        'Personal phone/name details are kept private and visible only to verified administrators.',
      searchRefPlaceholder: 'Search by Reference ID (e.g. RST-SND-1042) or district...',
      submitSuccess: 'Your report has been logged. Save your Reference Code:',
      privacyNote: 'Your contact details are never displayed publicly on the tracker.',
      statuses: {
        submitted: 'Submitted',
        under_review: 'Under Review',
        forwarded: 'Forwarded to Dept',
        resolved: 'Resolved',
      },
    },
    about: {
      title: 'About RAASTA Pakistan & Contact',
      subtitle:
        'Building clear, honest civic access for ordinary Pakistani citizens—starting in Sindh.',
      missionTitle: 'Our Mission',
      missionBody:
        'Millions of Pakistani families struggle not because programs do not exist, but because official information is scattered across complicated PDFs, unverified social media posts, and costly middlemen. RAASTA Pakistan organizes education, employment, document procedures, and civic reporting into one bilingual, zero-jargon platform.',
      standardsTitle: 'Verification & Honesty Standards',
      standardsItems: [
        'We never charge fees or process government payments inside RAASTA.',
        'All external links point directly to official government or institutional portals.',
        'Sample records in this MVP are clearly marked DEMO so citizens are never misled.',
        'Every listing includes verified official dates and clear source attribution.',
      ],
      helplinesTitle: 'Important Pakistani Citizen Helplines',
      contactTitle: 'Send Feedback or Report Incorrect Information',
      contactSuccess: 'Message received. Our editorial team will review your feedback.',
    },
    admin: {
      title: 'RAASTA Admin Dashboard',
      subtitle:
        'Manage listings, verify official government sources, review citizen suggestions, mark expired items, and triage reported civic issues.',
      setupTitle: 'First-Run Admin Setup',
      setupDesc:
        'Set an administrator password to protect listing verification and citizen complaint triage. Once set, this setup locks automatically.',
      loginTitle: 'Administrator Sign In',
      loginDesc: 'Enter the admin password to manage RAASTA Pakistan records.',
      signOut: 'Sign Out',
    },
    updates: {
      title: 'RAASTA National Update Engine',
      subtitle:
        'Verified updates discovered from official Pakistani portals—classified into clear citizen categories in English, Urdu, and Roman Urdu.',
      lastSynced: 'Last Sync',
      monitoredCount: 'Sources Monitored',
      deadlineFilterLabel: 'Deadline Filter',
      deadlineFilters: {
        all: 'All Dates',
        active: 'Active Only',
        closing_soon: 'Closing in 7 Days',
        rolling: 'Rolling / Open',
        expired: 'Expired',
      },
      categories: {
        all: 'All Categories',
        gov_jobs: 'Latest Government Jobs',
        scholarships: 'Scholarships',
        free_courses: 'Free Courses',
        gov_schemes: 'Government Schemes',
        nadra_updates: 'NADRA Updates',
        police_recruitment: 'Police Recruitment',
        armed_forces: 'Army, Navy & Air Force',
        university_admissions: 'University Admissions',
        public_announcements: 'Public Announcements',
        citizen_services: 'Citizen Services',
      },
      publishedDate: 'Published',
      discoveredDate: 'Discovered',
      feeLabel: 'Fee Information',
      romanUrduLabel: 'Simple Roman Urdu Explanation',
      englishSummaryLabel: 'English Summary',
      urduSummaryLabel: 'Urdu Summary',
      notificationsTitle: 'Citizen Update Alerts',
      notificationsSubtitle:
        'Select your province and categories to track matching jobs, scholarships, training, and public service alerts—no CNIC or sign-up required.',
      saveAlerts: 'Save Alert Preferences',
      alertsSaved: 'Preferences saved. Showing matched official alerts below.',
      matchingAlertsTitle: 'Matched Active Alerts',
      noAlerts: 'No active alerts match your current province and category filters.',
      homeSectionTitle: 'Latest National Updates',
      homeSectionSubtitle: 'Verified official announcements synced from federal and provincial portals.',
    },
    footer: {
      mission: 'RAASTA Pakistan · Clear public guidance for every citizen.',
      demoNote: 'MVP includes clearly labelled DEMO records. Always confirm live dates on .gov.pk portals.',
      sindhFocus: 'Starting in Sindh · Designed for All Pakistan',
    },
  },
  ur: {
    brand: 'راستہ پاکستان',
    nav: {
      home: 'صفحہ اول',
      updates: 'قومی اپ ڈیٹس',
      scholarships: 'اسکالرشپ',
      jobs: 'سرکاری ملازمتیں',
      internships: 'انٹرن شپ',
      courses: 'مفت کورسز',
      guides: 'دستاویزات کی رہنمائی',
      calculators: 'روزمرہ کیلکولیٹر',
      report: 'مسئلہ درج کریں',
      about: 'تعارف اور رابطہ',
      admin: 'ایڈمن پینل',
    },
    topBar: {
      primaryAction: 'مسئلہ درج کریں',
      menu: 'مینیو',
      close: 'بند کریں',
    },
    theme: {
      label: 'تھیم',
      light: 'لائٹ',
      dark: 'ڈارک',
    },
    provinceLabel: 'علاقائی انتخاب',
    provinces: {
      All: 'پورا پاکستان',
      Sindh: 'سندھ (فعال مرحلہ)',
      Federal: 'وفاقی / اسلام آباد',
      Punjab: 'پنجاب (آئندہ)',
      'Khyber Pakhtunkhwa': 'خیبر پختونخوا (آئندہ)',
      Balochistan: 'بلوچستان (آئندہ)',
    },
    demoBanner:
      'ایم وی پی ڈیمو نوٹ: نیچے دی گئی مثالی معلومات ڈیمو (DEMO) کے طور پر درج ہیں۔ حتمی تاریخوں اور فیس کے لیے ہمیشہ سرکاری ویب سائٹ دیکھیں۔',
    common: {
      searchPlaceholder: 'عنوان، محکمہ، شہر یا لفظ تلاش کریں...',
      all: 'تمام',
      active: 'فعال',
      expired: 'میعاد ختم',
      pending: 'تصدیق کے انتظار میں',
      verifiedSource: 'سرکاری ویب سائٹ تصدیق شدہ',
      unverifiedSource: 'تصدیق زیرِ التواء',
      lastVerified: 'آخری تصدیق',
      deadline: 'آخری تاریخ',
      officialWebsite: 'سرکاری ویب سائٹ کھولیں',
      viewDetails: 'مکمل تفصیل دیکھیں',
      close: 'بند کریں',
      loading: 'معلومات لوڈ ہو رہی ہیں...',
      retry: 'دوبارہ کوشش کریں',
      emptyTitle: 'کوئی متعلقہ ریکارڈ نہیں ملا',
      emptySubtitle: 'تلاش کے الفاظ یا صوبے کا فلٹر تبدیل کر کے دیکھیں۔',
      resetFilters: 'فلٹر صاف کریں',
      submit: 'جمع کرائیں',
      submitting: 'جمع ہو رہا ہے...',
      demoTag: 'ڈیمو',
      suggestListing: 'نیا موقع تجویز کریں',
      eligibility: 'اہلیت کے معیار',
      requiredDocuments: 'ضروری دستاویزات',
      stepByStep: 'مرحلہ وار طریقہ کار',
      save: 'محفوظ کریں',
      cancel: 'منسوخ کریں',
      delete: 'حذف کریں',
      edit: 'ترمیم کریں',
    },
    home: {
      kicker: 'سندھ عوامی رہنمائی اقدام · پورے پاکستان کے لیے توسیع',
      heroTitle: 'تعلیم، روزگار اور سرکاری خدمات کے لیے آسان اور مستند رہنمائی۔',
      heroSubtitle:
        'راستہ پاکستان عام شہریوں اور طلبہ کو اسکالرشپ، سرکاری ملازمتوں، نادرا و سندھ دستاویزات، روزمرہ حساب کتاب اور عوامی مسائل درج کرنے میں اردو اور انگریزی میں مدد دیتا ہے۔',
      primaryCta: 'سندھ دستاویزات گائیڈ دیکھیں',
      secondaryCta: 'اسکالرشپ دیکھیں',
      quickStartTitle: 'آج آپ کو کس چیز میں مدد چاہیے؟',
      quickStartSubtitle: 'ہر شہری کے لیے آسان اور سیدھے راستے۔',
      quickCards: [
        {
          page: 'scholarships',
          title: 'اسکالرشپ اور تعلیمی وظائف',
          desc: 'سندھ اور وفاقی تعلیمی امداد اور ضروری کاغذات کی فہرست۔',
        },
        {
          page: 'jobs',
          title: 'سرکاری ملازمتیں (SPSC / FPSC)',
          desc: 'سرکاری پورٹلز، اہلیت اور براہِ راست درخواست کے لنکس۔',
        },
        {
          page: 'guides',
          title: 'شناختی کارڈ، ڈومیسائل اور پاسپورٹ',
          desc: 'مرحلہ وار چیک لسٹ تاکہ کوئی ضروری کاغذ رہ نہ جائے۔',
        },
        {
          page: 'report',
          title: 'عوامی مسئلہ درج کریں',
          desc: 'پانی، سڑک، صفائی یا بجلی کا مسئلہ ٹریکنگ کوڈ کے ساتھ درج کریں۔',
        },
      ],
      featuredTitle: 'نمایاں رہنمائی اور مواقع',
      featuredSubtitle: 'سندھ سے آغاز، تصدیق شدہ سرکاری ویب سائٹس کے لنکس کے ساتھ۔',
      viewAll: 'سب دیکھیں',
      expansionTitle: 'پاکستان کے ہر صوبے کے لیے ڈیزائن کیا گیا',
      expansionSubtitle:
        'کراچی، حیدرآباد، سکھر، لاڑکانہ اور میرپورخاص میں سندھ پائلٹ کے بعد ملک بھر میں توسیع۔',
      expansionStages: [
        {
          region: 'مرحلہ 1 · سندھ اور وفاق',
          status: 'فعال ایم وی پی',
          detail: 'SPSC، سندھ HEC، SEEF، سندھ ٹیوٹا، ڈومیسائل/پی آر سی اور ڈرائیونگ لائسنس۔',
        },
        {
          region: 'مرحلہ 2 · پنجاب اور اسلام آباد',
          status: 'سسٹم تیار',
          detail: 'PPSC، PEEF، پنجاب ای خدمت اور وفاقی جامعات کے پورٹلز۔',
        },
        {
          region: 'مرحلہ 3 · خیبر پختونخوا اور بلوچستان',
          status: 'منصوبہ بندی',
          detail: 'KPPSC، BPSC، ضلعی شکایات اور پشتو/بلوچی زبان کی سہولت۔',
        },
      ],
    },
    opportunities: {
      titles: {
        scholarships: 'اسکالرشپ اور تعلیمی وظائف',
        jobs: 'سرکاری ملازمتیں',
        internships: 'انٹرن شپ اور تربیتی مواقع',
        courses: 'مفت ہنر اور فنی کورسز',
      },
      subtitles: {
        scholarships: 'میٹرک، انٹرمیڈیٹ اور یونیورسٹی کے طلبہ کے لیے مالی امداد کے راستے۔',
        jobs: 'صوبائی اور وفاقی سرکاری بھرتیوں کے سرکاری پورٹلز اور اہلیت کی تفصیل۔',
        internships: 'طلبہ اور نئے گریجویٹس کے لیے سرکاری اور صنعتی تربیت کے مواقع۔',
        courses: 'پاکستان بھر میں مفت ڈیجیٹل اور فنی تربیتی کورسز۔',
      },
      educationFilter: 'تعلیمی قابلیت',
      statusFilter: 'موجودہ صورتحال',
      suggestTitle: 'نیا سرکاری موقع تجویز کریں',
      suggestSubtitle: 'آپ کی بھیجی گئی معلومات ایڈمن کی تصدیق کے بعد شائع ہوں گی۔',
      suggestSuccess: 'شکریہ! آپ کی تجویز ایڈمن کی تصدیق کے لیے محفوظ کر لی گئی ہے۔',
    },
    guides: {
      title: 'سرکاری دستاویزات کی رہنمائی',
      subtitle:
        'اہم سرکاری کاغذات بنوانے کی آسان چیک لسٹ۔ جو کاغذ تیار ہو اس پر نشان لگائیں۔',
      checklistHelp: 'اپنے تیار کاغذات پر نشان لگاتے جائیں:',
      checklistProgress: 'تیار دستاویزات',
      feeNoteLabel: 'سرکاری فیس اور تصدیق کی ہدایت',
      selectGuide: 'دستاویز منتخب کریں',
    },
    calculators: {
      title: 'روزمرہ زندگی کے کیلکولیٹر',
      subtitle: 'بجلی کے بل، تنخواہ پر ٹیکس، زکوٰۃ اور یونیورسٹی میرٹ کا آسان حساب۔',
      disclaimer:
        'یہ صرف اندازہ ہے۔ حتمی رقم کے لیے ہمیشہ اپنا سرکاری بل، FBR پورٹل یا یونیورسٹی میرٹ پالیسی دیکھیں۔',
      tabs: {
        electricity: 'بجلی بل اندازہ (ڈیمو)',
        tax: 'تنخواہ ٹیکس (ڈیمو)',
        zakat: 'زکوٰۃ کیلکولیٹر',
        merit: 'یونیورسٹی میرٹ',
      },
    },
    report: {
      title: 'عوامی مسئلہ درج کریں',
      subtitle:
        'پانی، گلی سڑک، بجلی، صفائی، اسکول یا سرکاری دفتر کا مسئلہ درج کریں اور ٹریکنگ کوڈ حاصل کریں۔',
      formTitle: 'نئی شکایت درج کریں',
      trackerTitle: 'درج شدہ مسائل کی صورتحال',
      trackerSubtitle: 'آپ کا نام اور فون نمبر عوامی فہرست میں ظاہر نہیں کیا جاتا۔',
      searchRefPlaceholder: 'ریفرنس کوڈ (مثلاً RST-SND-1042) یا ضلع لکھیں...',
      submitSuccess: 'آپ کی شکایت درج ہو گئی ہے۔ اپنا ریفرنس کوڈ محفوظ کر لیں:',
      privacyNote: 'آپ کی ذاتی رابطہ معلومات عوامی ٹریکر پر خفیہ رکھی جاتی ہیں۔',
      statuses: {
        submitted: 'درج ہو گئی',
        under_review: 'زیرِ غور',
        forwarded: 'محکمے کو ارسال',
        resolved: 'حل ہو گئی',
      },
    },
    about: {
      title: 'راستہ پاکستان کا تعارف اور رابطہ',
      subtitle: 'سندھ سے شروع ہونے والا عام پاکستانی شہریوں کی رہنمائی کا شفاف پلیٹ فارم۔',
      missionTitle: 'ہمارا مقصد',
      missionBody:
        'پاکستان میں لاکھوں خاندان صرف اس لیے سرکاری سہولیات سے محروم رہ جاتے ہیں کیونکہ درست معلومات بکھری ہوئی اور مشکل زبان میں ہوتی ہیں۔ راستہ پاکستان تعلیم، روزگار، دستاویزات اور عوامی مسائل کو ایک آسان، دو لسانی پلیٹ فارم پر یکجا کرتا ہے۔',
      standardsTitle: 'تصدیق اور دیانت داری کے اصول',
      standardsItems: [
        'ہم کسی سرکاری خدمت کی کوئی فیس نہیں لیتے اور نہ ہی ادائیگی کا کوئی جعلی نظام چلاتے ہیں۔',
        'ہر موقع کے ساتھ براہِ راست سرکاری ویب سائٹ کا لنک دیا جاتا ہے۔',
        'اس ایم وی پی میں مثالی ڈیٹا واضح طور پر ڈیمو (DEMO) کے طور پر درج ہے۔',
        'ہر ریکارڈ کے ساتھ تصدیق شدہ سرکاری تاریخ اور اصل لنک شامل کیا جاتا ہے۔',
      ],
      helplinesTitle: 'اہم پاکستانی ہیلپ لائن نمبرز',
      contactTitle: 'رائے دیں یا غلط معلومات کی نشاندہی کریں',
      contactSuccess: 'آپ کا پیغام موصول ہو گیا ہے۔ ہماری ٹیم جلد جائزہ لے گی۔',
    },
    admin: {
      title: 'راستہ ایڈمن ڈیش بورڈ',
      subtitle:
        'اسکالرشپ اور ملازمتیں شامل کریں، سرکاری ذرائع کی تصدیق کریں، اور شہریوں کے مسائل کا جائزہ لیں۔',
      setupTitle: 'ایڈمن پاسورڈ سیٹ اپ',
      setupDesc:
        'ایڈمن ڈیش بورڈ کو محفوظ بنانے کے لیے پہلی بار پاسورڈ مقرر کریں۔',
      loginTitle: 'ایڈمن لاگ اِن',
      loginDesc: 'ریکارڈز میں ترمیم کے لیے ایڈمن پاسورڈ درج کریں۔',
      signOut: 'لاگ آؤٹ',
    },
    updates: {
      title: 'راستہ نیشنل اپ ڈیٹ انجن',
      subtitle:
        'پاکستان کے سرکاری پورٹلز سے حاصل کردہ مستند اعلانات — انگریزی، اردو اور آسان رومن اردو میں۔',
      lastSynced: 'آخری سنک',
      monitoredCount: 'زیرِ نگرانی ذرائع',
      deadlineFilterLabel: 'آخری تاریخ فلٹر',
      deadlineFilters: {
        all: 'تمام تاریخیں',
        active: 'صرف فعال',
        closing_soon: '7 دن میں ختم ہونے والی',
        rolling: 'مسلسل / جاری',
        expired: 'میعاد ختم',
      },
      categories: {
        all: 'تمام زمرے',
        gov_jobs: 'تازہ سرکاری ملازمتیں',
        scholarships: 'اسکالرشپ',
        free_courses: 'مفت کورسز',
        gov_schemes: 'سرکاری اسکیمیں',
        nadra_updates: 'نادرا اپ ڈیٹس',
        police_recruitment: 'پولیس بھرتی',
        armed_forces: 'آرمی، نیوی اور ایئر فورس',
        university_admissions: 'یونیورسٹی داخلے',
        public_announcements: 'عوامی اعلانات',
        citizen_services: 'شہری خدمات',
      },
      publishedDate: 'اصل اشاعت',
      discoveredDate: 'دریافت',
      feeLabel: 'فیس کی تفصیل',
      romanUrduLabel: 'آسان رومن اردو وضاحت',
      englishSummaryLabel: 'انگریزی خلاصہ',
      urduSummaryLabel: 'اردو خلاصہ',
      notificationsTitle: 'شہری اپ ڈیٹ الرٹس',
      notificationsSubtitle:
        'اپنے صوبے اور پسندیدہ شعبوں کا انتخاب کریں تاکہ نئی سرکاری ملازمتوں، اسکالرشپس اور مفت تربیت کے الرٹس دیکھ سکیں۔ شناختی کارڈ یا لاگ اِن کی ضرورت نہیں۔',
      saveAlerts: 'الرٹ ترجیحات محفوظ کریں',
      alertsSaved: 'ترجیحات محفوظ ہو گئیں۔ متعلقہ مستند الرٹس نیچے دکھائے جا رہے ہیں۔',
      matchingAlertsTitle: 'آپ کے منتخب کردہ فعال الرٹس',
      noAlerts: 'آپ کے منتخب صوبے اور زمروں کے مطابق کوئی فعال الرٹ موجود نہیں۔',
      homeSectionTitle: 'تازہ ترین قومی اپ ڈیٹس',
      homeSectionSubtitle: 'وفاقی اور صوبائی سرکاری پورٹلز سے تصدیق شدہ اعلانات۔',
    },
    footer: {
      mission: 'راستہ پاکستان · ہر شہری کے لیے آسان اور مستند رہنمائی۔',
      demoNote: 'ایم وی پی میں مثالی ریکارڈز ڈیمو (DEMO) کے طور پر شامل ہیں۔',
      sindhFocus: 'سندھ سے آغاز · پورے پاکستان کے لیے',
    },
  },
};
