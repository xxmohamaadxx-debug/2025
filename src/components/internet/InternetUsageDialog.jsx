import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENCIES } from '@/lib/constants';
import HelpButton from '@/components/ui/HelpButton';

const InternetUsageDialog = ({ open, onOpenChange, usage, subscribers, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    subscriber_id: '',
    session_start: new Date().toISOString().slice(0, 16),
    session_end: '',
    duration_minutes: '',
    internet_speed: '',
    data_used_mb: '',
    cost: '',
    currency: 'TRY',
    payment_method: 'cash',
    is_paid: false,
    notes: ''
  });

  useEffect(() => {
    if (usage && open) {
      const start = usage.session_start ? new Date(usage.session_start).toISOString().slice(0, 16) : '';
      const end = usage.session_end ? new Date(usage.session_end).toISOString().slice(0, 16) : '';
      
      setFormData({
        subscriber_id: usage.subscriber_id || '',
        session_start: start,
        session_end: end,
        duration_minutes: usage.duration_minutes || '',
        internet_speed: usage.internet_speed || '',
        data_used_mb: usage.data_used_mb || '',
        cost: usage.cost || '',
        currency: usage.currency || 'TRY',
        payment_method: usage.payment_method || 'cash',
        is_paid: usage.is_paid || false,
        notes: usage.notes || ''
      });
    } else if (open) {
      const now = new Date();
      setFormData({
        subscriber_id: '',
        session_start: now.toISOString().slice(0, 16),
        session_end: '',
        duration_minutes: '',
        internet_speed: '',
        data_used_mb: '',
        cost: '',
        currency: 'TRY',
        payment_method: 'cash',
        is_paid: false,
        notes: ''
      });
    }
  }, [usage, open]);

  const calculateDuration = () => {
    if (formData.session_start && formData.session_end) {
      const start = new Date(formData.session_start);
      const end = new Date(formData.session_end);
      const diff = Math.max(0, (end - start) / (1000 * 60)); // دقائق
      setFormData({ ...formData, duration_minutes: Math.round(diff) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل سجل استخدام إنترنت للمشترك. حدد المشترك، تاريخ ووقت بدء الجلسة، تاريخ ووقت نهاية الجلسة (سيتم حساب المدة تلقائياً)، سرعة الإنترنت، البيانات المستخدمة (MB)، التكلفة، طريقة الدفع، وحالة الدفع."
          helpTextEn="Here you can add or edit an internet usage record for a subscriber. Select the subscriber, session start date and time, session end date and time (duration will be calculated automatically), internet speed, data used (MB), cost, payment method, and payment status."
          helpTextTr="Burada bir abone için internet kullanım kaydı ekleyebilir veya düzenleyebilirsiniz. Aboneyi seçin, oturum başlangıç tarihi ve saati, oturum bitiş tarihi ve saati (süre otomatik olarak hesaplanacaktır), internet hızı, kullanılan veri (MB), maliyet, ödeme yöntemi ve ödeme durumunu belirtin."}
        />
        <DialogHeader>
          <DialogTitle>
            {usage ? 'تعديل سجل استخدام' : 'إضافة سجل استخدام جديد'}
          </DialogTitle>
          <DialogDescription>
            {usage ? 'قم بتعديل بيانات سجل استخدام الإنترنت' : 'قم بإدخال سجل استخدام إنترنت جديد للمشترك'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">المشترك *</label>
              <select
                required
                value={formData.subscriber_id}
                onChange={(e) => setFormData({ ...formData, subscriber_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر المشترك</option>
                {subscribers.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">السرعة</label>
              <input
                type="text"
                value={formData.internet_speed}
                onChange={(e) => setFormData({ ...formData, internet_speed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="100Mbps"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">وقت البدء *</label>
              <input
                type="datetime-local"
                required
                value={formData.session_start}
                onChange={(e) => {
                  setFormData({ ...formData, session_start: e.target.value });
                  calculateDuration();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">وقت الانتهاء</label>
              <input
                type="datetime-local"
                value={formData.session_end}
                onChange={(e) => {
                  setFormData({ ...formData, session_end: e.target.value });
                  calculateDuration();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">المدة (بالدقائق)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="120"
              />
              <p className="text-xs text-gray-500 mt-1">
                سيتم حسابه تلقائياً عند تحديد وقت البدء والانتهاء
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">البيانات المستخدمة (MB)</label>
              <input
                type="number"
                step="0.01"
                value={formData.data_used_mb}
                onChange={(e) => setFormData({ ...formData, data_used_mb: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">التكلفة *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="10.00"
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
                <option value="credit">رصيد</option>
              </select>
            </div>
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

export default InternetUsageDialog;

