
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpButton from '@/components/ui/HelpButton';

const PartnerDialog = ({ open, onOpenChange, partner, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Customer',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        type: partner.type || 'Customer',
        phone: partner.phone || '',
        email: partner.email || '',
        address: partner.address || '',
        notes: partner.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Customer',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
    }
  }, [partner, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بيانات شريك (عميل أو مورد). أدخل الاسم، النوع (عميل أو مورد)، رقم الهاتف، البريد الإلكتروني، والعنوان. يمكنك إضافة ملاحظات إضافية."
          helpTextEn="Here you can add or edit partner data (customer or vendor). Enter the name, type (customer or vendor), phone number, email, and address. You can add additional notes."
          helpTextTr="Burada ortak verilerini (müşteri veya tedarikçi) ekleyebilir veya düzenleyebilirsiniz. Ad, tür (müşteri veya tedarikçi), telefon numarası, e-posta ve adresi girin. Ek notlar ekleyebilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {partner ? t('common.edit') : t('common.add')} {t('partners.partner')}
          </DialogTitle>
          <DialogDescription>
            {partner ? 'قم بتعديل بيانات الشريك' : 'قم بإدخال بيانات الشريك الجديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.name')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('common.name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('partners.type')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="Customer">{t('partners.customer')}</option>
              <option value="Vendor">{t('partners.vendor')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.phone')}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('common.phone')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('common.email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('common.email')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">{t('partners.address')}</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows="2"
              placeholder={t('partners.address')}
            />
          </div>

          <div className="flex gap-4 mt-6 rtl:flex-row-reverse">
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

export default PartnerDialog;
