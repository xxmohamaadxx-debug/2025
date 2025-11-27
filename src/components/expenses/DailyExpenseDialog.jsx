import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import HelpButton from '@/components/ui/HelpButton';

const DailyExpenseDialog = ({ open, onOpenChange, expense, onSave }) => {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'TRY',
    category: '',
    description: '',
    payment_method: 'cash',
    receipt_number: '',
    supplier_name: '',
    employee_id: null
  });

  useEffect(() => {
    if (open) {
      loadEmployees();
      if (expense) {
        setFormData({
          expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
          amount: expense.amount || '',
          currency: expense.currency || 'TRY',
          category: expense.category || '',
          description: expense.description || '',
          payment_method: expense.payment_method || 'cash',
          receipt_number: expense.receipt_number || '',
          supplier_name: expense.supplier_name || '',
          employee_id: expense.employee_id || null
        });
      } else {
        setFormData({
          expense_date: new Date().toISOString().split('T')[0],
          amount: '',
          currency: 'TRY',
          category: '',
          description: '',
          payment_method: 'cash',
          receipt_number: '',
          supplier_name: '',
          employee_id: null
        });
      }
    }
  }, [expense, open]);

  const loadEmployees = async () => {
    if (!user?.tenant_id) return;
    try {
      const data = await neonService.getEmployees(user.tenant_id).catch(() => []);
      setEmployees(data || []);
    } catch (error) {
      console.error('Load employees error:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) {
      return;
    }
    onSave(formData);
  };

  const commonCategories = [
    'كهرباء', 'ماء', 'إيجار', 'صيانة', 'مواصلات', 'إعلانات', 
    'هاتف', 'إنترنت', 'أدوات مكتبية', 'تنظيف', 'أمن', 'أخرى'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل مصروف يومي خارجي. حدد الفئة (كهرباء، ماء، إيجار، إلخ)، المبلغ، العملة، وطريقة الدفع. يمكنك ربط المصروف بموظف مسؤول إذا لزم الأمر."
          helpTextEn="Here you can add or edit a daily external expense. Select the category (electricity, water, rent, etc.), amount, currency, and payment method. You can link the expense to a responsible employee if needed."
          helpTextTr="Burada günlük harici bir gider ekleyebilir veya düzenleyebilirsiniz. Kategoriyi (elektrik, su, kira, vb.), tutarı, para birimini ve ödeme yöntemini seçin. Gerekirse gideri sorumlu bir çalışana bağlayabilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {expense ? 'تعديل مصروف يومي' : 'إضافة مصروف يومي جديد'}
          </DialogTitle>
          <DialogDescription>
            {expense ? 'قم بتعديل بيانات المصروف اليومي' : 'قم بإدخال بيانات مصروف يومي خارجي جديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">التاريخ *</label>
              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الفئة *</label>
              <input
                type="text"
                required
                list="categories"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثل: كهرباء، ماء، إيجار..."
              />
              <datalist id="categories">
                {commonCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">العملة *</label>
              <select
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="TRY">TRY - ليرة تركية</option>
                <option value="USD">USD - دولار</option>
                <option value="SYP">SYP - ليرة سورية</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">طريقة الدفع *</label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="cash">كاش</option>
                <option value="transfer">حوالة</option>
                <option value="credit_card">بطاقة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الموظف المسؤول</label>
              <select
                value={formData.employee_id || ''}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">لا يوجد</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">رقم الإيصال</label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="رقم الإيصال أو الفاتورة"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">اسم المورد</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم المورد أو الجهة"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="3"
              placeholder="وصف تفصيلي للمصروف..."
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

export default DailyExpenseDialog;

