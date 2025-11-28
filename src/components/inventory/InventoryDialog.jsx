
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
    product_code: '', // رمز المنتج - اختياري
    sku: '', // كود المنتج
    code: '', // كود إضافي
    name: '',
    category: '', // الفئة
    unit: 'piece',
    price: '',
    currency: withDefaultCurrency(),
    quantity: '0', // الكمية الحالية
    min_stock: '5',
    notes: ''
  });

  const [currentStock, setCurrentStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');

  useEffect(() => {
    if (item) {
      setFormData({
        product_code: item.product_code || '',
        sku: item.sku || '',
        code: item.code || item.sku || '',
        name: item.name || '',
        category: item.category || '',
        unit: item.unit || 'piece',
        price: item.price || '',
        currency: withDefaultCurrency(item.currency),
        quantity: item.quantity || '0',
        min_stock: item.min_stock || item.minStock || '5',
        notes: item.notes || ''
      });
      setCurrentStock(item.quantity || '0');
      setLowStockThreshold(item.min_stock || '5');
    } else {
      setFormData({
        product_code: '',
        sku: '',
        code: '',
        name: '',
        category: '',
        unit: 'piece',
        price: '',
        currency: withDefaultCurrency(),
        quantity: '0',
        min_stock: '5',
        notes: ''
      });
      setCurrentStock('0');
      setLowStockThreshold('5');
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const getStockStatus = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const threshold = parseFloat(formData.min_stock) || 0;
    
    if (qty <= threshold) return { status: 'منخفض', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (qty <= threshold * 1.5) return { status: 'تحذير', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'متوفر', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const stockStatus = getStockStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بيانات المنتج. رمز المنتج اختياري. تأكد من إدخال اسم المنتج والكمية والحد الأدنى للمخزون. يمكنك إضافة فئة/قسم للمنتج."
          helpTextEn="Here you can add or edit product data. Product code is optional. Make sure to enter the product name, quantity, and minimum stock. You can add a category/section for the product."
          helpTextTr="Burada ürün verilerini ekleyebilir veya düzenleyebilirsiniz. Ürün kodu isteğe bağlıdır. Ürün adını, miktarını ve minimum stoğu girdiğinizden emin olun. Ürüne bir kategori/bölüm ekleyebilirsiniz."
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
          {/* رمز المنتج واسم المنتج */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                رمز المنتج (اختياري)
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="مثال: PRD-001"
              />
              <p className="text-xs text-gray-500 mt-1">رمز فريد للمنتج (اختياري)</p>
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

          {/* الفئة والكود */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">الفئة/القسم</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="مثال: إلكترونيات، ملابس"
              />
              <p className="text-xs text-gray-500 mt-1">لتنظيم المنتجات حسب الفئات</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">{t('inventory.sku')} / كود إضافي (اختياري)</label>
              <input
                type="text"
                value={formData.code || formData.sku}
                onChange={(e) => setFormData({ ...formData, code: e.target.value, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('inventory.skuPlaceholder')}
              />
            </div>
          </div>

          {/* الكمية والوحدة */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">الكمية الحالية</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
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
          </div>

          {/* السعر والعملة */}
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

          {/* الحد الأدنى للمخزون */}
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">الحد الأدنى للمخزون (لتنبيهات المخزون المنخفض)</label>
            <input
              type="number"
              step="0.01"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="5"
            />
            <p className="text-xs text-gray-500 mt-1">سيتم تنبيهك عندما تنخفض الكمية عن هذا الحد (يمكن لكل متجر تحديد حده الخاص)</p>
          </div>

          {/* إحصائية المخزون */}
          <div className={`p-4 rounded-lg ${stockStatus.bgColor} border border-gray-200 dark:border-gray-700`}>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">الكمية المتوفرة</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {parseFloat(formData.quantity || 0).toFixed(2)} {formData.unit}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">الحد الأدنى</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {parseFloat(formData.min_stock || 0).toFixed(2)} {formData.unit}
                </p>
              </div>
              <div>
                <p className={`text-sm font-medium ${stockStatus.color}`}>حالة المخزون</p>
                <p className={`text-lg font-bold ${stockStatus.color}`}>
                  {stockStatus.status}
                </p>
              </div>
            </div>
            {parseFloat(formData.quantity || 0) <= parseFloat(formData.min_stock || 0) && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                ⚠️ تنبيه: المخزون منخفض! الكمية الحالية أقل من أو تساوي الحد الأدنى.
              </p>
            )}
          </div>

          {/* الملاحظات */}
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
