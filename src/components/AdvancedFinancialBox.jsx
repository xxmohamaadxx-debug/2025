
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { CURRENCIES } from '@/lib/constants';
import { convertCurrency } from '@/lib/currencyService';
import ReactApexChart from 'react-apexcharts';

const AdvancedFinancialBox = ({ t }) => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState({
    balances: {
      TRY: 0,
      USD: 0,
      SYP: 0,
      SAR: 0,
      EUR: 0
    },
    totalUSD: 0,
    debtsOwed: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 },
    debtsDue: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 },
    totalDebtsOwedUSD: 0,
    totalDebtsDueUSD: 0,
    loading: true
  });
  const [chartType, setChartType] = useState('pie'); // pie, bar, line

  useEffect(() => {
    loadFinancialData();
    const interval = setInterval(loadFinancialData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [user?.tenant_id]);

  const loadFinancialData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      // محاولة الحصول على البيانات مع الديون
      let box;
      try {
        box = await neonService.getFinancialBoxWithDebts?.(user.tenant_id);
      } catch (e) {
        // إذا فشلت، استخدم getFinancialBox العادي
        box = await neonService.getFinancialBox(user.tenant_id);
      }
      
      if (box) {
        const balances = {
          TRY: parseFloat(box.try_balance || 0),
          USD: parseFloat(box.usd_balance || 0),
          SYP: parseFloat(box.syp_balance || 0),
          SAR: parseFloat(box.sar_balance || 0),
          EUR: parseFloat(box.eur_balance || 0)
        };

        // حساب إجمالي الديون
        const debtsOwed = box.debts_owed || { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 };
        const debtsDue = box.debts_due || { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 };

        // Calculate total in USD
        const totalUSD = 
          balances.USD +
          convertCurrency(balances.TRY, 'TRY', 'USD') +
          convertCurrency(balances.SYP, 'SYP', 'USD') +
          convertCurrency(balances.SAR, 'SAR', 'USD') +
          convertCurrency(balances.EUR, 'EUR', 'USD');

        const totalDebtsOwedUSD = 
          debtsOwed.usd +
          convertCurrency(debtsOwed.try, 'TRY', 'USD') +
          convertCurrency(debtsOwed.syp, 'SYP', 'USD') +
          convertCurrency(debtsOwed.sar, 'SAR', 'USD') +
          convertCurrency(debtsOwed.eur, 'EUR', 'USD');

        const totalDebtsDueUSD = 
          debtsDue.usd +
          convertCurrency(debtsDue.try, 'TRY', 'USD') +
          convertCurrency(debtsDue.syp, 'SYP', 'USD') +
          convertCurrency(debtsDue.sar, 'SAR', 'USD') +
          convertCurrency(debtsDue.eur, 'EUR', 'USD');

        setFinancialData({ 
          balances, 
          totalUSD, 
          debtsOwed,
          debtsDue,
          totalDebtsOwedUSD,
          totalDebtsDueUSD,
          loading: false 
        });
      }
    } catch (error) {
      console.error('Load financial data error:', error);
      setFinancialData(prev => ({ ...prev, loading: false }));
    }
  };

  const chartData = {
    pie: {
      series: Object.entries(financialData.balances)
        .filter(([_, value]) => value > 0)
        .map(([currency, value]) => {
          const usdValue = currency === 'USD' 
            ? value 
            : convertCurrency(value, currency, 'USD');
          return usdValue;
        }),
      options: {
        chart: {
          type: 'pie',
          animations: {
            enabled: true,
            speed: 800
          }
        },
        labels: Object.entries(financialData.balances)
          .filter(([_, value]) => value > 0)
          .map(([currency]) => CURRENCIES[currency]?.nameAr || currency),
        colors: ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'],
        legend: {
          position: 'bottom'
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`
        }
      }
    },
    bar: {
      series: [{
        name: 'الرصيد (USD)',
        data: Object.entries(financialData.balances)
          .map(([currency, value]) => {
            return currency === 'USD' 
              ? value 
              : convertCurrency(value, currency, 'USD');
          })
      }],
      options: {
        chart: {
          type: 'bar',
          animations: {
            enabled: true,
            speed: 800
          }
        },
        xaxis: {
          categories: Object.keys(financialData.balances).map(c => CURRENCIES[c]?.code || c)
        },
        colors: ['#f97316'],
        dataLabels: {
          enabled: true,
          formatter: (val) => `$${val.toFixed(2)}`
        }
      }
    },
    line: {
      series: [{
        name: 'الرصيد (USD)',
        data: Object.entries(financialData.balances)
          .map(([currency, value]) => {
            return currency === 'USD' 
              ? value 
              : convertCurrency(value, currency, 'USD');
          })
      }],
      options: {
        chart: {
          type: 'line',
          animations: {
            enabled: true,
            speed: 800
          }
        },
        xaxis: {
          categories: Object.keys(financialData.balances).map(c => CURRENCIES[c]?.code || c)
        },
        colors: ['#f97316'],
        stroke: {
          curve: 'smooth',
          width: 3
        }
      }
    }
  };

  if (financialData.loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="animate-pulse">جاري التحميل...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-orange-50/95 via-pink-50/90 to-purple-50/95 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/95 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-orange-200/50 dark:border-gray-700/50 overflow-hidden"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
    >
      {/* Animated Background - matching dashboard style */}
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
      
      <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg"
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Wallet className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              الصندوق المالي
            </h3>
            <motion.p
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl font-black bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mt-1 drop-shadow-sm"
            >
              ${financialData.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={loadFinancialData}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-5 w-5 text-gray-400" />
        </motion.button>
      </div>

      {/* Currency Balances */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(financialData.balances).map(([currency, balance]) => {
          const currencyInfo = CURRENCIES[currency];
          if (!currencyInfo) return null;
          
          const isPositive = balance >= 0;
          const gradientColors = isPositive 
            ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
            : 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20';
          
          return (
            <motion.div
              key={currency}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className={`p-4 rounded-xl bg-gradient-to-br ${gradientColors} border-2 ${isPositive ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'} shadow-md hover:shadow-lg transition-shadow`}
            >
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{currencyInfo.nameAr || currency}</p>
              <p className={`text-lg font-black ${isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {currencyInfo.symbol}{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-2 mb-4">
        {['pie', 'bar', 'line'].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChartType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              chartType === type
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {type === 'pie' ? 'دائري' : type === 'bar' ? 'شريطي' : 'خطي'}
          </motion.button>
        ))}
      </div>

      {/* Debts Section */}
      {(financialData.totalDebtsOwedUSD > 0 || financialData.totalDebtsDueUSD > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            الديون
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financialData.totalDebtsOwedUSD > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800"
              >
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  الديون المطلوبة من العملاء (دائن)
                </p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-400">
                  ${financialData.totalDebtsOwedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </motion.div>
            )}
            {financialData.totalDebtsDueUSD > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800"
              >
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  الديون المستحقة علينا (مدين)
                </p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                  ${financialData.totalDebtsDueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {typeof window !== 'undefined' ? (
        <div className="mt-4">
          <ReactApexChart
            options={chartData[chartType].options}
            series={chartData[chartType].series}
            type={chartType === 'pie' ? 'pie' : chartType === 'bar' ? 'bar' : 'line'}
            height={300}
          />
        </div>
      ) : (
        <div className="mt-4 h-[300px] flex items-center justify-center text-gray-500">
          جاري تحميل الرسم البياني...
        </div>
      )}
      </div>
    </motion.div>
  );
};

export default AdvancedFinancialBox;

