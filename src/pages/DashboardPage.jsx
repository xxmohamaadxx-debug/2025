
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { TrendingUp, TrendingDown, Wallet, Users, AlertTriangle, Activity } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { formatDateAR } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const KPICard = ({ title, value, icon: Icon, trend, color, t }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
        </div>
        <div className={`p-2 md:p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs md:text-sm">
          <span className={trend >= 0 ? "text-green-500" : "text-red-500"}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span className="ml-2 rtl:mr-2 rtl:ml-0 text-gray-400">{t('dashboard.vsLastMonth')}</span>
        </div>
      )}
    </motion.div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [stats, setStats] = useState({ 
    incomeByCurrency: { TRY: 0, USD: 0, SYP: 0 },
    expensesByCurrency: { TRY: 0, USD: 0, SYP: 0 },
    employees: 0, 
    lowStock: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      // Allow super admin to see stats even without tenant_id
      if (!user) {
        setLoading(false);
        return;
      }

      // For super admin, load empty stats (they don't have tenant-specific data)
      if (user?.isSuperAdmin && !user?.tenant_id) {
        setStats({ 
          incomeByCurrency: { TRY: 0, USD: 0, SYP: 0 },
          expensesByCurrency: { TRY: 0, USD: 0, SYP: 0 },
          employees: 0, 
          lowStock: 0 
        });
        setLoading(false);
        return;
      }

      // Regular users need tenant_id
      if (!user?.tenant_id) {
        setLoading(false);
        return;
      }

      try {
        // Use Promise.allSettled with timeout protection
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve([]), 10000) // 10 second timeout
        );

        const promises = [
          Promise.race([neonService.getInvoicesIn(user.tenant_id).catch(() => []), timeoutPromise]),
          Promise.race([neonService.getInvoicesOut(user.tenant_id).catch(() => []), timeoutPromise]),
          Promise.race([neonService.getEmployees(user.tenant_id).catch(() => []), timeoutPromise]),
          Promise.race([neonService.getInventory(user.tenant_id).catch(() => []), timeoutPromise])
        ];

        const results = await Promise.allSettled(promises);
        
        const invoicesIn = Array.isArray(results[0].value) ? results[0].value : [];
        const invoicesOut = Array.isArray(results[1].value) ? results[1].value : [];
        const employees = Array.isArray(results[2].value) ? results[2].value : [];
        const inventory = Array.isArray(results[3].value) ? results[3].value : [];
        
        // حساب الإحصائيات لكل عملة منفصلة
        const incomeByCurrency = { TRY: 0, USD: 0, SYP: 0 };
        const expensesByCurrency = { TRY: 0, USD: 0, SYP: 0 };
        
        invoicesIn.forEach(inv => {
          const currency = inv.currency || 'TRY';
          if (expensesByCurrency.hasOwnProperty(currency)) {
            expensesByCurrency[currency] += Number(inv.amount || 0);
          }
        });
        
        invoicesOut.forEach(inv => {
          const currency = inv.currency || 'TRY';
          if (incomeByCurrency.hasOwnProperty(currency)) {
            incomeByCurrency[currency] += Number(inv.amount || 0);
          }
        });
        
        setStats({
          incomeByCurrency,
          expensesByCurrency,
          employees: employees.filter(e => e?.status === 'Active').length,
          lowStock: inventory.filter(i => Number(i?.quantity || 0) <= Number(i?.min_stock || 5)).length
        });
      } catch (error) {
        console.error("Dashboard load error:", error);
        // Set default stats on error - don't leave page blank
        setStats({ 
          incomeByCurrency: { TRY: 0, USD: 0, SYP: 0 },
          expensesByCurrency: { TRY: 0, USD: 0, SYP: 0 },
          employees: 0, 
          lowStock: 0 
        });
      } finally {
        setLoading(false);
      }
    };
    
    // Always load stats, but with small delay to prevent blocking
    const timeoutId = setTimeout(loadStats, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.tenant_id, user?.isSuperAdmin, user?.id]);

  const chartData = {
    labels: [
      t('dashboard.months.jan'),
      t('dashboard.months.feb'),
      t('dashboard.months.mar'),
      t('dashboard.months.apr'),
      t('dashboard.months.may'),
      t('dashboard.months.jun')
    ],
    datasets: [
      { label: t('dashboard.totalIncome'), data: [12000, 19000, 3000, 5000, 20000, 30000], borderColor: 'rgb(34, 197, 94)', backgroundColor: 'rgba(34, 197, 94, 0.5)' },
      { label: t('dashboard.totalExpenses'), data: [8000, 12000, 15000, 4000, 10000, 15000], borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)' },
    ],
  };

  if (loading && !user) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-[500px]">
      <Helmet><title>{t('common.dashboard')} - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.welcome')} {user?.name || 'المستخدم'} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {t('dashboard.subtitle') || 'إليك ما يحدث في متجرك اليوم'}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          {formatDateAR(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* إجمالي الدخل لكل عملة */}
        {Object.entries(stats.incomeByCurrency).map(([currency, amount]) => {
          if (amount === 0) return null;
          const currencyInfo = CURRENCIES[currency] || { symbol: currency, code: currency };
          return (
            <KPICard 
              key={`income-${currency}`}
              t={t} 
              title={`${t('dashboard.totalIncome')} (${currencyInfo.code})`} 
              value={`${currencyInfo.symbol}${amount.toLocaleString()}`} 
              icon={TrendingUp} 
              trend={12} 
              color="bg-green-500" 
            />
          );
        })}
        
        {/* إجمالي المصروفات لكل عملة */}
        {Object.entries(stats.expensesByCurrency).map(([currency, amount]) => {
          if (amount === 0) return null;
          const currencyInfo = CURRENCIES[currency] || { symbol: currency, code: currency };
          return (
            <KPICard 
              key={`expenses-${currency}`}
              t={t} 
              title={`${t('dashboard.totalExpenses')} (${currencyInfo.code})`} 
              value={`${currencyInfo.symbol}${amount.toLocaleString()}`} 
              icon={TrendingDown} 
              trend={-5} 
              color="bg-red-500" 
            />
          );
        })}
        
        {/* صافي الربح لكل عملة */}
        {Object.entries(stats.incomeByCurrency).map(([currency, income]) => {
          const expenses = stats.expensesByCurrency[currency] || 0;
          const net = income - expenses;
          if (income === 0 && expenses === 0) return null;
          const currencyInfo = CURRENCIES[currency] || { symbol: currency, code: currency };
          return (
            <KPICard 
              key={`net-${currency}`}
              t={t} 
              title={`${t('dashboard.netProfit')} (${currencyInfo.code})`} 
              value={`${currencyInfo.symbol}${net.toLocaleString()}`} 
              icon={Wallet} 
              trend={net >= 0 ? 8 : -8} 
              color="bg-blue-500" 
            />
          );
        })}
        
        {/* الموظفون النشطون - بطاقة واحدة */}
        <KPICard t={t} title={t('dashboard.activeEmployees')} value={stats.employees} icon={Users} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('dashboard.financialOverview')}</h3>
          <div className="h-64"><Line options={{ maintainAspectRatio: false, responsive: true }} data={chartData} /></div>
        </motion.div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('dashboard.lowStock')}</h3>
              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">{stats.lowStock} {t('dashboard.items')}</span>
            </div>
            {stats.lowStock > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-gray-700 dark:text-gray-300">{t('dashboard.actionNeeded')}</span>
                </div>
              </div>
            ) : <div className="text-center py-4 text-gray-500 text-sm">{t('dashboard.allStockHealthy')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardPage);
