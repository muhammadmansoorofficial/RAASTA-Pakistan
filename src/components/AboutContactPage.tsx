import React, { useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import type { Language } from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface AboutContactPageProps {
  language: Language;
  t: TranslationBundle;
}

const HELPLINES = [
  { code: '15', nameEn: 'Police Madadgar / Emergency', nameUr: 'پولیس مددگار ہنگامی نمبر' },
  { code: '1122', nameEn: 'Rescue 1122 Ambulance & Fire', nameUr: 'ریسکیو 1122 ایمبولینس و فائر' },
  { code: '115', nameEn: 'Edhi Ambulance Service', nameUr: 'ایدھی ایمبولینس سروس' },
  { code: '1991', nameEn: 'FIA Cybercrime Reporting', nameUr: 'ایف آئی اے سائبر کرائم ہیلپ لائن' },
  { code: '1121', nameEn: 'Child Protection Helpline (Sindh)', nameUr: 'چائلڈ پروٹیکشن ہیلپ لائن (سندھ)' },
  { code: '1094', nameEn: 'Sindh Women Helpline', nameUr: 'سندھ ویمن ہیلپ لائن' },
];

export const AboutContactPage: React.FC<AboutContactPageProps> = ({ language, t }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [topic, setTopic] = useState('Feedback / Correction');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSent(false);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, topic, message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message.');
      }
      setSent(true);
      setName('');
      setContact('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-700';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.about.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.about.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.about.missionTitle}</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{t.about.missionBody}</p>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.about.standardsTitle}</h2>
            <ul className="space-y-2.5">
              {t.about.standardsItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.about.helplinesTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HELPLINES.map((h) => (
                <div
                  key={h.code}
                  className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {language === 'ur' ? h.nameUr : h.nameEn}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400 shrink-0 tabular-nums">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{h.code}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Contact Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.about.contactTitle}</h2>

          {sent && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.about.contactSuccess}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>{language === 'ur' ? 'آپ کا نام' : 'Your Name'}</label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{language === 'ur' ? 'ای میل یا فون نمبر' : 'Email or Phone Number'}</label>
            <input required type="text" value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{language === 'ur' ? 'موضوع' : 'Topic'}</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass}>
              <option value="Feedback / Correction">Feedback / Correction</option>
              <option value="Report Outdated Deadline">Report Outdated Deadline</option>
              <option value="Department Partnership">Department Partnership</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>{language === 'ur' ? 'پیغام' : 'Message'}</label>
            <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg cursor-pointer disabled:opacity-50"
          >
            {submitting ? t.common.submitting : t.common.submit}
          </button>
        </form>
      </div>
    </div>
  );
};
