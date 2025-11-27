
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { TrendingUp, TrendingDown, Wallet, Users, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import ActiveUsersCard from '@/components/ActiveUsersCard';
import AdvancedFinancialBox from '@/components/AdvancedFinancialBox';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { formatDateAR } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const KPICard = ({ title, value, icon: Icon, trend, color, t, index = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.03, 
        y: -8,
        rotateY: 2,
        transition: { duration: 0.2 }
      }}
      className="group relative overflow-hidden"
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      {/* 3D Container with Glassmorphism */}
      <div className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
        }}
      >
        {/* Animated Neon Glow Background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
              'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Hover Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-2xl"
          transition={{ duration: 0.3 }}
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-orange-400"
              style={{
                left: `${20 + i * 20}%`,
                top: `${30 + (i % 2) * 40}%`,
                opacity: 0.3,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
            >
              {title}
            </motion.p>
            <motion.h3 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
              className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mt-1 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent"
            >
              {value}
            </motion.h3>
          </div>
          <motion.div 
            className={`p-4 rounded-2xl ${color} shadow-2xl relative overflow-hidden`}
            whileHover={{ scale: 1.15, rotate: [0, -5, 5, -5, 0] }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {/* Icon Glow */}
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <Icon className="h-6 w-6 md:h-8 md:w-8 text-white relative z-10" />
          </motion.div>
        </div>
        {trend && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.4 }}
            className="mt-5 flex items-center text-xs md:text-sm relative z-10"
          >
            <motion.span 
              className={`font-bold flex items-center gap-1 ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              animate={trend >= 0 ? { 
                x: [0, -3, 0],
              } : {
                x: [0, 3, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            >
              {trend >= 0 ? "↗" : "↘"} {trend >= 0 ? "+" : ""}{trend}%
            </motion.span>
            <span className="ml-2 rtl:mr-2 rtl:ml-0 text-gray-500 dark:text-gray-400">{t('dashboard.vsLastMonth')}</span>
          </motion.div>
        )}
      </div>
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

                    // حساب الموظفين النشطين بشكل صحيح
                    const activeEmployees = employees.filter(e => {
                      const status = e?.status || e?.employee_status;
                      return status === 'Active' || status === 'active' || status === 'ACTIVE';
                    }).length;

                    setStats({
                      incomeByCurrency,
                      expensesByCurrency,
                      employees: activeEmployees,
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
    <div className="space-y-6 min-h-[500px] relative overflow-hidden rounded-2xl p-4 md:p-6" style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 50%, rgba(15, 23, 42, 0.98) 100%)',
      backdropFilter: 'blur(20px) saturate(180%)',
    }}>
      {/* Ultra Advanced 3D Animated Background with Dynamic Particles */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-purple-50/50 to-pink-50/50 dark:from-gray-900/50 dark:via-purple-900/50 dark:to-gray-900/50"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)',
              'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(255, 140, 0, 0.05) 50%, rgba(168, 85, 247, 0.05) 100%)',
              'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)',
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,140,0,0.08),transparent_50%)]"></div>
        
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 140, 0, 0.4), transparent)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 20px rgba(255, 140, 0, 0.3)',
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      <Helmet><title>{t('common.dashboard')} - {t('common.systemName')}</title></Helmet>

      {/* Enhanced 3D Header with Advanced Animations */}
      <motion.div
        initial={{ opacity: 0, y: -30, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="relative z-10 mb-8"
        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotateY: 15, rotateX: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-orange-500/40 to-pink-500/40 rounded-2xl blur-2xl"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div className="relative bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-2xl p-4 rounded-2xl border-2 border-white/30 shadow-2xl">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Activity className="h-8 w-8 text-orange-300 drop-shadow-lg" />
                </motion.div>
              </div>
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-4xl font-black text-white bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-2xl mb-1"
              >
                {t('dashboard.welcome')} {user?.name || 'المستخدم'} 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-purple-200 text-sm mt-1 font-medium flex items-center gap-2"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ✨
                </motion.span>
                {t('dashboard.subtitle') || 'إليك ما يحدث في متجرك اليوم'}
              </motion.p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <motion.select
              whileHover={{ scale: 1.05, borderColor: 'rgba(255, 140, 0, 0.5)' }}
              whileFocus={{ scale: 1.05 }}
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-4 py-2.5 border-2 border-white/30 rounded-xl text-sm bg-white/10 backdrop-blur-xl text-white font-medium shadow-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-500/30 transition-all cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <option value="day" className="bg-gray-800 text-white">اليوم</option>
              <option value="week" className="bg-gray-800 text-white">هذا الأسبوع</option>
              <option value="month" className="bg-gray-800 text-white">هذا الشهر</option>
              <option value="all" className="bg-gray-800 text-white">الكل</option>
            </motion.select>
            <motion.div
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="text-sm text-purple-200 bg-white/10 backdrop-blur-xl px-4 py-2.5 rounded-xl shadow-xl border-2 border-white/20 font-medium"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {formatDateAR(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

                  {/* Enhanced 3D KPI Cards Grid */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10"
                    style={{ perspective: '1200px' }}
                  >
        {/* إجمالي الدخل لكل عملة */}
        {Object.entries(stats.incomeByCurrency).map(([currency, amount], idx) => {
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
              index={idx}
            />
          );
        })}
        
        {/* إجمالي المصروفات لكل عملة */}
        {Object.entries(stats.expensesByCurrency).map(([currency, amount], idx) => {
          const incomeIdx = Object.keys(stats.incomeByCurrency).length;
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
              index={incomeIdx + idx}
            />
          );
        })}
        
        {/* صافي الربح لكل عملة */}
        {Object.entries(stats.incomeByCurrency).map(([currency, income], idx) => {
          const expensesCount = Object.keys(stats.expensesByCurrency).length;
          const incomeCount = Object.keys(stats.incomeByCurrency).length;
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
              index={incomeCount + expensesCount + idx}
            />
          );
        })}
        
        {/* الموظفون النشطون - بطاقة متقدمة */}
        <ActiveUsersCard t={t} />
        
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
      </motion.div>

      {/* Enhanced 3D Charts Section with Ultra Advanced Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10" style={{ perspective: '2000px' }}>
        <motion.div
          initial={{ opacity: 0, x: -50, rotateY: -15, z: -50 }}
          animate={{ opacity: 1, x: 0, rotateY: 0, z: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 100, damping: 20 }}
          whileHover={{ rotateY: 5, z: 20, scale: 1.02 }}
          className="lg:col-span-2 relative overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Ultra Advanced Glassmorphism Container with 3D Effects */}
          <div className="relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-white/20 hover:border-orange-500/50 transition-all duration-500"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 0 100px rgba(255, 140, 0, 0.15), 0 0 200px rgba(236, 72, 153, 0.1)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Ultra Advanced 3D Background Effects */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-pink-500/15 to-purple-500/15 rounded-3xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                background: [
                  'linear-gradient(135deg, rgba(255, 140, 0, 0.15) 0%, rgba(236, 72, 153, 0.15) 50%, rgba(168, 85, 247, 0.15) 100%)',
                  'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(255, 140, 0, 0.2) 100%)',
                  'linear-gradient(135deg, rgba(255, 140, 0, 0.15) 0%, rgba(236, 72, 153, 0.15) 50%, rgba(168, 85, 247, 0.15) 100%)',
                ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            
            {/* 3D Rotating Gradient Border */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.4), rgba(236, 72, 153, 0.4), rgba(168, 85, 247, 0.4))',
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Holographic Shimmer Effect */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 2,
                ease: 'linear',
              }}
            />

            <motion.h3
              initial={{ opacity: 0, y: -10, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="text-3xl font-black text-white mb-6 bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-2xl relative z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {t('dashboard.financialOverview')}
            </motion.h3>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-80 relative z-10"
            >
              <Line 
                options={{ 
                  maintainAspectRatio: false, 
                  responsive: true,
                  animation: {
                    duration: 1500,
                    easing: 'easeOutQuart',
                  },
                  plugins: {
                    legend: {
                      labels: {
                        font: { size: 14, weight: 'bold' },
                        color: '#1f2937',
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    },
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    },
                  },
                }} 
                data={chartData} 
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Advanced Financial Box with ApexCharts */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <AdvancedFinancialBox t={t} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              }}
            >
              {/* Animated Glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-pink-500/5 to-orange-500/5 rounded-2xl"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <motion.h3 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-black text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
                >
                  {t('dashboard.lowStock')}
                </motion.h3>
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 via-pink-500 to-red-500 text-white text-sm rounded-full font-bold shadow-lg"
                  animate={{
                    boxShadow: [
                      '0 4px 15px rgba(239, 68, 68, 0.3)',
                      '0 4px 25px rgba(236, 72, 153, 0.5)',
                      '0 4px 15px rgba(239, 68, 68, 0.3)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {stats.lowStock} {t('dashboard.items')}
                </motion.span>
              </div>
              {stats.lowStock > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3 relative z-10"
                >
                  <motion.div 
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center gap-4 text-sm p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl border-2 border-red-200 dark:border-red-900/50 shadow-lg"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </motion.div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.actionNeeded')}</span>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="text-center py-8 relative z-10"
                >
                  <motion.div 
                    className="inline-flex items-center gap-2 text-green-600 dark:text-green-400"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <CheckCircle className="h-6 w-6" />
                    <span className="font-semibold">{t('dashboard.allStockHealthy')}</span>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default React.memo(DashboardPage);
