
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Filter, Calendar } from 'lucide-react';
import { exportToExcel, generateReport, getPeriodDates } from '@/lib/exportUtils';
import { exportReportPDF } from '@/lib/pdfUtils';
import { formatDateAR } from '@/lib/dateUtils';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReportsPage = () => {
  const { t, locale } = useLanguage();
  const { user, tenant } = useAuth();
  const [financialData, setFinancialData] = useState(null);
  const [invoicesIn, setInvoicesIn] = useState([]);
  const [invoicesOut, setInvoicesOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [groupBy, setGroupBy] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      if (!user?.tenant_id) return;

      try {
        const [invIn, invOut] = await Promise.all([
          neonService.getInvoicesIn(user.tenant_id).catch(() => []),
          neonService.getInvoicesOut(user.tenant_id).catch(() => [])
        ]);

        setInvoicesIn(invIn || []);
        setInvoicesOut(invOut || []);

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
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [user?.tenant_id]);

  const handleExportPDF = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod);
      const reportData = generateReport(invoicesIn, invoicesOut, {
        startDate,
        endDate,
        currency: filterCurrency || undefined,
        category: filterCategory || undefined,
        locale: locale
      });

      const columns = [
        { header: t('reports.type') || 'النوع', accessor: (row) => row.type },
        { header: t('common.date'), accessor: (row) => row.date ? formatDateAR(row.date) : '-' },
        { header: t('common.description'), accessor: (row) => row.description || '-' },
        { header: t('common.amount'), accessor: (row) => parseFloat(row.amount || 0).toLocaleString('ar-EG') },
        { header: t('common.currency'), accessor: (row) => row.currency || '-' },
        { header: t('common.category'), accessor: (row) => row.category || '-' },
        { header: t('reports.partner') || 'الطرف', accessor: (row) => row.partner || '-' }
      ];

      await exportReportPDF(
        `${t('common.reports')} - ${t(`reports.${selectedPeriod}`) || selectedPeriod}`,
        reportData,
        columns,
        tenant?.name,
        '/logo.png',
        locale
      );

      toast({ title: t('reports.reportGenerated') || 'تم تصدير التقرير بنجاح' });
    } catch (error) {
      console.error('Export PDF error:', error);
      toast({ 
        title: 'خطأ', 
        description: 'حدث خطأ في تصدير التقرير',
        variant: 'destructive' 
      });
    }
  };

  const handleExportExcel = () => {
    const { startDate, endDate } = getPeriodDates(selectedPeriod);
    const reportData = generateReport(invoicesIn, invoicesOut, {
      startDate,
      endDate,
      currency: filterCurrency || undefined,
      category: filterCategory || undefined,
      locale: locale
    });

    const columns = [
      { key: 'type', label: t('reports.type') || 'النوع' },
      { key: 'date', label: t('common.date'), formatter: (val) => formatDateAR(val) },
      { key: 'description', label: t('common.description') },
      { key: 'amount', label: t('common.amount') },
      { key: 'currency', label: t('common.currency') },
      { key: 'category', label: t('common.category') },
      { key: 'partner', label: t('reports.partner') || 'الطرف' }
    ];

    exportToExcel(reportData, {
      title: `${t('common.reports')} - ${t(`reports.${selectedPeriod}`)}`,
      columns,
      filename: `report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`,
      locale: locale
    });

    toast({ title: t('reports.reportGenerated') });
  };

  // Get filtered and grouped data for display
  const { startDate, endDate } = getPeriodDates(selectedPeriod);
  const filteredData = generateReport(invoicesIn, invoicesOut, {
    startDate,
    endDate,
    currency: filterCurrency || undefined,
    category: filterCategory || undefined,
    locale: locale
  });

  // حساب الإجماليات حسب اللغة
  const incomeType = locale === 'ar' ? 'وارد' : locale === 'en' ? 'Income' : 'Gelir';
  const expenseType = locale === 'ar' ? 'صادر' : locale === 'en' ? 'Expense' : 'Gider';

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

  const totalIncome = filteredData.reduce((sum, item) => item.type === incomeType ? sum + item.amount : sum, 0);
  const totalExpenses = filteredData.reduce((sum, item) => item.type === expenseType ? sum + item.amount : sum, 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <>
      <Helmet>
        <title>{t('common.reports')} - {t('common.systemName')}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
              {t('common.reports')}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="bg-white dark:bg-gray-800"
            >
              <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t('reports.exportPDF')}
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="bg-white dark:bg-gray-800"
            >
              <FileSpreadsheet className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t('reports.exportExcel')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <GlassCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('reports.selectPeriod')}</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="daily">{t('reports.daily')}</option>
                <option value="weekly">{t('reports.weekly')}</option>
                <option value="monthly">{t('reports.monthly')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('reports.filterByCurrency')}</label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{t('common.all') || 'الكل'}</option>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('reports.filterByCategory')}</label>
              <input
                type="text"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                placeholder={t('reports.filterByCategory')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('reports.groupBy') || 'تجميع حسب'}</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{t('common.none') || 'بدون تجميع'}</option>
                <option value="date">{t('reports.groupByDate')}</option>
                <option value="currency">{t('reports.groupByCurrency')}</option>
                <option value="category">{t('reports.groupByCategory')}</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('reports.totalIncome')}</h3>
            <p className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </GlassCard>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('reports.totalExpenses')}</h3>
            <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </GlassCard>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('reports.netProfit')}</h3>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </GlassCard>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.financialOverview')}</h2>
            {financialData && data ? <Bar data={data} /> : <p className="text-gray-500">{t('common.loading')}</p>}
          </GlassCard>
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.summary')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('reports.summaryText')}
            </p>
            <div className="mt-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('reports.netBalance')}:</h3>
              <ul className="list-disc rtl:list-circle pl-5 rtl:pr-5 rtl:pl-0 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                <li>TRY: {(financialData ? (financialData.income.TRY - financialData.expense.TRY) : 0).toFixed(2)}</li>
                <li>USD: {(financialData ? (financialData.income.USD - financialData.expense.USD) : 0).toFixed(2)}</li>
                <li>SYP: {(financialData ? (financialData.income.SYP - financialData.expense.SYP) : 0).toFixed(2)}</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
