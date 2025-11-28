import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Filter, TrendingUp, TrendingDown, Package, ArrowDownCircle, ArrowUpCircle, Calendar, Activity } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import GlassCard from '@/components/ui/GlassCard';

const WarehouseTransactionsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'inbound', 'outbound', 'adjustment', 'transfer'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'summary'

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user, filterType, filterDate]);

  const loadData = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // جلب حركات المستودع
      const transactionsData = await neonService.getWarehouseTransactions(user.tenant_id) || [];
      const inventoryData = await neonService.getInventory(user.tenant_id) || [];
      
      setTransactions(transactionsData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Load warehouse transactions error:', error);
      toast({
        title: 'خطأ في تحميل البيانات',
        description: error.message || 'فشل تحميل حركات المستودع',
        variant: 'destructive'
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.transaction_type !== filterType) return false;
    if (searchTerm && !t.inventory_item_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterDate && t.transaction_date !== filterDate) return false;
    return true;
  });

  const summary = {
    inbound: filteredTransactions.filter(t => t.transaction_type === 'inbound').reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0),
    outbound: filteredTransactions.filter(t => t.transaction_type === 'outbound').reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0),
    totalValue: filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.quantity || 0) * parseFloat(t.unit_price || 0)), 0)
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>حركات المستودع - الوارد والصادر</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
              حركات المستودع
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              تتبع الوارد والصادر والتحويلات
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'transactions', label: 'الحركات', icon: Activity },
          { id: 'summary', label: 'ملخص', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-all ${
              activeTab === tab.id
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">نوع الحركة</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">جميع الحركات</option>
              <option value="inbound">وارد</option>
              <option value="outbound">صادر</option>
              <option value="adjustment">تعديل</option>
              <option value="transfer">تحويل</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">التاريخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 rtl:text-right">بحث</label>
            <div className="relative">
              <Search className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full px-4 py-2 pr-10 rtl:pl-10 rtl:pr-4 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الوارد</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summary.inbound.toLocaleString('ar-EG')}
              </p>
            </div>
            <ArrowDownCircle className="h-10 w-10 text-green-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الصادر</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summary.outbound.toLocaleString('ar-EG')}
              </p>
            </div>
            <ArrowUpCircle className="h-10 w-10 text-red-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">القيمة الإجمالية</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summary.totalValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} $
              </p>
            </div>
            <Package className="h-10 w-10 text-orange-500" />
          </div>
        </GlassCard>
      </div>

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <GlassCard className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد حركات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">التاريخ</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">النوع</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">المنتج</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">الكمية</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">السعر</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">الإجمالي</th>
                    <th className="px-4 py-3 text-right rtl:text-right text-sm font-semibold text-gray-700 dark:text-gray-300">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const isInbound = transaction.transaction_type === 'inbound';
                    const total = parseFloat(transaction.quantity || 0) * parseFloat(transaction.unit_price || 0);
                    
                    return (
                      <tr key={transaction.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {formatDateAR(transaction.transaction_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isInbound 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {isInbound ? 'وارد' : transaction.transaction_type === 'adjustment' ? 'تعديل' : transaction.transaction_type === 'transfer' ? 'تحويل' : 'صادر'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {transaction.inventory_item_name || transaction.product_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {parseFloat(transaction.quantity || 0).toLocaleString('ar-EG')} {transaction.unit || 'قطعة'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {parseFloat(transaction.unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} $
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} $
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {transaction.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4">ملخص حركات المستودع</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الوارد</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.inbound.toLocaleString('ar-EG')}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الصادر</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.outbound.toLocaleString('ar-EG')}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default WarehouseTransactionsPage;

