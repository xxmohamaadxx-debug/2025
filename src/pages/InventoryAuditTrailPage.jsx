import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { History, Loader2, Filter, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const InventoryAuditTrailPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (user?.tenant_id) {
      loadChanges();
    }
  }, [user?.tenant_id]);

  const loadChanges = async (productId = null) => {
    setLoading(true);
    try {
      const data = await neonService.getInventoryChanges(user.tenant_id, productId);
      setChanges(data || []);
    } catch (error) {
      console.error('Load changes error:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل السجل', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeColor = (type) => {
    const colors = {
      'add': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'remove': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'export': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'adjustment': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'fuel_deduction': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getChangeTypeLabel = (type) => {
    const labels = {
      'add': 'إضافة',
      'remove': 'إزالة',
      'export': 'تصدير',
      'adjustment': 'تعديل',
      'fuel_deduction': 'خصم وقود'
    };
    return labels[type] || type;
  };

  const filteredChanges = changes.filter(change => {
    const matchesProduct = !filterProduct || change.product_name.includes(filterProduct);
    const matchesType = !filterType || change.change_type === filterType;
    const matchesDate = !filterDate || new Date(change.recorded_at).toLocaleDateString() === new Date(filterDate).toLocaleDateString();
    return matchesProduct && matchesType && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>سجل تغييرات المخزون - نظام إبراهيم للمحاسبة</title>
      </Helmet>

      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">سجل تغييرات المخزون</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تتبع جميع التغييرات والحركات في المخزون</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">الفلاتر</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="البحث عن منتج..."
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">جميع الأنواع</option>
            <option value="add">إضافة</option>
            <option value="remove">إزالة</option>
            <option value="export">تصدير</option>
            <option value="adjustment">تعديل</option>
            <option value="fuel_deduction">خصم وقود</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Table */}
      {filteredChanges.length > 0 ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">المنتج</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">النوع</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">الكمية</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">الملاحظات</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">التاريخ والوقت</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">المرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredChanges.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{change.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{change.product_code || 'بدون كود'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getChangeTypeColor(change.change_type)}`}>
                      {getChangeTypeLabel(change.change_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${
                      change.quantity_changed > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {change.quantity_changed > 0 ? '+' : ''}{change.quantity_changed}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {change.notes || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(change.recorded_at).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {change.reference_type && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                        {change.reference_type} #{change.reference_id}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 dark:text-gray-400">لم يتم العثور على أي تغييرات</p>
        </div>
      )}

      {/* Summary */}
      {filteredChanges.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { type: 'add', label: 'إضافات', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            { type: 'remove', label: 'إزالات', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { type: 'export', label: 'تصديرات', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
            { type: 'adjustment', label: 'تعديلات', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
          ].map(stat => {
            const count = filteredChanges.filter(c => c.change_type === stat.type).length;
            return (
              <div key={stat.type} className={`p-4 rounded-lg ${stat.color}`}>
                <p className="text-sm font-medium opacity-75">{stat.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryAuditTrailPage;
