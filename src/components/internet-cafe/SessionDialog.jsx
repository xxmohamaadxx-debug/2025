import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useAuth } from '@/contexts/AuthContext';

const SessionDialog = ({ open, onOpenChange, session, subscribers = [], devices = [], onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subscriber_id: null,
    is_guest: false,
    guest_name: '',
    device_id: null,
    price_per_minute: '',
    price_per_hour: '',
    base_price: '',
    currency: 'TRY'
  });

  useEffect(() => {
    if (session) {
      setFormData({
        subscriber_id: session.subscriber_id || null,
        is_guest: session.is_guest || false,
        guest_name: session.guest_name || '',
        device_id: session.device_id || null,
        price_per_minute: session.price_per_minute || '',
        price_per_hour: session.price_per_hour || '',
        base_price: session.base_price || '',
        currency: session.currency || 'TRY'
      });
    } else {
      setFormData({
        subscriber_id: null,
        is_guest: false,
        guest_name: '',
        device_id: null,
        price_per_minute: '',
        price_per_hour: '',
        base_price: '',
        currency: 'TRY'
      });
    }
  }, [session, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      employee_id: user?.id,
      price_per_minute: parseFloat(formData.price_per_minute || 0),
      price_per_hour: parseFloat(formData.price_per_hour || 0),
      base_price: parseFloat(formData.base_price || 0)
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? 'تعديل جلسة' : 'بدء جلسة جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.is_guest}
                  onChange={(e) => setFormData({ ...formData, is_guest: e.target.checked, subscriber_id: null })}
                />
                <span className="text-sm">ضيف</span>
              </label>
            </div>
            {!formData.is_guest ? (
              <div>
                <label className="block text-sm font-medium mb-1">المشترك</label>
                <select
                  value={formData.subscriber_id || ''}
                  onChange={(e) => setFormData({ ...formData, subscriber_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">-- اختر مشترك --</option>
                  {subscribers.filter(s => s.status === 'active').map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">اسم الضيف</label>
                <input
                  type="text"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">الجهاز</label>
              <select
                value={formData.device_id || ''}
                onChange={(e) => setFormData({ ...formData, device_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">-- اختر جهاز --</option>
                {devices.filter(d => d.status === 'available').map(device => (
                  <option key={device.id} value={device.id}>{device.device_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر بالدقيقة</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_minute}
                onChange={(e) => setFormData({ ...formData, price_per_minute: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر بالساعة</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_hour}
                onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر الأساسي</label>
              <input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
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
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <InteractiveButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </InteractiveButton>
            <InteractiveButton type="submit" variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500">
              {session ? 'تحديث' : 'بدء الجلسة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;

