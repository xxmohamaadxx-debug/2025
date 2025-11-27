import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import HelpButton from '@/components/ui/HelpButton';

const DeviceDialog = ({ open, onOpenChange, device, onSave }) => {
  const [formData, setFormData] = useState({
    device_number: '',
    specifications: '',
    status: 'available',
    location: '',
    session_price: '',
    currency: 'USD',
    maintenance_notes: ''
  });

  useEffect(() => {
    if (device) {
      setFormData({
        device_number: device.device_number || '',
        specifications: device.specifications || '',
        status: device.status || 'available',
        location: device.location || '',
        session_price: device.session_price || '',
        currency: device.currency || 'TRY',
        maintenance_notes: device.maintenance_notes || ''
      });
    } else {
      setFormData({
        device_number: '',
        specifications: '',
        status: 'available',
        location: '',
        session_price: '',
        currency: 'USD',
        maintenance_notes: ''
      });
    }
  }, [device, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      session_price: parseFloat(formData.session_price || 0)
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل جهاز في صالة الإنترنت. أدخل رقم الجهاز، المواصفات (المعالج، الذاكرة، إلخ)، الحالة (متاح، مشغول، صيانة)، الموقع، وسعر الجلسة. يمكنك إضافة ملاحظات صيانة."
          helpTextEn="Here you can add or edit a device in the internet cafe. Enter the device number, specifications (processor, memory, etc.), status (available, busy, maintenance), location, and session price. You can add maintenance notes."
          helpTextTr="Burada internet kafedeki bir cihazı ekleyebilir veya düzenleyebilirsiniz. Cihaz numarasını, özelliklerini (işlemci, bellek, vb.), durumunu (müsait, meşgul, bakım), konumunu ve oturum fiyatını girin. Bakım notları ekleyebilirsiniz."}
        />
        <DialogHeader>
          <DialogTitle>{device ? 'تعديل جهاز' : 'إضافة جهاز جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">رقم الجهاز *</label>
              <input
                type="text"
                required
                value={formData.device_number}
                onChange={(e) => setFormData({ ...formData, device_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموقع</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثال: المقعد 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="available">متاح</option>
                <option value="in_use">قيد الاستخدام</option>
                <option value="maintenance">صيانة</option>
                <option value="offline">غير متصل</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر الجلسة</label>
              <input
                type="number"
                step="0.01"
                value={formData.session_price}
                onChange={(e) => setFormData({ ...formData, session_price: e.target.value })}
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">المواصفات</label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                rows="3"
                placeholder="مثال: Intel i7, 16GB RAM, Windows 11"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">ملاحظات الصيانة</label>
              <textarea
                value={formData.maintenance_notes}
                onChange={(e) => setFormData({ ...formData, maintenance_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                rows="2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <InteractiveButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </InteractiveButton>
            <InteractiveButton type="submit" variant="default" className="bg-gradient-to-r from-orange-500 to-pink-500">
              {device ? 'تحديث' : 'إضافة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceDialog;

