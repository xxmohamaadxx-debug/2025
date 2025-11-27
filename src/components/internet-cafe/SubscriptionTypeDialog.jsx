import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import HelpButton from '@/components/ui/HelpButton';

const SubscriptionTypeDialog = ({ open, onOpenChange, subscriptionType, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    duration_days: '',
    duration_hours: '',
    speed_limit: '',
    data_limit_gb: '',
    peak_hours_start: '',
    peak_hours_end: '',
    price: '',
    currency: 'USD',
    renewal_policy: '',
    late_fee_percent: '',
    late_fee_amount: '',
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    if (subscriptionType) {
      setFormData({
        name: subscriptionType.name || '',
        duration_days: subscriptionType.duration_days || '',
        duration_hours: subscriptionType.duration_hours || '',
        speed_limit: subscriptionType.speed_limit || '',
        data_limit_gb: subscriptionType.data_limit_gb || '',
        peak_hours_start: subscriptionType.peak_hours_start || '',
        peak_hours_end: subscriptionType.peak_hours_end || '',
        price: subscriptionType.price || '',
        currency: subscriptionType.currency || 'TRY',
        renewal_policy: subscriptionType.renewal_policy || '',
        late_fee_percent: subscriptionType.late_fee_percent || '',
        late_fee_amount: subscriptionType.late_fee_amount || '',
        is_active: subscriptionType.is_active !== false,
        notes: subscriptionType.notes || ''
      });
    } else {
      setFormData({
        name: '',
        duration_days: '',
        duration_hours: '',
        speed_limit: '',
        data_limit_gb: '',
        peak_hours_start: '',
        peak_hours_end: '',
        price: '',
        currency: 'USD',
        renewal_policy: '',
        late_fee_percent: '',
        late_fee_amount: '',
        is_active: true,
        notes: ''
      });
    }
  }, [subscriptionType, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
      duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
      data_limit_gb: formData.data_limit_gb ? parseFloat(formData.data_limit_gb) : null,
      price: parseFloat(formData.price || 0),
      late_fee_percent: formData.late_fee_percent ? parseFloat(formData.late_fee_percent) : 0,
      late_fee_amount: formData.late_fee_amount ? parseFloat(formData.late_fee_amount) : 0,
      peak_hours_start: formData.peak_hours_start || null,
      peak_hours_end: formData.peak_hours_end || null
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل نوع اشتراك إنترنت. حدد الاسم، مدة الاشتراك (بالأيام أو الساعات)، حد السرعة، حد البيانات (GB)، ساعات الذروة، السعر، العملة، وسياسة التجديد. يمكنك إضافة رسوم تأخير."
          helpTextEn="Here you can add or edit an internet subscription type. Specify the name, subscription duration (in days or hours), speed limit, data limit (GB), peak hours, price, currency, and renewal policy. You can add late fees."
          helpTextTr="Burada bir internet abonelik türü ekleyebilir veya düzenleyebilirsiniz. Adı, abonelik süresini (gün veya saat cinsinden), hız limitini, veri limitini (GB), yoğun saatleri, fiyatı, para birimini ve yenileme politikasını belirtin. Gecikme ücretleri ekleyebilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {subscriptionType ? 'تعديل نوع اشتراك' : 'إضافة نوع اشتراك جديد'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم الباقة *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المدة بالأيام</label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المدة بالساعات</label>
              <input
                type="number"
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سرعة/حد السرعة</label>
              <input
                type="text"
                value={formData.speed_limit}
                onChange={(e) => setFormData({ ...formData, speed_limit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثال: 10 Mbps"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حد الاستخدام (GB)</label>
              <input
                type="number"
                step="0.01"
                value={formData.data_limit_gb}
                onChange={(e) => setFormData({ ...formData, data_limit_gb: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ساعات الذروة - البداية</label>
              <input
                type="time"
                value={formData.peak_hours_start}
                onChange={(e) => setFormData({ ...formData, peak_hours_start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ساعات الذروة - النهاية</label>
              <input
                type="time"
                value={formData.peak_hours_end}
                onChange={(e) => setFormData({ ...formData, peak_hours_end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العملة</label>
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
              <label className="block text-sm font-medium mb-1">سياسات التجديد</label>
              <textarea
                value={formData.renewal_policy}
                onChange={(e) => setFormData({ ...formData, renewal_policy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                rows="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">غرامات التأخير (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.late_fee_percent}
                onChange={(e) => setFormData({ ...formData, late_fee_percent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">غرامات التأخير (مبلغ ثابت)</label>
              <input
                type="number"
                step="0.01"
                value={formData.late_fee_amount}
                onChange={(e) => setFormData({ ...formData, late_fee_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">نشط</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">الملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                rows="3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <InteractiveButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </InteractiveButton>
            <InteractiveButton type="submit" variant="default" className="bg-gradient-to-r from-orange-500 to-pink-500">
              {subscriptionType ? 'تحديث' : 'إضافة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionTypeDialog;

