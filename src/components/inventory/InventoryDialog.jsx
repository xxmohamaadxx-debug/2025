
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpButton from '@/components/ui/HelpButton';
import { getCurrencyOptions, withDefaultCurrency } from '@/lib/currencyHelpers';

const InventoryDialog = ({ open, onOpenChange, item, onSave }) => {
  const { t } = useLanguage();
  const currencyOptions = getCurrencyOptions();
  const [formData, setFormData] = useState({
    sku: '', // كود المنتج
    code: '', // كود إضافي
    name: '',
    unit: 'piece',
    price: '',
    currency: withDefaultCurrency(),
    min_stock: '5',
    notes: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || '',
        code: item.code || item.sku || '', // استخدام code أو sku
        name: item.name || '',
        unit: item.unit || 'piece',
        price: item.price || '',
        currency: withDefaultCurrency(item.currency),
        min_stock: item.min_stock || item.minStock || '5',
        notes: item.notes || ''
      });
    } else {
      setFormData({
        sku: '',
        code: '',
        name: '',
        unit: 'piece',
        price: '',
        currency: withDefaultCurrency(),
        min_stock: '5',
        notes: ''
      });
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بيانات المنتج في المستودع. تأكد من إدخال كود المنتج (SKU) بشكل صحيح، وحدد الكمية والحد الأدنى للمخزون. السعر والعملة مهمان لتتبع القيمة المالية للمنتج."
          helpTextEn="Here you can add or edit product data in the warehouse. Make sure to enter the product code (SKU) correctly, and specify the quantity and minimum stock. Price and currency are important for tracking the financial value of the product."
          helpTextTr="Burada depodaki ürün verilerini ekleyebilir veya düzenleyebilirsiniz. Ürün kodunu (SKU) doğru girdiğinizden emin olun ve miktarı ile minimum stoğu belirtin. Fiyat ve para birimi, ürünün finansal değerini takip etmek için önemlidir."
        />
        <DialogHeader>
          <DialogTitle>
            {item ? t('common.edit') : t('common.add')} {t('inventory.product')}
          </DialogTitle>
          <DialogDescription>
            {item ? 'قم بتعديل بيانات المنتج في المستودع' : 'قم بإدخال بيانات منتج جديد في المستودع'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('inventory.sku')} / كود المنتج</label>
              <input
                type="text"
                required
                value={formData.code || formData.sku}
                onChange={(e) => setFormData({ ...formData, code: e.target.value, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('inventory.skuPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('inventory.productName')}</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('inventory.productName')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('inventory.unit')}</label>
              <select
                 value={formData.unit}
                 onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="piece">{t('inventory.unitPcs')}</option>
                <option value="kg">{t('inventory.unitKg')}</option>
                <option value="m">{t('inventory.unitM')}</option>
                <option value="l">{t('inventory.unitL')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('inventory.minStock')}</label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.price')}</label>
               <input
                 type="number"
                 step="0.01"
                 required
                 value={formData.price}
                 onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                 placeholder={t('common.price')}
               />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.currency')}</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {currencyOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.notes')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows="2"
              placeholder={t('common.notes')}
            />
          </div>

          <div className="flex gap-4 mt-6 rtl:flex-row-reverse">
            <InteractiveButton
              variant="cancel"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </InteractiveButton>
            <InteractiveButton
              variant="save"
              type="submit"
            >
              {t('common.save')}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDialog;
