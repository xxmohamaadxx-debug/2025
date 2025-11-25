
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const InventoryDialog = ({ open, onOpenChange, item, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    unit: 'piece',
    price: '',
    currency: 'TRY',
    min_stock: '5',
    notes: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || '',
        name: item.name || '',
        unit: item.unit || 'piece',
        price: item.price || '',
        currency: item.currency || 'TRY',
        min_stock: item.min_stock || item.minStock || '5',
        notes: item.notes || ''
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        unit: 'piece',
        price: '',
        currency: 'TRY',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? t('common.edit') : t('common.add')} {t('inventory.product')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('inventory.sku')}</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder={t('inventory.skuPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('inventory.productName')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder={t('inventory.productName')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('inventory.unit')}</label>
              <select
                 value={formData.unit}
                 onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="piece">{t('inventory.unitPcs')}</option>
                <option value="kg">{t('inventory.unitKg')}</option>
                <option value="m">{t('inventory.unitM')}</option>
                <option value="l">{t('inventory.unitL')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('inventory.minStock')}</label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.price')}</label>
               <input
                 type="number"
                 step="0.01"
                 required
                 value={formData.price}
                 onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                 placeholder={t('common.price')}
               />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.currency')}</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.notes')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder={t('common.notes')}
            />
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

export default InventoryDialog;
