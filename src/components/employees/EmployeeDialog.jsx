
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENCIES, EMPLOYEE_STATUS } from '@/lib/constants';
import { formatDateForInput, getCurrentDateInput } from '@/lib/dateUtils';

const EmployeeDialog = ({ open, onOpenChange, employee, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: '',
    currency: 'TRY',
    status: 'Active',
    hireDate: getCurrentDateInput(),
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        position: employee.position || '',
        salary: employee.salary || '',
        currency: employee.currency || 'TRY',
        status: employee.status || 'Active',
        hireDate: employee.hireDate ? formatDateForInput(employee.hireDate) : getCurrentDateInput(),
      });
    } else {
      setFormData({
        name: '',
        position: '',
        salary: '',
        currency: 'TRY',
        status: 'Active',
        hireDate: getCurrentDateInput(),
      });
    }
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee ? t('common.edit') : t('common.add')} {t('employees.employee')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('employees.fullName')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder={t('employees.fullName')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('employees.position')}</label>
            <input
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder={t('employees.position')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('employees.salary')}</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder={t('employees.salary')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.currency')}</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="Active">{t('status.active')}</option>
                <option value="Inactive">{t('status.inactive')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">{t('employees.hireDate')}</label>
              <input
                type="date"
                required
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
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

export default EmployeeDialog;
