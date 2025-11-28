import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Plus, Edit2, Trash2, Loader2, Layers } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const InventoryCategoriesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });

  useEffect(() => {
    if (user?.tenant_id) {
      loadCategories();
    }
  }, [user?.tenant_id]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await neonService.getInventoryCategories(user.tenant_id);
      setCategories(data || []);
    } catch (error) {
      console.error('Load categories error:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل الأقسام', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (category = null) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color || '#3B82F6',
      });
    } else {
      setSelectedCategory(null);
      setFormData({ name: '', description: '', color: '#3B82F6' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم القسم مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (selectedCategory) {
        await neonService.updateInventoryCategory(selectedCategory.id, formData);
        toast({ title: 'تم بنجاح', description: 'تم تحديث القسم' });
      } else {
        await neonService.createInventoryCategory(user.tenant_id, formData);
        toast({ title: 'تم بنجاح', description: 'تم إضافة قسم جديد' });
      }
      setDialogOpen(false);
      loadCategories();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد حذف هذا القسم؟')) return;

    try {
      await neonService.deleteInventoryCategory(id);
      toast({ title: 'تم بنجاح', description: 'تم حذف القسم' });
      loadCategories();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

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
        <title>إدارة أقسام المخزون - نظام إبراهيم للمحاسبة</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">إدارة أقسام المخزون</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">تنظيم المنتجات حسب الأقسام والفئات</p>
          </div>
        </div>
        <button
          onClick={() => openDialog()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          إضافة قسم
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2" style={{ backgroundColor: category.color || '#3B82F6' }}></div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{category.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => openDialog(category)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 dark:text-gray-400">لم يتم إضافة أقسام بعد</p>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم القسم</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثال: الإلكترونيات"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الوصف (اختياري)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="وصف القسم"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اللون</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              حفظ
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryCategoriesPage;
