import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { AlertTriangle, Edit2, Loader2, Save, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const LowStockThresholdsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState(null);
  const [editForm, setEditForm] = useState({ minimum_quantity: '' });

  useEffect(() => {
    if (user?.tenant_id) {
      loadThresholds();
    }
  }, [user?.tenant_id]);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      const data = await neonService.getAllLowStockThresholds(user.tenant_id);
      // Normalize fields to avoid NaN in charts / renders
      const normalized = (data || []).map((it) => ({
        id: it.id,
        tenant_id: it.tenant_id,
        product_id: it.product_id,
        product_name: it.product_name || 'منتج',
        product_code: it.product_code || it.sku || null,
        current_quantity: parseFloat(it.current_quantity || 0) || 0,
        minimum_quantity: parseFloat(it.minimum_quantity || it.threshold_quantity || 0) || 0,
        alert_enabled: it.alert_enabled,
        alert_method: it.alert_method,
        notes: it.notes,
      }));
      setThresholds(normalized);
    } catch (error) {
      console.error('Load thresholds error:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل التنبيهات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (threshold) => {
    setSelectedThreshold(threshold);
    setEditForm({ minimum_quantity: threshold.minimum_quantity });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.minimum_quantity || parseFloat(editForm.minimum_quantity) < 0) {
      toast({ title: 'خطأ', description: 'أدخل كمية صحيحة', variant: 'destructive' });
      return;
    }

    try {
      await neonService.setLowStockThreshold(
        user.tenant_id,
        selectedThreshold.product_id,
        parseFloat(editForm.minimum_quantity)
      );
      toast({ title: 'تم بنجاح', description: 'تم تحديث الحد الأدنى' });
      setEditDialogOpen(false);
      loadThresholds();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>تنبيهات المخزون المنخفض - نظام إبراهيم للمحاسبة</title>
      </Helmet>

      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">تنبيهات المخزون المنخفض</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">حدد الحد الأدنى لكل منتج واستقبل تنبيهات عند النقص</p>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          ⚠️ عند نزول كمية المنتج عن الحد الأدنى المحدد، ستستقبل تنبيهات تلقائية لإعادة الطلب
        </p>
      </div>

      {thresholds.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">اسم المنتج</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">الكمية الحالية</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">الحد الأدنى</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {thresholds.map((threshold) => {
                const isLowStock = threshold.current_quantity < threshold.minimum_quantity;
                return (
                  <tr key={threshold.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{threshold.product_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{threshold.product_code || 'بدون كود'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{threshold.current_quantity}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        {threshold.minimum_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          منخفض
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                          متوفر
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditDialog(threshold)}
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                        تعديل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 dark:text-gray-400">لم يتم تحديد حدود دنيا بعد</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">أضف منتجات في المخزون أولاً</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الحد الأدنى</DialogTitle>
          </DialogHeader>
          {selectedThreshold && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">المنتج: {selectedThreshold.product_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">الكمية الحالية: {selectedThreshold.current_quantity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الحد الأدنى الجديد</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.minimum_quantity}
                  onChange={(e) => setEditForm({ ...editForm, minimum_quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  حفظ
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LowStockThresholdsPage;
