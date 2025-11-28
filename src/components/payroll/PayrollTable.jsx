
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, DollarSign, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PayrollTable = ({ payrolls, onDelete, onPay }) => {
  const { t } = useLanguage();
  if (payrolls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No payroll records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-semibold">الفترة</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">الموظف</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">الراتب الأساسي</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">البدلات</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">الخصومات</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">الراتب الصافي</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">الحالة</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {payrolls.map((item) => {
            const isPaid = item.is_paid || false;
            const baseSalary = parseFloat(item.base_salary || item.baseSalary || 0);
            const allowances = parseFloat(item.allowances || item.bonuses || 0);
            const deductions = parseFloat(item.deductions || item.total_deductions || 0);
            const netSalary = item.net_salary || (baseSalary + allowances - deductions);
            const period = item.month && item.year 
              ? `${item.month}/${item.year}` 
              : item.period || '-';
            const currency = item.currency || 'TRY';
            
            return (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-sm">{period}</td>
                <td className="py-3 px-4 text-sm font-medium">{item.employee_name || item.employeeName}</td>
                <td className="py-3 px-4 text-sm">{baseSalary.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</td>
                <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">
                  +{allowances.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                </td>
                <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">
                  -{deductions.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                </td>
                <td className="py-3 px-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                  {parseFloat(netSalary).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                </td>
                <td className="py-3 px-4 text-sm">
                  {isPaid ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="h-3 w-3" />
                      مدفوع
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                      غير مدفوع
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {!isPaid && onPay && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20 transition-all hover:scale-110 active:scale-95"
                        onClick={() => onPay(item.id)}
                        title="تسليم الراتب"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="transition-all hover:scale-110 active:scale-95">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onDelete(item.id)}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PayrollTable;
