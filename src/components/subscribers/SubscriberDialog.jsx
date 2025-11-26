import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES } from '@/lib/constants';

const SubscriberDialog = ({ open, onOpenChange, subscriber, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    address: '',
    subscription_type: 'monthly',
    internet_speed: '',
    internet_speed_kbps: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    currency: 'TRY',
    notes: ''
  });

  useEffect(() => {
    if (subscriber && open) {
      setFormData({
        name: subscriber.name || '',
        phone: subscriber.phone || '',
        email: subscriber.email || '',
        national_id: subscriber.national_id || '',
        address: subscriber.address || '',
        subscription_type: subscriber.subscription_type || 'monthly',
        internet_speed: subscriber.internet_speed || '',
        internet_speed_kbps: subscriber.internet_speed_kbps || '',
        start_date: subscriber.start_date ? subscriber.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: subscriber.end_date ? subscriber.end_date.split('T')[0] : '',
        currency: subscriber.currency || 'TRY',
        notes: subscriber.notes || ''
      });
    } else if (open) {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      setFormData({
        name: '',
        phone: '',
        email: '',
        national_id: '',
        address: '',
        subscription_type: 'monthly',
        internet_speed: '',
        internet_speed_kbps: '',
        start_date: today.toISOString().split('T')[0],
        end_date: nextMonth.toISOString().split('T')[0],
        currency: 'TRY',
        notes: ''
      });
    }
  }, [subscriber, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // حساب تاريخ الانتهاء تلقائياً حسب نوع الاشتراك
    let calculatedEndDate = formData.end_date;
    if (formData.start_date && formData.subscription_type && !formData.end_date) {
      const start = new Date(formData.start_date);
      if (formData.subscription_type === 'daily') {
        start.setDate(start.getDate() + 1);
      } else if (formData.subscription_type === 'weekly') {
        start.setDate(start.getDate() + 7);
      } else if (formData.subscription_type === 'monthly') {
        start.setMonth(start.getMonth() + 1);
      }
      calculatedEndDate = start.toISOString().split('T')[0];
    }

    onSave({
      ...formData,
      end_date: calculatedEndDate,
      internet_speed_kbps: formData.internet_speed_kbps ? parseInt(formData.internet_speed_kbps) : null
    });
  };

  const subscriptionTypes = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    custom: 'مخصص'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {subscriber ? 'تعديل مشترك' : 'إضافة مشترك جديد'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الاسم *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم المشترك"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الهاتف</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الرقم الوطني</label>
              <input
                type="text"
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="الرقم الوطني"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">نوع الاشتراك *</label>
              <select
                required
                value={formData.subscription_type}
                onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="custom">مخصص</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">السرعة (Mbps/Kbps)</label>
              <input
                type="text"
                value={formData.internet_speed}
                onChange={(e) => setFormData({ ...formData, internet_speed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="100Mbps أو 100000 Kbps"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">السرعة بالكيلوبايت</label>
              <input
                type="number"
                value={formData.internet_speed_kbps}
                onChange={(e) => setFormData({ ...formData, internet_speed_kbps: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="100000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ البداية *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                سيتم حسابه تلقائياً إذا لم يتم تحديده
              </p>
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">العنوان</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="عنوان المشترك"
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
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriberDialog;

