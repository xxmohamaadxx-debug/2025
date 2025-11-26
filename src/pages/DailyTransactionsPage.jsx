import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Filter, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';

const DailyTransactionsPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadTransactions();
  }, [user, filterDate]);

  const loadTransactions = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getDailyTransactions(user.tenant_id, filterDate);
      setTransactions(data || []);
    } catch (error) {
      console.error('Load transactions error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الحركات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.transaction_type !== filterType) return false;
    if (filterCurrency !== 'all' && t.currency !== filterCurrency) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const summary = filteredTransactions.reduce((acc, t) => {
    if (t.transaction_type === 'income') acc.income += parseFloat(t.amount || 0);
    if (t.transaction_type === 'expense') acc.expenses += parseFloat(t.amount || 0);
    if (t.transaction_type === 'payment') acc.payments += parseFloat(t.amount || 0);
    if (t.transaction_type === 'receipt') acc.receipts += parseFloat(t.amount || 0);
    return acc;
  }, { income: 0, expenses: 0, payments: 0, receipts: 0 });

  const profit = summary.income - summary.expenses;

  return (
    <div className="space-y-6">
      <Helmet><title>الحركة اليومية</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            الحركة اليومية
          </h1>
        </div>
      </div>

      {/* الفلترة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">النوع</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">الكل</option>
              <option value="income">دخل</option>
              <option value="expense">مصروف</option>
              <option value="payment">دفعة</option>
              <option value="receipt">استلام</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">العملة</label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">الكل</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="SYP">SYP</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">إجمالي الدخل</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {summary.income.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {summary.expenses.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">إجمالي الدفعات</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {summary.payments.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className={`rounded-lg p-4 border ${profit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                صافي الربح/الخسارة
              </p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {profit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {profit >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">النوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">العملة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوصف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">طريقة الدفع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    لا توجد حركات
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const currencyInfo = CURRENCIES[transaction.currency] || { symbol: transaction.currency };
                  const typeLabels = {
                    income: 'دخل',
                    expense: 'مصروف',
                    payment: 'دفعة',
                    receipt: 'استلام'
                  };
                  const typeColors = {
                    income: 'text-green-600 bg-green-50',
                    expense: 'text-red-600 bg-red-50',
                    payment: 'text-blue-600 bg-blue-50',
                    receipt: 'text-purple-600 bg-purple-50'
                  };
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${typeColors[transaction.transaction_type] || 'text-gray-600 bg-gray-50'}`}>
                          {typeLabels[transaction.transaction_type] || transaction.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {currencyInfo.symbol} {parseFloat(transaction.amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {transaction.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {transaction.payment_method === 'cash' ? 'كاش' : 
                         transaction.payment_method === 'transfer' ? 'حوالة' : 
                         transaction.payment_method === 'credit' ? 'دين' : transaction.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDateShort(transaction.transaction_date || transaction.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyTransactionsPage;

