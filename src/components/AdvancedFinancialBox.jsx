
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { CURRENCIES } from '@/lib/constants';
import { convertCurrency } from '@/lib/currencyService';

// Dynamic import for ApexCharts (to avoid SSR issues)
let Chart;
if (typeof window !== 'undefined') {
  try {
    const ApexCharts = require('react-apexcharts');
    Chart = ApexCharts.default || ApexCharts;
  } catch (e) {
    console.warn('ApexCharts not available:', e);
  }
}

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
      const box = await neonService.getFinancialBox(user.tenant_id);
      if (box) {
        const balances = {
          TRY: parseFloat(box.try_balance || 0),
          USD: parseFloat(box.usd_balance || 0),
          SYP: parseFloat(box.syp_balance || 0),
          SAR: parseFloat(box.sar_balance || 0),
          EUR: parseFloat(box.eur_balance || 0)
        };

        // Calculate total in USD
        const totalUSD = 
          balances.USD +
          convertCurrency(balances.TRY, 'TRY', 'USD') +
          convertCurrency(balances.SYP, 'SYP', 'USD') +
          convertCurrency(balances.SAR, 'SAR', 'USD') +
          convertCurrency(balances.EUR, 'EUR', 'USD');

        setFinancialData({ balances, totalUSD, loading: false });
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
      className="bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50"
    >
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
              className="text-3xl font-black text-gray-900 dark:text-white mt-1"
            >
              ${financialData.totalUSD.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          
          return (
            <motion.div
              key={currency}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-600"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{currencyInfo.nameAr || currency}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {currencyInfo.symbol}{balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
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

      {/* Chart */}
      {typeof window !== 'undefined' && Chart && (
        <div className="mt-4">
          <Chart
            options={chartData[chartType].options}
            series={chartData[chartType].series}
            type={chartType === 'pie' ? 'pie' : chartType === 'bar' ? 'bar' : 'line'}
            height={300}
          />
        </div>
      )}
      {(!Chart || typeof window === 'undefined') && (
        <div className="mt-4 h-[300px] flex items-center justify-center text-gray-500">
          جاري تحميل الرسم البياني...
        </div>
      )}
    </motion.div>
  );
};

export default AdvancedFinancialBox;

