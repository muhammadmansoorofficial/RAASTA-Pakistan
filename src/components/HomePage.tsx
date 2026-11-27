import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import type {
  DocumentGuide,
  Language,
  NationalUpdate,
  Opportunity,
  PageId,
  UpdateCategory,
} from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface HomePageProps {
  language: Language;
  t: TranslationBundle;
  opportunities: Opportunity[];
  guides: DocumentGuide[];
  nationalUpdates: NationalUpdate[];
  onNavigate: (page: PageId) => void;
  onOpenUpdateCategory: (category: UpdateCategory | 'all') => void;
}

const HOME_UPDATE_SECTIONS: UpdateCategory[] = [
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

export const HomePage: React.FC<HomePageProps> = ({
  language,
  t,
  opportunities,
  guides,
  nationalUpdates,
  onNavigate,
  onOpenUpdateCategory,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [studentImgFailed, setStudentImgFailed] = useState(false);
  const ArrowIcon = language === 'ur' ? ArrowLeft : ArrowRight;

  const activeOpportunities = opportunities.filter((o) => o.status === 'active').slice(0, 4);
  const topGuides = guides.slice(0, 3);
  const latestApprovedUpdates = nationalUpdates
    .filter((u) => u.status === 'auto_published' || u.status === 'approved')
    .slice(0, 6);

  const quickIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    scholarships: GraduationCap,
    jobs: Briefcase,
    guides: FileCheck2,
    report: TriangleAlert,
  };

  return (
    <div className="space-y-12">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">{t.home.kicker}</p>
          <h1
            className="font-bold tracking-tight text-slate-900 dark:text-white"
            style={{ fontSize: 'clamp(1.85rem, 3.4vw, 2.85rem)', textWrap: 'balance' }}
          >
            {t.home.heroTitle}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {t.home.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('guides')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.home.primaryCta}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('scholarships')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.home.secondaryCta}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="h-64 lg:h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 relative">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/hero_pakistan_civic_1795725311710.jpg"
                alt="Pakistani citizens and students accessing civic guidance kiosks in a modern resource center"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6 text-center text-white">
                <MapPin className="w-10 h-10 text-emerald-300 mb-3" />
                <p className="text-base font-semibold">{t.brand}</p>
                <p className="text-xs text-slate-300 mt-1">{t.footer.sindhFocus}</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-4 text-white">
              <p className="text-xs font-medium text-emerald-200">
                {language === 'ur' ? 'سندھ پائلٹ · مفت عوامی رہنمائی' : 'Sindh Citizen Pilot · Free Public Guidance'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Quick-Start Strip (Full-width row below hero split) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.home.quickStartTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t.home.quickStartSubtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => onNavigate('calculators')}
              className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t.nav.calculators}</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.nav.courses}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.home.quickCards.map((card) => {
            const Icon = quickIcons[card.page] || GraduationCap;
            return (
              <button
                key={card.page}
                type="button"
                onClick={() => onNavigate(card.page)}
                className="text-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-700 dark:hover:border-emerald-500 rounded-xl p-5 transition-colors flex flex-col justify-between gap-4 cursor-pointer group focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  <span>{t.common.viewDetails}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Opportunities + Document Guides Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active Sample Opportunities */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.home.featuredTitle}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.home.featuredSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('scholarships')}
              className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.home.viewAll}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {activeOpportunities.map((item) => {
              const targetPage: PageId =
                item.category === 'scholarship'
                  ? 'scholarships'
                  : item.category === 'job'
                    ? 'jobs'
                    : item.category === 'internship'
                      ? 'internships'
                      : 'courses';
              return (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {item.isDemo && (
                        <>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-400 uppercase">
                            {t.common.demoTag}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>{t.provinces[item.province]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {t.common.deadline}: {item.deadline}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ur' ? item.titleUr : item.titleEn}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {language === 'ur' ? item.organizationUr : item.organizationEn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(targetPage)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      {t.common.viewDetails}
                    </button>
                    <a
                      href={item.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.common.officialWebsite}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Document Guides Highlight + Student Image */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
              {!studentImgFailed ? (
                <img
                  src="/src/assets/images/scholarships_sindh_students_1795725312407.jpg"
                  alt="University students in Sindh studying together with laptops and textbooks"
                  referrerPolicy="no-referrer"
                  onError={() => setStudentImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-emerald-900 flex items-center justify-center text-white">
                  <GraduationCap className="w-10 h-10 text-emerald-200" />
                </div>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.nav.guides}</h3>
                <button
                  type="button"
                  onClick={() => onNavigate('guides')}
                  className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {t.home.viewAll}
                </button>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {topGuides.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onNavigate('guides')}
                    className="w-full py-3 text-start flex items-center justify-between gap-3 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {language === 'ur' ? g.titleUr : g.titleEn}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {language === 'ur' ? g.authorityUr : g.authorityEn}
                      </p>
                    </div>
                    <ArrowIcon className="w-4 h-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RAASTA National Update Engine: Latest Approved Updates & 10 Sections */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.updates.homeSectionTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.updates.homeSectionSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenUpdateCategory('all')}
            className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.home.viewAll}
          </button>
        </div>

        {/* 10 Official Update Categories Quick Strip */}
        <div className="flex flex-wrap gap-2">
          {HOME_UPDATE_SECTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onOpenUpdateCategory(cat)}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-700 dark:hover:border-emerald-500 rounded-lg transition-colors cursor-pointer"
            >
              {t.updates.categories[cat]}
            </button>
          ))}
        </div>

        {latestApprovedUpdates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestApprovedUpdates.map((upd) => (
              <div
                key={upd.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                      {t.updates.categories[upd.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.provinces[upd.province]}</span>
                    {upd.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {t.common.demoTag}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {language === 'ur' ? upd.titleUr : upd.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {language === 'ur' ? upd.summaryUr : upd.summaryEn}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.common.deadline}: <strong className="text-slate-800 dark:text-slate-200">{upd.deadline}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenUpdateCategory(upd.category)}
                      className="text-emerald-800 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      {t.common.viewDetails}
                    </button>
                    <a
                      href={upd.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.common.officialWebsite}
                      className="text-slate-500 hover:text-emerald-800 dark:hover:text-emerald-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sindh-First Expansion Roadmap */}
      <section className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white rounded-xl p-6 sm:p-8 space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold">{t.home.expansionTitle}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{t.home.expansionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {t.home.expansionStages.map((stage) => (
            <div
              key={stage.region}
              className="bg-slate-800/70 border border-slate-700 rounded-lg p-5 space-y-2"
            >
              <p className="text-xs font-medium text-emerald-300">{stage.status}</p>
              <h3 className="text-base font-bold text-white">{stage.region}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{stage.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
