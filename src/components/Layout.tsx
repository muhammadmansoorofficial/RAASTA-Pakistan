import React, { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Calculator,
  FileCheck2,
  GraduationCap,
  Home,
  Info,
  Languages,
  MapPin,
  Menu,
  Moon,
  Radio,
  ShieldCheck,
  Sun,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react';
import type { Language, PageId, Province, ThemeMode } from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface LayoutProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  province: Province;
  onProvinceChange: (province: Province) => void;
  t: TranslationBundle;
  children: React.ReactNode;
}

const PAGE_ICONS: Record<PageId, React.ComponentType<{ className?: string }>> = {
  home: Home,
  updates: Radio,
  scholarships: GraduationCap,
  jobs: Briefcase,
  internships: Wrench,
  courses: BookOpen,
  guides: FileCheck2,
  calculators: Calculator,
  report: TriangleAlert,
  about: Info,
  admin: ShieldCheck,
};

const ALL_PUBLIC_PAGES: PageId[] = [
  'home',
  'updates',
  'scholarships',
  'jobs',
  'internships',
  'courses',
  'guides',
  'calculators',
  'report',
  'about',
];

const TOP_NAV_PAGES: PageId[] = ['home', 'updates', 'scholarships', 'jobs', 'guides'];

export const Layout: React.FC<LayoutProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  activePage,
  onNavigate,
  province,
  onProvinceChange,
  t,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 zones separated by gap-8 (Wordmark — 5 nav links — 1 primary CTA) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark (plus mobile menu button on small screens) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? t.topBar.close : t.topBar.menu}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.brand}
            </button>
          </div>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {TOP_NAV_PAGES.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handleNav(page)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  activePage === page
                    ? 'border-emerald-700 dark:border-emerald-400 text-emerald-800 dark:text-emerald-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {t.nav[page]}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary CTA button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleNav('report')}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {t.topBar.primaryAction}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-slate-900/50 backdrop-blur-xs">
          <aside className="w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 p-4 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-4">
              {/* Language Switcher inside drawer */}
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('ur')}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    language === 'ur'
                      ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  اردو
                </button>
              </div>

              {/* Theme Switcher inside drawer */}
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{t.theme.light}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-950 text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{t.theme.dark}</span>
                </button>
              </div>

              {/* Province selector */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                  {t.provinceLabel}
                </label>
                <select
                  value={province}
                  onChange={(e) => onProvinceChange(e.target.value as Province)}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-emerald-700"
                >
                  <option value="All">{t.provinces.All}</option>
                  <option value="Sindh">{t.provinces.Sindh}</option>
                  <option value="Federal">{t.provinces.Federal}</option>
                  <option value="Punjab">{t.provinces.Punjab}</option>
                  <option value="Khyber Pakhtunkhwa">{t.provinces['Khyber Pakhtunkhwa']}</option>
                  <option value="Balochistan">{t.provinces.Balochistan}</option>
                </select>
              </div>

              <nav className="space-y-1">
                {ALL_PUBLIC_PAGES.map((page) => {
                  const Icon = PAGE_ICONS[page];
                  const isActive = activePage === page;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handleNav(page)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t.nav[page]}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => handleNav('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activePage === 'admin'
                    ? 'bg-slate-900 dark:bg-emerald-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{t.nav.admin}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Workspace Body: Persistent Desktop Sidebar + Main Viewport */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex">
        <aside className="hidden lg:flex w-[264px] shrink-0 flex-col justify-between bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="space-y-5">
            {/* Language Toggle */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
                <Languages className="w-3.5 h-3.5" />
                <span>{language === 'ur' ? 'زبان منتخب کریں' : 'Language'}</span>
              </div>
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('ur')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    language === 'ur'
                      ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  اردو (RTL)
                </button>
              </div>
            </div>

            {/* Light / Dark Theme Switch */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>{t.theme.label}</span>
              </div>
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{t.theme.light}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-950 text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{t.theme.dark}</span>
                </button>
              </div>
            </div>

            {/* Province Selector */}
            <div>
              <label
                htmlFor="desktop-province-select"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t.provinceLabel}</span>
              </label>
              <select
                id="desktop-province-select"
                value={province}
                onChange={(e) => onProvinceChange(e.target.value as Province)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-emerald-700"
              >
                <option value="All">{t.provinces.All}</option>
                <option value="Sindh">{t.provinces.Sindh}</option>
                <option value="Federal">{t.provinces.Federal}</option>
                <option value="Punjab">{t.provinces.Punjab}</option>
                <option value="Khyber Pakhtunkhwa">{t.provinces['Khyber Pakhtunkhwa']}</option>
                <option value="Balochistan">{t.provinces.Balochistan}</option>
              </select>
            </div>

            {/* All Public Citizen Pages */}
            <nav aria-label="Sidebar pages" className="space-y-1">
              {ALL_PUBLIC_PAGES.map((page) => {
                const Icon = PAGE_ICONS[page];
                const isActive = activePage === page;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handleNav(page)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{t.nav[page]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activePage === 'admin'
                  ? 'bg-slate-900 dark:bg-emerald-700 text-white font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.nav.admin}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Quick Language, Theme & Region Bar (non-sticky so mobile sticky height stays <= 15%) */}
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('ur')}
                  className={`px-2 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    language === 'ur'
                      ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  اردو
                </button>
              </div>

              <button
                type="button"
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? t.theme.light : t.theme.dark}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <select
              aria-label={t.provinceLabel}
              value={province}
              onChange={(e) => onProvinceChange(e.target.value as Province)}
              className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 max-w-[175px]"
            >
              <option value="All">{t.provinces.All}</option>
              <option value="Sindh">{t.provinces.Sindh}</option>
              <option value="Federal">{t.provinces.Federal}</option>
              <option value="Punjab">{t.provinces.Punjab}</option>
              <option value="Khyber Pakhtunkhwa">{t.provinces['Khyber Pakhtunkhwa']}</option>
              <option value="Balochistan">{t.provinces.Balochistan}</option>
            </select>
          </div>

          <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1140px] w-full mx-auto">
            {children}
          </div>

          {/* Quiet Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
            <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{t.footer.mission}</p>
                <p>{t.footer.demoNote}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span>{t.footer.sindhFocus}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => handleNav('about')}
                  className="hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline cursor-pointer"
                >
                  {t.nav.about}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline cursor-pointer"
                >
                  {t.nav.admin}
                </button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
