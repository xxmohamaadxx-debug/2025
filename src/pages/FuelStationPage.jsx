import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Edit, Trash2, Fuel, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import FuelTypeDialog from '@/components/fuel/FuelTypeDialog';
import FuelTransactionDialog from '@/components/fuel/FuelTransactionDialog';

const FuelStationPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [fuelTypes, setFuelTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedFuelType, setSelectedFuelType] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'inventory', 'types'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterFuelType, setFilterFuelType] = useState('all');

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user, activeTab, filterDate]);

  const loadData = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      if (activeTab === 'types') {
        const types = await neonService.getFuelTypes(user.tenant_id);
        setFuelTypes(types || []);
      } else if (activeTab === 'transactions') {
        const trans = await neonService.getFuelTransactions(user.tenant_id, null, filterDate, filterDate);
        setTransactions(trans || []);
      } else if (activeTab === 'inventory') {
        const inv = await neonService.getFuelInventory(user.tenant_id);
        setInventory(inv || []);
      }
    } catch (error) {
      console.error('Load fuel data error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل البيانات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFuelType = () => {
    setSelectedFuelType(null);
    setTypeDialogOpen(true);
  };

  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setTransactionDialogOpen(true);
  };

  const handleSaveFuelType = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedFuelType) {
        await neonService.updateFuelType(selectedFuelType.id, data, user.tenant_id);
        toast({ title: 'تم تحديث نوع المحروقات بنجاح' });
      } else {
        await neonService.createFuelType(data, user.tenant_id);
        toast({ title: 'تم إضافة نوع المحروقات بنجاح' });
      }
      setTypeDialogOpen(false);
      setSelectedFuelType(null);
      loadData();
    } catch (error) {
      console.error('Save fuel type error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ نوع المحروقات',
        variant: 'destructive'
      });
    }
  };

  const handleSaveTransaction = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedTransaction) {
        await neonService.updateFuelTransaction(selectedTransaction.id, { ...data, updated_by: user.id }, user.tenant_id);
        toast({ title: 'تم تحديث المعاملة بنجاح' });
      } else {
        await neonService.createFuelTransaction({ ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم إضافة المعاملة بنجاح' });
      }
      setTransactionDialogOpen(false);
      setSelectedTransaction(null);
      loadData();
      // إعادة تحميل المخزون أيضاً
      if (activeTab !== 'inventory') {
        const inv = await neonService.getFuelInventory(user.tenant_id);
        setInventory(inv || []);
      }
    } catch (error) {
      console.error('Save fuel transaction error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ المعاملة',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFuelType = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف نوع المحروقات؟')) return;

    try {
      await neonService.deleteFuelType(id, user.tenant_id);
      toast({ title: 'تم حذف نوع المحروقات بنجاح' });
      loadData();
    } catch (error) {
      console.error('Delete fuel type error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف نوع المحروقات',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return;

    try {
      await neonService.deleteFuelTransaction(id, user.tenant_id);
      toast({ title: 'تم حذف المعاملة بنجاح' });
      loadData();
    } catch (error) {
      console.error('Delete fuel transaction error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف المعاملة',
        variant: 'destructive'
      });
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterFuelType !== 'all' && t.fuel_type_id !== filterFuelType) return false;
    return true;
  });

  const totalPurchased = filteredTransactions
    .filter(t => t.transaction_type === 'purchase')
    .reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
  
  const totalSold = filteredTransactions
    .filter(t => t.transaction_type === 'sale')
    .reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <Helmet><title>متجر المحروقات - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Fuel className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            متجر المحروقات
          </h1>
        </div>
        <div className="flex gap-2">
          {activeTab === 'types' && (
            <Button onClick={handleAddFuelType} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة نوع محروقات
            </Button>
          )}
          {activeTab === 'transactions' && (
            <Button onClick={handleAddTransaction} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة معاملة
            </Button>
          )}
        </div>
      </div>

      {/* التبويبات */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            المعاملات
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'inventory'
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            المخزون
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'types'
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            أنواع المحروقات
          </button>
        </div>
      </div>

      {/* الملخص - للمعاملات */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {totalSold.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">إجمالي المشتريات</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {totalPurchased.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className={`rounded-lg p-4 border ${
            (totalSold - totalPurchased) >= 0 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${
                  (totalSold - totalPurchased) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  صافي الربح/الخسارة
                </p>
                <p className={`text-2xl font-bold ${
                  (totalSold - totalPurchased) >= 0 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {(totalSold - totalPurchased).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {(totalSold - totalPurchased) >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* الفلترة - للمعاملات */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-2">نوع المحروقات</label>
              <select
                value={filterFuelType}
                onChange={(e) => setFilterFuelType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">الكل</option>
                {fuelTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* محتوى التبويبات */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المحروقات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الكمية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">سعر الوحدة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجمالي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      لا توجد معاملات
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const typeColors = {
                      purchase: 'text-blue-600 bg-blue-50',
                      sale: 'text-green-600 bg-green-50',
                      adjustment: 'text-yellow-600 bg-yellow-50',
                      loss: 'text-red-600 bg-red-50'
                    };
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${typeColors[transaction.transaction_type] || 'text-gray-600 bg-gray-50'}`}>
                            {transaction.transaction_type === 'purchase' ? 'شراء' :
                             transaction.transaction_type === 'sale' ? 'بيع' :
                             transaction.transaction_type === 'adjustment' ? 'تعديل' : 'فقد'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {transaction.fuel_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {parseFloat(transaction.quantity || 0).toLocaleString('ar-EG', { minimumFractionDigits: 3 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {parseFloat(transaction.unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {parseFloat(transaction.total_amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {transaction.transaction_date ? formatDateShort(transaction.transaction_date) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setTransactionDialogOpen(true);
                              }}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              title="حذف"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
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
        )}

        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">نوع المحروقات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الكمية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوحدة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحد الأدنى</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">آخر شراء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">آخر بيع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      لا يوجد مخزون
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const statusColors = {
                      low_stock: 'text-red-600 bg-red-50',
                      high_stock: 'text-blue-600 bg-blue-50',
                      normal: 'text-green-600 bg-green-50'
                    };
                    
                    return (
                      <tr key={item.fuel_type_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.fuel_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          {parseFloat(item.quantity || 0).toLocaleString('ar-EG', { minimumFractionDigits: 3 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.unit || 'liter'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {parseFloat(item.min_stock_level || 0).toLocaleString('ar-EG', { minimumFractionDigits: 3 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[item.stock_status] || 'text-gray-600 bg-gray-50'}`}>
                            {item.stock_status === 'low_stock' ? 'منخفض' :
                             item.stock_status === 'high_stock' ? 'مرتفع' : 'طبيعي'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.last_purchase_date ? formatDateShort(item.last_purchase_date) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.last_sale_date ? formatDateShort(item.last_sale_date) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'types' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم (عربي)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم (إنجليزي)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوحدة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    </td>
                  </tr>
                ) : fuelTypes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      لا توجد أنواع محروقات
                    </td>
                  </tr>
                ) : (
                  fuelTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {type.name_ar}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {type.name_en || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {type.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {type.unit || 'liter'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {type.is_active ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                            نشط
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200">
                            غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFuelType(type);
                              setTypeDialogOpen(true);
                            }}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFuelType(type.id)}
                            title="حذف"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FuelTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        fuelType={selectedFuelType}
        onSave={handleSaveFuelType}
      />

      <FuelTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        transaction={selectedTransaction}
        fuelTypes={fuelTypes}
        onSave={handleSaveTransaction}
      />
    </div>
  );
};

export default FuelStationPage;

