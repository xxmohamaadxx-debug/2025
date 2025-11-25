
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateShort } from '@/lib/dateUtils';

const InvoiceTable = ({ invoices, onEdit, onDelete }) => {
  const { t } = useLanguage();

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        {t('common.noData')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.date')}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.description')}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.category')}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.amount')}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.status')}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-100">
                {invoice.date ? formatDateShort(invoice.date) : '-'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-100">
                {invoice.description}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-100">
                {invoice.category}
              </td>
              <td className="py-3 px-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
                {parseFloat(invoice.amount).toFixed(2)} {invoice.currency}
              </td>
              <td className="py-3 px-4 text-sm">
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {invoice.status || 'Draft'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(invoice)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
