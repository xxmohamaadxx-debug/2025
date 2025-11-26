import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2, Store } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import StoreTypeDialog from '@/components/store/StoreTypeDialog';

const StoreTypesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [storeTypes, setStoreTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (user?.isSuperAdmin) loadStoreTypes();
  }, [user]);

  const loadStoreTypes = async () => {
    try {
      setLoading(true);
      const data = await neonService.getStoreTypes();
      setStoreTypes(data || []);
    } catch (error) {
      console.error('Load store types error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل أنواع المتاجر',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedType(null);
    setDialogOpen(true);
  };

  const handleEdit = (type) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedType) {
        await neonService.updateStoreType(selectedType.id, data);
        toast({ title: 'تم تحديث نوع المتجر بنجاح' });
      } else {
        await neonService.createStoreType(data);
        toast({ title: 'تم إضافة نوع المتجر بنجاح' });
      }
      setDialogOpen(false);
      setSelectedType(null);
      loadStoreTypes();
    } catch (error) {
      console.error('Save store type error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ نوع المتجر',
        variant: 'destructive'
      });
    }
  };

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>غير مصرح لك بالوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet><title>أنواع المتاجر - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            أنواع المتاجر
          </h1>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة نوع متجر
        </Button>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الكود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم (عربي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم (إنجليزي)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوصف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ترتيب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
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
              ) : storeTypes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    لا توجد أنواع متاجر
                  </td>
                </tr>
              ) : (
                storeTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {type.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {type.name_ar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {type.name_en || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {type.description_ar || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {type.sort_order || 0}
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
                          onClick={() => handleEdit(type)}
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StoreTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        storeType={selectedType}
        onSave={handleSave}
      />
    </div>
  );
};

export default StoreTypesPage;

