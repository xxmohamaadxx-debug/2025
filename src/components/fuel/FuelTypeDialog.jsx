import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const FuelTypeDialog = ({ open, onOpenChange, fuelType, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    name_tr: '',
    unit: 'liter',
    is_active: true
  });

  useEffect(() => {
    if (fuelType && open) {
      setFormData({
        code: fuelType.code || '',
        name_ar: fuelType.name_ar || '',
        name_en: fuelType.name_en || '',
        name_tr: fuelType.name_tr || '',
        unit: fuelType.unit || 'liter',
        is_active: fuelType.is_active !== undefined ? fuelType.is_active : true
      });
    } else if (open) {
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        name_tr: '',
        unit: 'liter',
        is_active: true
      });
    }
  }, [fuelType, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fuelType ? 'تعديل نوع محروقات' : 'إضافة نوع محروقات جديد'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الكود *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="gasoline_95"
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
              placeholder="بنزين 95"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم (إنجليزي)</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="Gasoline 95"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم (تركي)</label>
            <input
              type="text"
              value={formData.name_tr}
              onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="Benzin 95"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوحدة *</label>
            <select
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="liter">لتر</option>
              <option value="gallon">جالون</option>
              <option value="kg">كيلوغرام</option>
            </select>
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

export default FuelTypeDialog;

