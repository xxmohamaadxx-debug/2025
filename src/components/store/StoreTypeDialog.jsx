import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpButton from '@/components/ui/HelpButton';

const StoreTypeDialog = ({ open, onOpenChange, storeType, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    name_tr: '',
    description_ar: '',
    description_en: '',
    sort_order: 0,
    icon: '',
    is_active: true
  });

  useEffect(() => {
    if (storeType && open) {
      setFormData({
        code: storeType.code || '',
        name_ar: storeType.name_ar || '',
        name_en: storeType.name_en || '',
        name_tr: storeType.name_tr || '',
        description_ar: storeType.description_ar || '',
        description_en: storeType.description_en || '',
        sort_order: storeType.sort_order || 0,
        icon: storeType.icon || '',
        is_active: storeType.is_active !== undefined ? storeType.is_active : true
      });
    } else if (open) {
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        name_tr: '',
        description_ar: '',
        description_en: '',
        sort_order: 0,
        icon: '',
        is_active: true
      });
    }
  }, [storeType, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل نوع متجر (مثل: صالة إنترنت، متجر مقاولين، محطة محروقات، متجر إكسسوارات). أدخل الكود، الاسم بالعربية والإنجليزية والتركية، الوصف، الأيقونة، وترتيب العرض. يمكنك تفعيل أو تعطيل النوع."
          helpTextEn="Here you can add or edit a store type (e.g., internet cafe, contractor store, fuel station, accessories store). Enter the code, name in Arabic, English, and Turkish, description, icon, and display order. You can activate or deactivate the type."
          helpTextTr="Burada bir mağaza türü (ör. internet kafe, müteahhit mağazası, benzin istasyonu, aksesuar mağazası) ekleyebilir veya düzenleyebilirsiniz. Kodu, Arapça, İngilizce ve Türkçe adı, açıklamayı, simgeyi ve görüntüleme sırasını girin. Türü etkinleştirebilir veya devre dışı bırakabilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {storeType ? 'تعديل نوع متجر' : 'إضافة نوع متجر جديد'}
          </DialogTitle>
          <DialogDescription>
            {storeType ? 'قم بتعديل بيانات نوع المتجر' : 'قم بإدخال بيانات نوع متجر جديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الكود *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="cyber_cafe"
                disabled={!!storeType}
              />
              {storeType && <p className="text-xs text-gray-500 mt-1">لا يمكن تعديل الكود</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">ترتيب العرض</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم (عربي) *</label>
              <input
                type="text"
                required
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="صالة إنترنت"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم (إنجليزي)</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="Cyber Café"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم (تركي)</label>
              <input
                type="text"
                value={formData.name_tr}
                onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="İnternet Cafe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الأيقونة</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="Store"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف (عربي)</label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="وصف نوع المتجر بالعربية"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف (إنجليزي)</label>
            <textarea
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="Store type description in English"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-orange-500 rounded"
            />
            <label className="text-sm font-medium">نشط</label>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreTypeDialog;

