import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpButton from '@/components/ui/HelpButton';

const CustomerDialog = ({ open, onOpenChange, customer, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    currency: 'USD',
    payment_method: 'cash'
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
        currency: customer.currency || 'TRY',
        payment_method: customer.payment_method || 'cash'
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        currency: 'USD',
        payment_method: 'cash'
      });
    }
  }, [customer, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بيانات عميل. أدخل الاسم، رقم الهاتف، البريد الإلكتروني، والعنوان. يمكنك تحديد العملة المفضلة وطريقة الدفع الافتراضية. يمكنك إضافة ملاحظات."
          helpTextEn="Here you can add or edit customer data. Enter the name, phone number, email, and address. You can specify the preferred currency and default payment method. You can add notes."
          helpTextTr="Burada müşteri verilerini ekleyebilir veya düzenleyebilirsiniz. Adı, telefon numarası, e-postayı ve adresi girin. Tercih edilen para birimini ve varsayılan ödeme yöntemini belirtebilirsiniz. Notlar ekleyebilirsiniz."}
        />
        <DialogHeader>
          <DialogTitle>
            {customer ? 'تعديل عميل' : 'إضافة عميل'}
          </DialogTitle>
          <DialogDescription>
            {customer ? 'قم بتعديل بيانات العميل' : 'قم بإدخال بيانات العميل الجديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="اسم العميل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="رقم الهاتف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="البريد الإلكتروني"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">العنوان</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="العنوان"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">العملة</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="USD">$ دولار أمريكي (USD)</option>
              <option value="TRY">₺ ليرة تركية (TRY)</option>
              <option value="SYP">£S ليرة سورية (SYP)</option>
              <option value="SAR">﷼ ريال سعودي (SAR)</option>
              <option value="EUR">€ يورو (EUR)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">طريقة الدفع الافتراضية</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="cash">كاش</option>
              <option value="transfer">حوالة</option>
              <option value="credit">دين</option>
            </select>
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
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;

