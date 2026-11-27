import React, { useMemo, useState } from 'react';
import type { Language } from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface CalculatorsPageProps {
  language: Language;
  t: TranslationBundle;
}

type CalcTab = 'electricity' | 'tax' | 'zakat' | 'merit';

function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`;
}

export const CalculatorsPage: React.FC<CalculatorsPageProps> = ({ language, t }) => {
  const [tab, setTab] = useState<CalcTab>('electricity');

  const [units, setUnits] = useState<string>('240');
  const [isProtected, setIsProtected] = useState<boolean>(false);

  const elecResult = useMemo(() => {
    const u = Math.max(0, Number(units) || 0);
    let energyCharge = 0;
    if (isProtected && u <= 200) {
      const s1 = Math.min(u, 100) * 10.5;
      const s2 = Math.max(0, u - 100) * 13.0;
      energyCharge = s1 + s2;
    } else if (u <= 100) {
      energyCharge = u * 16.5;
    } else if (u <= 200) {
      energyCharge = 100 * 16.5 + (u - 100) * 23.0;
    } else if (u <= 300) {
      energyCharge = 100 * 16.5 + 100 * 23.0 + (u - 200) * 28.5;
    } else if (u <= 700) {
      energyCharge = 100 * 16.5 + 100 * 23.0 + 100 * 28.5 + (u - 300) * 35.0;
    } else {
      energyCharge = 100 * 16.5 + 100 * 23.0 + 100 * 28.5 + 400 * 35.0 + (u - 700) * 42.0;
    }
    const fixedAndTv = u > 0 ? 235 : 0;
    const estDutyAndTax = energyCharge * 0.14;
    return {
      units: u,
      energyCharge,
      fixedAndTv,
      estDutyAndTax,
      total: energyCharge + fixedAndTv + estDutyAndTax,
    };
  }, [units, isProtected]);

  const [monthlySalary, setMonthlySalary] = useState<string>('120000');
  const taxResult = useMemo(() => {
    const monthly = Math.max(0, Number(monthlySalary) || 0);
    const annual = monthly * 12;
    let annualTax = 0;
    if (annual <= 600000) {
      annualTax = 0;
    } else if (annual <= 1200000) {
      annualTax = (annual - 600000) * 0.05;
    } else if (annual <= 2200000) {
      annualTax = 30000 + (annual - 1200000) * 0.15;
    } else if (annual <= 3200000) {
      annualTax = 180000 + (annual - 2200000) * 0.25;
    } else if (annual <= 4100000) {
      annualTax = 430000 + (annual - 3200000) * 0.3;
    } else {
      annualTax = 700000 + (annual - 4100000) * 0.35;
    }
    const monthlyTax = annualTax / 12;
    return {
      monthly,
      annual,
      annualTax,
      monthlyTax,
      netMonthly: monthly - monthlyTax,
    };
  }, [monthlySalary]);

  const [cashSavings, setCashSavings] = useState<string>('250000');
  const [goldSilver, setGoldSilver] = useState<string>('100000');
  const [investments, setInvestments] = useState<string>('0');
  const [debts, setDebts] = useState<string>('20000');
  const [nisabThreshold, setNisabThreshold] = useState<string>('179689');

  const zakatResult = useMemo(() => {
    const assets =
      (Number(cashSavings) || 0) + (Number(goldSilver) || 0) + (Number(investments) || 0);
    const netWealth = Math.max(0, assets - (Number(debts) || 0));
    const nisab = Math.max(0, Number(nisabThreshold) || 0);
    const eligible = netWealth >= nisab && netWealth > 0;
    return {
      assets,
      netWealth,
      eligible,
      zakatDue: eligible ? netWealth * 0.025 : 0,
    };
  }, [cashSavings, goldSilver, investments, debts, nisabThreshold]);

  const [matricObt, setMatricObt] = useState<string>('760');
  const [matricMax, setMatricMax] = useState<string>('850');
  const [interObt, setInterObt] = useState<string>('880');
  const [interMax, setInterMax] = useState<string>('1100');
  const [testObt, setTestObt] = useState<string>('72');
  const [testMax, setTestMax] = useState<string>('100');

  const meritResult = useMemo(() => {
    const mPct = (Number(matricMax) || 1) > 0 ? ((Number(matricObt) || 0) / (Number(matricMax) || 1)) * 100 : 0;
    const iPct = (Number(interMax) || 1) > 0 ? ((Number(interObt) || 0) / (Number(interMax) || 1)) * 100 : 0;
    const tPct = (Number(testMax) || 1) > 0 ? ((Number(testObt) || 0) / (Number(testMax) || 1)) * 100 : 0;
    const aggregate = mPct * 0.1 + iPct * 0.4 + tPct * 0.5;
    return {
      mPct: Math.min(100, Math.max(0, mPct)),
      iPct: Math.min(100, Math.max(0, iPct)),
      tPct: Math.min(100, Math.max(0, tPct)),
      aggregate: Math.min(100, Math.max(0, aggregate)),
    };
  }, [matricObt, matricMax, interObt, interMax, testObt, testMax]);

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums focus:outline-2 focus:outline-emerald-700';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.calculators.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.calculators.subtitle}</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
        {t.calculators.disclaimer}
      </div>

      {/* Calculator Segmented Tabs */}
      <div className="p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl grid grid-cols-2 lg:grid-cols-4 gap-1">
        {(['electricity', 'tax', 'zakat', 'merit'] as CalcTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              tab === key
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.calculators.tabs[key]}
          </button>
        ))}
      </div>

      {/* Calculator Body */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        {tab === 'electricity' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ur' ? 'بجلی کے بل کا اندازہ (K-Electric / HESCO / SEPCO)' : 'Electricity Bill Slab Estimator (DEMO)'}
              </h2>
              <div>
                <label className={labelClass}>
                  {language === 'ur' ? 'ماہانہ یونٹس (kWh)' : 'Monthly Units Consumed (kWh)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="w-4 h-4 accent-emerald-700"
                />
                <span>
                  {language === 'ur'
                    ? 'پروٹیکٹڈ صارف (گزشتہ 6 ماہ میں 200 یا کم یونٹس)'
                    : 'Protected Consumer (≤ 200 units for last 6 months)'}
                </span>
              </label>
            </div>

            <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 tabular-nums">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'بجلی کے یونٹس کی قیمت' : 'Base Energy Charge (Demo Slab)'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(elecResult.energyCharge)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'پی ٹی وی اور فکسڈ چارجز' : 'TV Fee & Fixed Meter Charge'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(elecResult.fixedAndTv)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'اندازاً ٹیکس و ڈیوٹی (14%)' : 'Est. Electricity Duty & Taxes (~14%)'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(elecResult.estDutyAndTax)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? 'اندازاً کل بل' : 'Estimated Total Bill'}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{formatPkr(elecResult.total)}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'tax' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ur' ? 'تنخواہ پر انکم ٹیکس کا اندازہ (ڈیمو)' : 'Salaried Income Tax Estimator (DEMO)'}
              </h2>
              <div>
                <label className={labelClass}>
                  {language === 'ur' ? 'ماہانہ تنخواہ (PKR)' : 'Gross Monthly Salary (PKR)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 tabular-nums">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'سالانہ آمدنی' : 'Annual Taxable Income'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(taxResult.annual)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'ماہانہ انکم ٹیکس' : 'Estimated Monthly Tax'}</span>
                <span className="font-semibold text-red-700 dark:text-red-400">{formatPkr(taxResult.monthlyTax)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'سالانہ ٹیکس' : 'Estimated Annual Tax'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(taxResult.annualTax)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? 'ماہانہ خالص تنخواہ' : 'Net Monthly Take-Home'}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{formatPkr(taxResult.netMonthly)}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'zakat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ur' ? 'زکوٰۃ کیلکولیٹر (2.5%)' : 'Annual Zakat Calculator (2.5%)'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    {language === 'ur' ? 'نقد رقم / بینک بچت (PKR)' : 'Cash & Bank Savings (PKR)'}
                  </label>
                  <input type="number" min={0} value={cashSavings} onChange={(e) => setCashSavings(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'ur' ? 'سونا / چاندی کی مالیت (PKR)' : 'Gold / Silver Value (PKR)'}
                  </label>
                  <input type="number" min={0} value={goldSilver} onChange={(e) => setGoldSilver(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'ur' ? 'کاروباری سامان / شیئرز (PKR)' : 'Business Assets / Stocks (PKR)'}
                  </label>
                  <input type="number" min={0} value={investments} onChange={(e) => setInvestments(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'ur' ? 'واجب الادا قرض منہا کریں (PKR)' : 'Immediate Liabilities / Debts (PKR)'}
                  </label>
                  <input type="number" min={0} value={debts} onChange={(e) => setDebts(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {language === 'ur' ? 'نصاب کی حد (چاندی نصاب - PKR)' : 'Silver Nisab Threshold (Editable PKR)'}
                </label>
                <input type="number" min={0} value={nisabThreshold} onChange={(e) => setNisabThreshold(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 tabular-nums flex flex-col justify-center">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'کل قابلِ زکوٰۃ مالیت' : 'Net Zakatable Wealth'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatPkr(zakatResult.netWealth)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{language === 'ur' ? 'نصاب کی حیثیت' : 'Nisab Eligibility'}</span>
                <span className={`font-semibold ${zakatResult.eligible ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {zakatResult.eligible
                    ? language === 'ur' ? 'نصاب سے زائد (زکوٰۃ واجب)' : 'Above Nisab (Eligible)'
                    : language === 'ur' ? 'نصاب سے کم' : 'Below Nisab'}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? 'واجب الادا زکوٰۃ (2.5%)' : 'Zakat Due (2.5%)'}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{formatPkr(zakatResult.zakatDue)}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'merit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ur' ? 'یونیورسٹی داخلہ میرٹ کیلکولیٹر (10% / 40% / 50%)' : 'University Entry Aggregate Calculator (10% / 40% / 50%)'}
              </h2>
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'میٹرک حاصل کردہ نمبر' : 'Matric Obtained'}</label>
                  <input type="number" value={matricObt} onChange={(e) => setMatricObt(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'میٹرک کل نمبر' : 'Matric Total'}</label>
                  <input type="number" value={matricMax} onChange={(e) => setMatricMax(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'انٹرمیڈیٹ حاصل کردہ' : 'Inter / FSC Obtained'}</label>
                  <input type="number" value={interObt} onChange={(e) => setInterObt(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'انٹرمیڈیٹ کل نمبر' : 'Inter / FSC Total'}</label>
                  <input type="number" value={interMax} onChange={(e) => setInterMax(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'انٹری ٹیسٹ نمبر' : 'Entry Test Score'}</label>
                  <input type="number" value={testObt} onChange={(e) => setTestObt(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'ur' ? 'انٹری ٹیسٹ کل نمبر' : 'Entry Test Total'}</label>
                  <input type="number" value={testMax} onChange={(e) => setTestMax(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 tabular-nums flex flex-col justify-center">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Matric (10% weight)</span>
                <span className="font-semibold text-slate-900 dark:text-white">{meritResult.mPct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Inter / FSC (40% weight)</span>
                <span className="font-semibold text-slate-900 dark:text-white">{meritResult.iPct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Entry Test (50% weight)</span>
                <span className="font-semibold text-slate-900 dark:text-white">{meritResult.tPct.toFixed(2)}%</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? 'مجموعی میرٹ' : 'Combined Aggregate'}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{meritResult.aggregate.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
