
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeNumber } from '@/lib/numberUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DashboardCharts = ({ income, expenses }) => {
  const { t } = useLanguage();

  // Prepare data for Bar Chart (Income vs Expenses)
  const barData = {
    labels: ['TRY', 'USD', 'SYP'],
    datasets: [
      {
        label: t('dashboard.totalIncome'),
        data: [safeNumber(income.TRY, 0), safeNumber(income.USD, 0), safeNumber(income.SYP, 0)],
        backgroundColor: 'rgba(34, 197, 94, 0.7)', // Green
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: t('dashboard.totalExpenses'),
        data: [safeNumber(expenses.TRY, 0), safeNumber(expenses.USD, 0), safeNumber(expenses.SYP, 0)],
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('dashboard.financialOverviewByCurrency'),
      },
    },
  };

  // Prepare data for Doughnut Chart (Transaction Volume Count - Mocked logic for visual)
  // In a real app, you'd count actual transactions per currency
  const doughnutData = {
    labels: [
      `${t('dashboard.currencies.TRY')} ${t('dashboard.transactions')}`,
      `${t('dashboard.currencies.USD')} ${t('dashboard.transactions')}`,
      `${t('dashboard.currencies.SYP')} ${t('dashboard.transactions')}`
    ],
    datasets: [
      {
        data: [65, 25, 10], // Mock distribution
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)', // Orange
          'rgba(54, 162, 235, 0.7)', // Blue
          'rgba(255, 99, 132, 0.7)', // Pink
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <Bar options={barOptions} data={barData} />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center">
        <div className="w-3/4">
          <h3 className="text-center text-gray-600 dark:text-gray-300 font-semibold mb-4">{t('dashboard.transactionVolume')}</h3>
          <Doughnut data={doughnutData} />
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
