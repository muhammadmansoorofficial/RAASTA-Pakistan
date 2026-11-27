import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Edit3,
  ExternalLink,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ContactMessage,
  DocumentGuide,
  Language,
  ListingStatus,
  Opportunity,
  OpportunityCategory,
  ProblemReport,
  ProblemStatus,
  Province,
} from '../types';
import type { TranslationBundle } from '../i18n/translations';
import { AdminEnginePanel } from './AdminEnginePanel';

interface AdminDashboardPageProps {
  language: Language;
  t: TranslationBundle;
  onDataChanged: () => void;
}

type AdminTab = 'engine' | 'opportunities' | 'guides' | 'problems' | 'messages';

interface AdminStatusResponse {
  needsSetup: boolean;
  usesEnvPasscode: boolean;
  authenticated: boolean;
}

const EMPTY_FORM = {
  id: '',
  category: 'scholarship' as OpportunityCategory,
  titleEn: '',
  titleUr: '',
  organizationEn: '',
  organizationUr: '',
  province: 'Sindh' as Exclude<Province, 'All'>,
  cityOrScopeEn: 'Sindh',
  educationLevel: 'Undergraduate',
  deadline: '2026-12-31',
  stipendOrScopeEn: '',
  descriptionEn: '',
  eligibilityText: '',
  docsText: '',
  officialUrl: 'https://sindh.gov.pk/',
  verifiedSource: true,
  status: 'active' as ListingStatus,
  isDemo: false,
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  t,
  onDataChanged,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AdminStatusResponse | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState<AdminTab>('opportunities');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [guides, setGuides] = useState<DocumentGuide[]>([]);
  const [problems, setProblems] = useState<ProblemReport[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<'all' | ListingStatus>('all');
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideTitleEn, setGuideTitleEn] = useState('');
  const [guideAuthorityEn, setGuideAuthorityEn] = useState('');
  const [guideProvince, setGuideProvince] = useState<Exclude<Province, 'All'>>('Sindh');
  const [guideUrl, setGuideUrl] = useState('https://sindh.gov.pk/');
  const [guideSummary, setGuideSummary] = useState('');
  const [guideDocs, setGuideDocs] = useState('');
  const [guideSteps, setGuideSteps] = useState('');

  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});

  const checkStatus = useCallback(async (currentToken: string | null) => {
    setAuthLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentToken) headers.Authorization = `Bearer ${currentToken}`;
      const res = await fetch('/api/admin/status', { headers });
      const data = (await res.json()) as AdminStatusResponse;
      setAuthStatus(data);
    } catch {
      setAuthErr('Unable to verify admin status.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async (sessionToken: string) => {
    setDataLoading(true);
    setDataErr(null);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.status === 401) {
        setToken(null);
        return;
      }
      const data = (await res.json()) as {
        opportunities: Opportunity[];
        guides: DocumentGuide[];
        problems: ProblemReport[];
        contactMessages: ContactMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Failed to load admin overview.');
      setOpportunities(data.opportunities);
      setGuides(data.guides);
      setProblems(data.problems);
      setMessages(data.contactMessages);
    } catch (err) {
      setDataErr(err instanceof Error ? err.message : 'Error loading data.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus(token);
  }, [checkStatus, token]);

  useEffect(() => {
    if (token) {
      void loadOverview(token);
    }
  }, [token, loadOverview]);

  const handleFirstRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr(null);
    if (passwordInput.length < 8) {
      setAuthErr('Password must be at least 8 characters.');
      return;
    }
    if (passwordInput !== confirmInput) {
      setAuthErr('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error || 'Setup failed.');
      setPasswordInput('');
      setConfirmInput('');
      setToken(data.token);
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Setup error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error || 'Invalid password.');
      setPasswordInput('');
      setToken(data.token);
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Login failed.');
    }
  };

  const openCreateModal = () => {
    setFormErr(null);
    setFormState(EMPTY_FORM);
    setEditingModalOpen(true);
  };

  const openEditModal = (item: Opportunity) => {
    setFormErr(null);
    setFormState({
      id: item.id,
      category: item.category,
      titleEn: item.titleEn,
      titleUr: item.titleUr,
      organizationEn: item.organizationEn,
      organizationUr: item.organizationUr,
      province: item.province,
      cityOrScopeEn: item.cityOrScopeEn,
      educationLevel: item.educationLevel,
      deadline: item.deadline,
      stipendOrScopeEn: item.stipendOrScopeEn,
      descriptionEn: item.descriptionEn,
      eligibilityText: item.eligibilityEn.join('\n'),
      docsText: item.requiredDocsEn.join('\n'),
      officialUrl: item.officialUrl,
      verifiedSource: item.verifiedSource,
      status: item.status,
      isDemo: item.isDemo,
    });
    setEditingModalOpen(true);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingForm(true);
    setFormErr(null);

    const payload = {
      category: formState.category,
      titleEn: formState.titleEn,
      titleUr: formState.titleUr || formState.titleEn,
      organizationEn: formState.organizationEn,
      organizationUr: formState.organizationUr || formState.organizationEn,
      province: formState.province,
      cityOrScopeEn: formState.cityOrScopeEn,
      educationLevel: formState.educationLevel,
      deadline: formState.deadline,
      stipendOrScopeEn: formState.stipendOrScopeEn,
      descriptionEn: formState.descriptionEn,
      eligibilityEn: formState.eligibilityText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      requiredDocsEn: formState.docsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      officialUrl: formState.officialUrl,
      verifiedSource: formState.verifiedSource,
      status: formState.status,
      isDemo: formState.isDemo,
    };

    try {
      const isEdit = Boolean(formState.id);
      const url = isEdit
        ? `/api/admin/opportunities/${formState.id}`
        : '/api/admin/opportunities';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save listing.');
      setEditingModalOpen(false);
      await loadOverview(token);
      onDataChanged();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Save error');
    } finally {
      setSavingForm(false);
    }
  };

  const patchOpportunity = async (id: string, patch: Record<string, unknown>) => {
    if (!token) return;
    const res = await fetch(`/api/admin/opportunities/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadOverview(token);
      onDataChanged();
    }
  };

  const deleteOpportunity = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/opportunities/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadOverview(token);
      onDataChanged();
    }
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/admin/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titleEn: guideTitleEn,
        authorityEn: guideAuthorityEn,
        province: guideProvince,
        officialUrl: guideUrl,
        summaryEn: guideSummary,
        requiredDocsEn: guideDocs.split('\n').map((s) => s.trim()).filter(Boolean),
        stepsEn: guideSteps.split('\n').map((s) => s.trim()).filter(Boolean),
        verifiedSource: true,
        isDemo: false,
      }),
    });
    if (res.ok) {
      setGuideModalOpen(false);
      setGuideTitleEn('');
      setGuideAuthorityEn('');
      setGuideSummary('');
      setGuideDocs('');
      setGuideSteps('');
      await loadOverview(token);
      onDataChanged();
    }
  };

  const toggleGuideVerify = async (guide: DocumentGuide) => {
    if (!token) return;
    await fetch(`/api/admin/guides/${guide.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ verifiedSource: !guide.verifiedSource }),
    });
    await loadOverview(token);
    onDataChanged();
  };

  const deleteGuide = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/guides/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadOverview(token);
    onDataChanged();
  };

  const updateProblem = async (id: string, status: ProblemStatus, adminNote?: string) => {
    if (!token) return;
    await fetch(`/api/admin/problems/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, adminNote }),
    });
    await loadOverview(token);
    onDataChanged();
  };

  const deleteProblem = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/problems/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadOverview(token);
    onDataChanged();
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-700';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  if (authLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        {t.common.loading}
      </div>
    );
  }

  if (!token) {
    const needsSetup = authStatus?.needsSetup ?? false;
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="w-11 h-11 rounded-lg bg-slate-900 dark:bg-emerald-700 text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {needsSetup ? t.admin.setupTitle : t.admin.loginTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {needsSetup ? t.admin.setupDesc : t.admin.loginDesc}
            </p>
          </div>

          <form onSubmit={needsSetup ? handleFirstRunSetup : handleLogin} className="space-y-3">
            <div>
              <label className={labelClass}>Admin Password</label>
              <input
                required
                type="password"
                minLength={needsSetup ? 8 : 1}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={needsSetup ? 'Minimum 8 characters' : 'Enter admin password'}
                className={inputClass}
              />
            </div>

            {needsSetup && (
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  required
                  type="password"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {authErr && <p className="text-xs text-red-700 dark:text-red-400">{authErr}</p>}

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-lg cursor-pointer"
            >
              {needsSetup ? 'Set Admin Password & Continue' : 'Sign In to Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const visibleOpportunities =
    filterStatus === 'all'
      ? opportunities
      : opportunities.filter((o) => o.status === filterStatus);

  const pendingCount = opportunities.filter((o) => o.status === 'pending').length;
  const verifiedCount = opportunities.filter((o) => o.verifiedSource).length;
  const openProblems = problems.filter((p) => p.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.admin.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.admin.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Opportunity</span>
          </button>
          <button
            type="button"
            onClick={() => setToken(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.admin.signOut}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Listings</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{opportunities.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Verified Official Sources</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1">{verifiedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Open Citizen Reports</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{openProblems}</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-1">
        {(
          [
            { id: 'engine', label: 'Update Engine' },
            { id: 'opportunities', label: `Opportunities (${opportunities.length})` },
            { id: 'guides', label: `Doc Guides (${guides.length})` },
            { id: 'problems', label: `Problems (${problems.length})` },
            { id: 'messages', label: `Messages (${messages.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
              tab === item.id
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {dataErr && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
          {dataErr}
        </div>
      )}

      {tab === 'engine' ? (
        <AdminEnginePanel token={token} onDataChanged={onDataChanged} />
      ) : dataLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
          {t.common.loading}
        </div>
      ) : tab === 'opportunities' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'pending', 'expired', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 dark:bg-emerald-700 text-white border-slate-900 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {visibleOpportunities.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-white uppercase">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.province}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        item.status === 'active'
                          ? 'text-emerald-800 dark:text-emerald-400'
                          : item.status === 'pending'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.verifiedSource ? 'Verified Source' : 'Unverified Source'} (
                      {item.lastVerifiedDate})
                    </span>
                    {item.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">DEMO</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.titleEn}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {item.organizationEn} · Deadline: {item.deadline}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void patchOpportunity(item.id, {
                            status: 'active',
                            verifiedSource: true,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchOpportunity(item.id, { status: 'rejected' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      void patchOpportunity(item.id, { verifiedSource: !item.verifiedSource })
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                  >
                    {item.verifiedSource ? 'Unverify' : 'Verify Source'}
                  </button>

                  {item.status !== 'expired' && (
                    <button
                      type="button"
                      onClick={() => void patchOpportunity(item.id, { status: 'expired' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-md cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark Expired</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.common.edit}</span>
                  </button>

                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400"
                    aria-label="Open Official Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => void deleteOpportunity(item.id)}
                    aria-label={t.common.delete}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'guides' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document Guide</span>
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {guides.map((g) => (
              <div key={g.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {g.authorityEn} · {g.province} · Verified: {g.lastVerifiedDate}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{g.titleEn}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleGuideVerify(g)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                  >
                    {g.verifiedSource ? 'Verified' : 'Mark Verified'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteGuide(g.id)}
                    className="p-2 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'problems' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {problems.map((p) => (
            <div key={p.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{p.referenceCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {p.district} ({p.area})
                  </span>
                </div>
                <span>
                  Reporter: {p.reporterName || 'Anonymous'} ({p.reporterContact || 'No contact'})
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <select
                  value={p.status}
                  onChange={(e) =>
                    void updateProblem(
                      p.id,
                      e.target.value as ProblemStatus,
                      noteEdits[p.id] ?? p.adminNote,
                    )
                  }
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="forwarded">Forwarded to Dept</option>
                  <option value="resolved">Resolved</option>
                </select>

                <input
                  type="text"
                  placeholder="Admin resolution note..."
                  value={noteEdits[p.id] ?? p.adminNote ?? ''}
                  onChange={(e) => setNoteEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    void updateProblem(p.id, p.status, noteEdits[p.id] ?? p.adminNote ?? '')
                  }
                  className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Save Note
                </button>

                <button
                  type="button"
                  onClick={() => void deleteProblem(p.id)}
                  className="p-2 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No contact messages yet.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="p-5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {m.name} · {m.contact}
                  </span>
                  <span>{m.topic}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{m.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Opportunity Modal */}
      {editingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {formState.id ? 'Edit Opportunity Listing' : 'Add New Opportunity Listing'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        category: e.target.value as OpportunityCategory,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="scholarship">Scholarship</option>
                    <option value="job">Government Job</option>
                    <option value="internship">Internship</option>
                    <option value="course">Free Course</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Province</label>
                  <select
                    value={formState.province}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        province: e.target.value as Exclude<Province, 'All'>,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="Sindh">Sindh</option>
                    <option value="Federal">Federal</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, status: e.target.value as ListingStatus }))
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Title (English)</label>
                  <input
                    required
                    type="text"
                    value={formState.titleEn}
                    onChange={(e) => setFormState((s) => ({ ...s, titleEn: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title (Urdu)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formState.titleUr}
                    onChange={(e) => setFormState((s) => ({ ...s, titleUr: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Organization / Dept</label>
                  <input
                    required
                    type="text"
                    value={formState.organizationEn}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, organizationEn: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Official Source URL</label>
                  <input
                    required
                    type="url"
                    value={formState.officialUrl}
                    onChange={(e) => setFormState((s) => ({ ...s, officialUrl: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Education Level</label>
                  <input
                    type="text"
                    value={formState.educationLevel}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, educationLevel: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Deadline (YYYY-MM-DD or Rolling)</label>
                  <input
                    type="text"
                    value={formState.deadline}
                    onChange={(e) => setFormState((s) => ({ ...s, deadline: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={2}
                  value={formState.descriptionEn}
                  onChange={(e) => setFormState((s) => ({ ...s, descriptionEn: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Eligibility (1 item per line)</label>
                  <textarea
                    rows={3}
                    value={formState.eligibilityText}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, eligibilityText: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Required Docs (1 item per line)</label>
                  <textarea
                    rows={3}
                    value={formState.docsText}
                    onChange={(e) => setFormState((s) => ({ ...s, docsText: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.verifiedSource}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, verifiedSource: e.target.checked }))
                    }
                    className="accent-emerald-700"
                  />
                  <span>Verified Official Source</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isDemo}
                    onChange={(e) => setFormState((s) => ({ ...s, isDemo: e.target.checked }))}
                    className="accent-amber-600"
                  />
                  <span>Mark as DEMO Sample</span>
                </label>
              </div>

              {formErr && <p className="text-xs text-red-700 dark:text-red-400">{formErr}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  {savingForm ? 'Saving...' : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Guide Modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Document Guide</h2>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveGuide} className="space-y-3">
              <input
                required
                type="text"
                placeholder="Guide Title (e.g. Union Council Birth Certificate)"
                value={guideTitleEn}
                onChange={(e) => setGuideTitleEn(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="text"
                placeholder="Authority (e.g. Local Govt Sindh / Union Council)"
                value={guideAuthorityEn}
                onChange={(e) => setGuideAuthorityEn(e.target.value)}
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={guideProvince}
                  onChange={(e) => setGuideProvince(e.target.value as Exclude<Province, 'All'>)}
                  className={inputClass}
                >
                  <option value="Sindh">Sindh</option>
                  <option value="Federal">Federal</option>
                </select>
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={guideUrl}
                  onChange={(e) => setGuideUrl(e.target.value)}
                  className={inputClass}
                />
              </div>
              <textarea
                rows={2}
                placeholder="Short summary..."
                value={guideSummary}
                onChange={(e) => setGuideSummary(e.target.value)}
                className={inputClass}
              />
              <textarea
                rows={3}
                placeholder="Required documents (one per line)"
                value={guideDocs}
                onChange={(e) => setGuideDocs(e.target.value)}
                className={inputClass}
              />
              <textarea
                rows={3}
                placeholder="Step-by-step instructions (one per line)"
                value={guideSteps}
                onChange={(e) => setGuideSteps(e.target.value)}
                className={inputClass}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
