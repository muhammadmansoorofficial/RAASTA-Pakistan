import { useCallback, useEffect, useState } from 'react';
import type {
  DocumentGuide,
  Language,
  NationalUpdate,
  Opportunity,
  PageId,
  Province,
  PublicProblemSummary,
  ThemeMode,
  UpdateCategory,
} from './types';
import { TRANSLATIONS } from './i18n/translations';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { UpdatesPage } from './components/UpdatesPage';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { DocumentGuidesPage } from './components/DocumentGuidesPage';
import { CalculatorsPage } from './components/CalculatorsPage';
import { ReportProblemPage } from './components/ReportProblemPage';
import { AboutContactPage } from './components/AboutContactPage';
import { AdminDashboardPage } from './components/AdminDashboardPage';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('raasta-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'light';
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activePage, setActivePage] = useState<PageId>('home');
  const [province, setProvince] = useState<Province>('All');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [guides, setGuides] = useState<DocumentGuide[]>([]);
  const [problems, setProblems] = useState<PublicProblemSummary[]>([]);
  const [nationalUpdates, setNationalUpdates] = useState<NationalUpdate[]>([]);
  const [updateCategoryFilter, setUpdateCategoryFilter] = useState<UpdateCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  // Sync HTML lang and dir attributes for Urdu RTL support
  useEffect(() => {
    document.documentElement.lang = language === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  // Sync HTML .dark class and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('raasta-theme', theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const fetchPublicData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oppRes, guideRes, probRes, updRes] = await Promise.all([
        fetch('/api/opportunities'),
        fetch('/api/guides'),
        fetch('/api/problems'),
        fetch('/api/updates'),
      ]);

      if (!oppRes.ok || !guideRes.ok || !probRes.ok) {
        throw new Error('Failed to load RAASTA Pakistan public records.');
      }

      const [oppJson, guideJson, probJson, updJson] = await Promise.all([
        oppRes.json() as Promise<{ items: Opportunity[] }>,
        guideRes.json() as Promise<{ items: DocumentGuide[] }>,
        probRes.json() as Promise<{ items: PublicProblemSummary[] }>,
        updRes.ok
          ? (updRes.json() as Promise<{ items: NationalUpdate[] }>)
          : Promise.resolve({ items: [] }),
      ]);

      setOpportunities(oppJson.items ?? []);
      setGuides(guideJson.items ?? []);
      setProblems(probJson.items ?? []);
      setNationalUpdates(updJson.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPublicData();
  }, [fetchPublicData]);

  const handleProblemCreated = (created: PublicProblemSummary) => {
    setProblems((prev) => [created, ...prev]);
  };

  const handleOpenUpdateCategory = (cat: UpdateCategory | 'all') => {
    setUpdateCategoryFilter(cat);
    setActivePage('updates');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout
      language={language}
      onLanguageChange={setLanguage}
      theme={theme}
      onThemeChange={setTheme}
      activePage={activePage}
      onNavigate={setActivePage}
      province={province}
      onProvinceChange={setProvince}
      t={t}
    >
      {activePage === 'home' && (
        <HomePage
          language={language}
          t={t}
          opportunities={opportunities}
          guides={guides}
          nationalUpdates={nationalUpdates}
          onNavigate={setActivePage}
          onOpenUpdateCategory={handleOpenUpdateCategory}
        />
      )}

      {activePage === 'updates' && (
        <UpdatesPage
          language={language}
          t={t}
          province={province}
          onProvinceChange={setProvince}
          initialCategory={updateCategoryFilter}
        />
      )}

      {(activePage === 'scholarships' ||
        activePage === 'jobs' ||
        activePage === 'internships' ||
        activePage === 'courses') && (
        <OpportunitiesPage
          category={
            activePage === 'scholarships'
              ? 'scholarship'
              : activePage === 'jobs'
                ? 'job'
                : activePage === 'internships'
                  ? 'internship'
                  : 'course'
          }
          language={language}
          t={t}
          province={province}
          opportunities={opportunities}
          loading={loading}
          error={error}
          onRetry={() => void fetchPublicData()}
        />
      )}

      {activePage === 'guides' && (
        <DocumentGuidesPage
          language={language}
          t={t}
          guides={
            province === 'All'
              ? guides
              : guides.filter((g) => g.province === province || g.province === 'Federal')
          }
          loading={loading}
          error={error}
          onRetry={() => void fetchPublicData()}
        />
      )}

      {activePage === 'calculators' && <CalculatorsPage language={language} t={t} />}

      {activePage === 'report' && (
        <ReportProblemPage
          language={language}
          t={t}
          problems={problems}
          loading={loading}
          onProblemCreated={handleProblemCreated}
        />
      )}

      {activePage === 'about' && <AboutContactPage language={language} t={t} />}

      {activePage === 'admin' && (
        <AdminDashboardPage
          language={language}
          t={t}
          onDataChanged={() => void fetchPublicData()}
        />
      )}
    </Layout>
  );
}
