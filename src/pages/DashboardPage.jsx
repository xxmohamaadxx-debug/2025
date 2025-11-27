
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { TrendingUp, TrendingDown, Wallet, Users, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { formatDateAR } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const KPICard = ({ title, value, icon: Icon, trend, color, t }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-800/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 overflow-hidden"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 group-hover:from-orange-500/5 group-hover:via-pink-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>
      
      <div className="relative z-10 flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{title}</p>
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mt-1 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {value}
          </h3>
        </div>
        <div className={`p-4 rounded-xl ${color} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
          <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs md:text-sm relative z-10">
          <span className={`font-bold ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {trend >= 0 ? "↗" : "↘"} {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span className="ml-2 rtl:mr-2 rtl:ml-0 text-gray-500 dark:text-gray-400">{t('dashboard.vsLastMonth')}</span>
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
    lowStock: 0,
    dailyProfitLoss: [],
    todayProfitLoss: null
  });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('day'); // 'day', 'week', 'month', 'all'

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
          Promise.race([neonService.getInventory(user.tenant_id).catch(() => []), timeoutPromise]),
          Promise.race([neonService.getDailyProfitLoss(user.tenant_id, null, null).catch(() => []), timeoutPromise])
        ];

        const results = await Promise.allSettled(promises);
        
        let invoicesIn = Array.isArray(results[0].value) ? results[0].value : [];
        let invoicesOut = Array.isArray(results[1].value) ? results[1].value : [];
        const employees = Array.isArray(results[2].value) ? results[2].value : [];
        const inventory = Array.isArray(results[3].value) ? results[3].value : [];
        const dailyProfitLoss = Array.isArray(results[4].value) ? results[4].value : [];
        
        // تصفية حسب الفترة المحددة
        const now = new Date();
        let startDate = null;
        
        if (filterPeriod === 'day') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filterPeriod === 'week') {
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
        } else if (filterPeriod === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        if (startDate) {
          invoicesIn = invoicesIn.filter(inv => {
            const invDate = new Date(inv.date || inv.created_at);
            return invDate >= startDate;
          });
          invoicesOut = invoicesOut.filter(inv => {
            const invDate = new Date(inv.date || inv.created_at);
            return invDate >= startDate;
          });
        }
        
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
        
        // حساب الربح/الخسارة اليومية
        const todayProfitLoss = dailyProfitLoss.find(p => {
          const today = new Date().toISOString().split('T')[0];
          return p.transaction_date === today;
        });

        setStats({
          incomeByCurrency,
          expensesByCurrency,
          employees: employees.filter(e => e?.status === 'Active').length,
          lowStock: inventory.filter(i => Number(i?.quantity || 0) <= Number(i?.min_stock || 5)).length,
          dailyProfitLoss: dailyProfitLoss || [],
          todayProfitLoss: todayProfitLoss || null
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
  }, [user?.tenant_id, user?.isSuperAdmin, user?.id, filterPeriod]);

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
    <div className="space-y-6 min-h-[500px] relative">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-purple-50/50 to-pink-50/50 dark:from-gray-900/50 dark:via-purple-900/50 dark:to-gray-900/50 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,140,0,0.05),transparent_50%)] -z-10"></div>
      
      <Helmet><title>{t('common.dashboard')} - {t('common.systemName')}</title></Helmet>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10"
      >
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
        <div className="flex items-center gap-3">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="day">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="all">الكل</option>
          </select>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            {formatDateAR(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
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
        
        {/* الربح/الخسارة اليومية */}
        {stats.todayProfitLoss && (
          (() => {
            const currency = stats.todayProfitLoss.currency || 'TRY';
            const currencyInfo = CURRENCIES[currency] || { symbol: currency, code: currency };
            const netProfit = parseFloat(stats.todayProfitLoss.net_profit || 0);
            return (
              <KPICard
                key={`daily-profit-${currency}`}
                t={t}
                title={`الربح/الخسارة اليومية (${currencyInfo.code})`}
                value={`${currencyInfo.symbol}${netProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}`}
                icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                color={netProfit >= 0 ? "bg-green-500" : "bg-red-500"}
              />
            );
          })()
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('dashboard.financialOverview')}</h3>
          <div className="h-64"><Line options={{ maintainAspectRatio: false, responsive: true }} data={chartData} /></div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t('dashboard.lowStock')}
              </h3>
              <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full font-bold shadow-lg">
                {stats.lowStock} {t('dashboard.items')}
              </span>
            </div>
            {stats.lowStock > 0 ? (
              <div className="space-y-3">
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-4 text-sm p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl border-2 border-red-200 dark:border-red-900/50 shadow-lg"
                >
                  <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.actionNeeded')}</span>
                </motion.div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-semibold">{t('dashboard.allStockHealthy')}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default React.memo(DashboardPage);
