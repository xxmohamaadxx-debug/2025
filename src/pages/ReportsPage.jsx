
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Logo from '@/components/Logo';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReportsPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      if (!user?.tenant_id) return;

      try {
        const [invIn, invOut] = await Promise.all([
          neonService.getInvoicesIn(user.tenant_id).catch(() => []),
          neonService.getInvoicesOut(user.tenant_id).catch(() => [])
        ]);

        const income = { TRY: 0, USD: 0, SYP: 0 };
        const expense = { TRY: 0, USD: 0, SYP: 0 };

        (invIn || []).forEach(i => { 
          if (income[i.currency] !== undefined) income[i.currency] += parseFloat(i.amount || 0);
        });
        (invOut || []).forEach(i => { 
          if (expense[i.currency] !== undefined) expense[i.currency] += parseFloat(i.amount || 0);
        });

        setFinancialData({ income, expense });
      } catch (error) {
        console.error('Load reports error:', error);
        setFinancialData({ income: { TRY: 0, USD: 0, SYP: 0 }, expense: { TRY: 0, USD: 0, SYP: 0 } });
      }
    };

    loadReports();
  }, [user?.tenant_id]);

  const data = financialData ? {
    labels: [
      t('reports.incomeTRY'), 
      t('reports.expenseTRY'), 
      t('reports.incomeUSD'), 
      t('reports.expenseUSD'),
      t('reports.incomeSYP'),
      t('reports.expenseSYP')
    ],
    datasets: [
      {
        label: t('common.amount'),
        data: [
          financialData.income.TRY || 0, 
          financialData.expense.TRY || 0, 
          financialData.income.USD || 0, 
          financialData.expense.USD || 0,
          financialData.income.SYP || 0,
          financialData.expense.SYP || 0
        ],
        backgroundColor: [
            'rgba(34, 197, 94, 0.6)',
            'rgba(239, 68, 68, 0.6)',
            'rgba(34, 197, 94, 0.6)',
            'rgba(239, 68, 68, 0.6)',
            'rgba(34, 197, 94, 0.6)',
            'rgba(239, 68, 68, 0.6)',
        ],
      },
    ],
  } : null;

  return (
    <>
      <Helmet>
        <title>{t('common.reports')} - {t('common.systemName')}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <Logo size="md" showText={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            {t('common.reports')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.financialOverview')}</h2>
                {financialData && data ? <Bar data={data} /> : <p className="text-gray-500">{t('common.loading')}</p>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.summary')}</h2>
                <p className="text-gray-600 dark:text-gray-300">
                    {t('reports.summaryText')}
                </p>
                <div className="mt-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">{t('reports.netBalance')}:</h3>
                    <ul className="list-disc rtl:list-circle pl-5 rtl:pr-5 rtl:pl-0 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                        <li>TRY: {(financialData ? (financialData.income.TRY - financialData.expense.TRY) : 0).toFixed(2)}</li>
                        <li>USD: {(financialData ? (financialData.income.USD - financialData.expense.USD) : 0).toFixed(2)}</li>
                        <li>SYP: {(financialData ? (financialData.income.SYP - financialData.expense.SYP) : 0).toFixed(2)}</li>
                    </ul>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
