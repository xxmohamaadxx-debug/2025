import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES } from '@/lib/constants';

const PaymentDialog = ({ open, onOpenChange, customer, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'payment', // 'payment', 'receipt', 'debt', 'credit'
    amount: '',
    currency: 'TRY',
    payment_method: 'cash',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  useEffect(() => {
    if (customer && open) {
      setFormData({
        type: 'payment',
        amount: '',
        currency: customer.currency || 'TRY',
        payment_method: customer.payment_method || 'cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        notes: ''
      });
    }
  }, [customer, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer) {
      return;
    }

    // حساب تلقائي: إذا كان العميل عليه دين، تكون الدفعة لتسديد الدين
    // إذا لم يكن عليه دين، تكون الدفعة رصيد له
    const currentDebt = parseFloat(customer.debt || 0);
    const paymentAmount = parseFloat(formData.amount || 0);
    
    let transactionType = formData.type;
    
    // تلقائي ذكي: تحديد نوع المعاملة
    if (formData.type === 'payment' && currentDebt > 0 && paymentAmount > 0) {
      // إذا كان عليه دين والدفعة أقل من الدين، تسديد دين
      if (paymentAmount <= currentDebt) {
        transactionType = 'payment'; // دفعة تسدد الدين
      } else {
        // إذا كانت الدفعة أكبر من الدين، جزء تسديد والبقية رصيد
        transactionType = 'payment'; // يمكن تقسيمه في المستقبل
      }
    } else if (formData.type === 'payment' && currentDebt === 0) {
      // إذا لم يكن عليه دين، تكون الدفعة رصيد
      transactionType = 'credit';
    }

    onSave({
      ...formData,
      type: transactionType
    });
  };

  if (!customer) return null;

  const currencyInfo = CURRENCIES[formData.currency] || { symbol: formData.currency };
  const currentDebt = parseFloat(customer.debt || 0);
  const currentBalance = parseFloat(customer.balance || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            إضافة معاملة - {customer.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">الدين الحالي:</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {currencyInfo.symbol} {currentDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">الرصيد الحالي:</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {currencyInfo.symbol} {currentBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المعاملة *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="payment">دفعة (تسديد دين)</option>
              <option value="receipt">استلام (من عميل)</option>
              <option value="debt">إضافة دين</option>
              <option value="credit">إضافة رصيد</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'payment' && currentDebt > 0 && 'ستُخصم من الدين تلقائياً'}
              {formData.type === 'payment' && currentDebt === 0 && 'ستُضاف كرصيد للعميل'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">المبلغ *</label>
            <input
              type="number"
              step="0.01"
              min="0"
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
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="TRY">TRY - ليرة تركية</option>
              <option value="USD">USD - دولار</option>
              <option value="SYP">SYP - ليرة سورية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">طريقة الدفع *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="cash">كاش</option>
              <option value="transfer">حوالة</option>
              <option value="credit">دين</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">التاريخ *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="وصف المعاملة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="ملاحظات إضافية"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              حفظ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;

