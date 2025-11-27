import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Edit, Trash2, Filter, Calendar, TrendingDown, Receipt, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import { exportToExcel } from '@/lib/exportUtils';
import DailyExpenseDialog from '@/components/expenses/DailyExpenseDialog';
import HelpButton from '@/components/ui/HelpButton';
import GlassCard from '@/components/ui/GlassCard';

const DailyExpensesPage = () => {
  const { user, tenant } = useAuth();
  const { t, locale } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadExpenses();
  }, [user, filterDate]);

  const loadExpenses = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getDailyExpenses(user.tenant_id, filterDate).catch(() => []);
      setExpenses(data || []);
    } catch (error) {
      console.error('Load expenses error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المصاريف',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setDialogOpen(true);
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setDialogOpen(true);
  };

  const handleSaveExpense = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedExpense) {
        await neonService.updateDailyExpense(selectedExpense.id, { ...data, updated_by: user.id }, user.tenant_id);
        toast({ title: 'تم تحديث المصروف بنجاح' });
      } else {
        await neonService.createDailyExpense({ ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم إضافة المصروف بنجاح' });
      }
      setDialogOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('Save expense error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ المصروف',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      await neonService.deleteDailyExpense(id, user.tenant_id);
      toast({ title: 'تم حذف المصروف بنجاح' });
      loadExpenses();
    } catch (error) {
      console.error('Delete expense error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف المصروف',
        variant: 'destructive'
      });
    }
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'expense_date', label: 'التاريخ', formatter: (val) => formatDateAR(val) },
      { key: 'category', label: 'الفئة' },
      { key: 'description', label: 'الوصف' },
      { key: 'amount', label: 'المبلغ', formatter: (val) => parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
      { key: 'currency', label: 'العملة' },
      { key: 'payment_method', label: 'طريقة الدفع' },
      { key: 'supplier_name', label: 'المورد' },
      { key: 'receipt_number', label: 'رقم الإيصال' }
    ];

    exportToExcel(filteredExpenses, {
      title: `المصاريف اليومية - ${formatDateAR(filterDate)}`,
      columns,
      filename: `daily_expenses_${filterDate}.xlsx`,
      locale: locale
    });

    toast({ title: 'تم تصدير التقرير بنجاح' });
  };

  const filteredExpenses = expenses.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterCurrency !== 'all' && e.currency !== filterCurrency) return false;
    if (searchTerm && !e.description?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !e.category?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !e.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))];
  const summary = filteredExpenses.reduce((acc, e) => {
    acc.total += parseFloat(e.amount || 0);
    if (!acc.byCategory[e.category]) acc.byCategory[e.category] = 0;
    acc.byCategory[e.category] += parseFloat(e.amount || 0);
    return acc;
  }, { total: 0, byCategory: {} });

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <Helmet><title>المصاريف اليومية - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            المصاريف اليومية
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAddExpense} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm sm:text-base">
            <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة مصروف
          </Button>
          {filteredExpenses.length > 0 && (
            <Button onClick={handleExportExcel} variant="outline" className="text-sm sm:text-base">
              <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> تصدير Excel
            </Button>
          )}
        </div>
      </div>

      {/* الفلترة */}
      <GlassCard className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">التاريخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">الفئة</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">الكل</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">العملة</label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">الكل</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="SYP">SYP</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </GlassCard>

      {/* الملخص */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <GlassCard className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">إجمالي المصاريف</p>
              <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">
                {summary.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </div>
        </GlassCard>
        <GlassCard className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">عدد المصاريف</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {filteredExpenses.length}
              </p>
            </div>
            <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </div>
        </GlassCard>
        <GlassCard className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">الفئات</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                {categories.length}
              </p>
            </div>
            <Filter className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </div>
        </GlassCard>
      </div>

      {/* الجدول */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الفئة</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوصف</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المبلغ</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">العملة</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">طريقة الدفع</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    لا توجد مصاريف
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const currencyInfo = CURRENCIES[expense.currency] || { symbol: expense.currency };
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {formatDateShort(expense.expense_date || expense.created_at)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {currencyInfo.symbol} {parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {expense.currency}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {expense.payment_method === 'cash' ? 'كاش' : 
                         expense.payment_method === 'transfer' ? 'حوالة' : 
                         expense.payment_method === 'credit_card' ? 'بطاقة' : expense.payment_method}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditExpense(expense)}
                            title="تعديل"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteExpense(expense.id)}
                            title="حذف"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <DailyExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
      />
    </div>
  );
};

export default DailyExpensesPage;

