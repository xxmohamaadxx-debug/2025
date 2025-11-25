
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const EmployeeTable = ({ employees, onEdit, onDelete }) => {
  const { t } = useLanguage();

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('employees.noEmployees') || 'لا يوجد موظفون'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('employees.fullName') || 'الاسم'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('employees.position') || 'المنصب'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('employees.salary') || 'الراتب'}</th>
            <th className="text-right rtl:text-right ltr:text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('common.status') || 'الحالة'}</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{t('common.actions') || 'الإجراءات'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {employees.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="py-3 px-4 text-sm font-medium flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                </div>
                {emp.name}
              </td>
              <td className="py-3 px-4 text-sm">{emp.position}</td>
              <td className="py-3 px-4 text-sm font-semibold">
                {parseFloat(emp.base_salary || emp.salary || 0).toLocaleString()} {emp.currency}
              </td>
              <td className="py-3 px-4 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    emp.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                }`}>
                    {emp.status === 'Active' ? (t('status.active') || 'نشط') : (t('status.inactive') || 'غير نشط')}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(emp)}>
                    <Edit className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(emp.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
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

export default EmployeeTable;
