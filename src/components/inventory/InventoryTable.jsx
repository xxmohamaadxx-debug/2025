
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const InventoryTable = ({ items, onEdit, onDelete }) => {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('inventory.noItems') || 'لا توجد منتجات في المستودع. أضف منتجك الأول!'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('inventory.sku') || 'الرمز'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('inventory.productName') || 'اسم المنتج'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('inventory.availableQuantity') || 'الكمية المتاحة'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('common.price') || 'السعر'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('inventory.minStock') || 'الحد الأدنى'}</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('common.actions') || 'الإجراءات'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => {
            const min = item.min_stock ?? item.minStock ?? 0;
            const available = item.available_quantity ?? item.quantity ?? 0;
            const isLowStock = parseFloat(available) <= parseFloat(min);
            return (
            <tr
              key={item.id}
              className={`transition-colors ${
                isLowStock ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.sku}
              </td>
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  {item.name}
                  {isLowStock && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {t('inventory.lowStock') || 'مخزون منخفض'}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                {parseFloat(available).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {item.unit}
              </td>
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                {parseFloat(item.price).toFixed(2)} {item.currency}
              </td>
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                {(item.min_stock ?? item.minStock ?? 0)} {item.unit}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
