
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpButton from '@/components/ui/HelpButton';

const PayrollDialog = ({ open, onOpenChange, employees, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    employeeId: '',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    bonus: 0,
    deduction: 0,
    notes: ''
  });

  useEffect(() => {
      if (employees.length > 0 && !formData.employeeId) {
          setFormData(prev => ({ ...prev, employeeId: employees[0].id }));
      }
  }, [employees]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === formData.employeeId);
    if (!emp) return;

    const total = parseFloat(emp.salary) + parseFloat(formData.bonus) - parseFloat(formData.deduction);

    onSave({
        ...formData,
        employeeName: emp.name,
        baseSalary: emp.salary,
        currency: emp.currency,
        total: total,
        date: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إنشاء كشف راتب للموظف. حدد الموظف، الفترة (الشهر والسنة)، وأضف أي مكافآت أو خصومات. سيتم حساب الراتب الصافي تلقائياً (الراتب الأساسي + المكافآت - الخصومات)."
          helpTextEn="Here you can create a payroll for an employee. Select the employee, period (month and year), and add any bonuses or deductions. The net salary will be calculated automatically (base salary + bonuses - deductions)."
          helpTextTr="Burada bir çalışan için bordro oluşturabilirsiniz. Çalışanı, dönemi (ay ve yıl) seçin ve herhangi bir ikramiye veya kesinti ekleyin. Net maaş otomatik olarak hesaplanacaktır (temel maaş + ikramiyeler - kesintiler)." />
        <DialogHeader>
          <DialogTitle>إنشاء كشف راتب</DialogTitle>
          <DialogDescription>
            قم بإنشاء كشف راتب جديد للموظف المحدد
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <select
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            >
                {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.currency})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Period</label>
            <input
                type="month"
                required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium mb-1">Bonus</label>
                <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">Deduction</label>
                <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={formData.deduction}
                    onChange={(e) => setFormData({ ...formData, deduction: e.target.value })}
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              Generate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollDialog;
