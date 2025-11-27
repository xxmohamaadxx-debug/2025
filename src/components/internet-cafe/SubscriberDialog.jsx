import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import HelpButton from '@/components/ui/HelpButton';

const SubscriberDialog = ({ open, onOpenChange, subscriber, onSave, subscriptionTypes = [] }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [formData, setFormData] = useState({
    subscriber_number: '',
    name: '',
    phone: '',
    email: '',
    identity_number: '',
    address: '',
    branch: '',
    subscription_type_id: null,
    subscription_duration: 30,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active',
    base_price: '',
    tax_amount: '',
    discount_amount: '',
    currency: 'USD',
    payment_method: 'cash',
    notes: '',
    partner_id: null
  });

  useEffect(() => {
    if (open && user?.tenant_id) {
      loadPartners();
    }
  }, [open, user]);

  useEffect(() => {
    if (subscriber) {
      setFormData({
        subscriber_number: subscriber.subscriber_number || '',
        name: subscriber.name || '',
        phone: subscriber.phone || '',
        email: subscriber.email || '',
        identity_number: subscriber.identity_number || '',
        address: subscriber.address || '',
        branch: subscriber.branch || '',
        subscription_type_id: subscriber.subscription_type_id || null,
        subscription_duration: subscriber.subscription_duration || 30,
        start_date: subscriber.start_date || new Date().toISOString().split('T')[0],
        end_date: subscriber.end_date || '',
        status: subscriber.status || 'active',
        base_price: subscriber.base_price || '',
        tax_amount: subscriber.tax_amount || '',
        discount_amount: subscriber.discount_amount || '',
        currency: subscriber.currency || 'TRY',
        payment_method: subscriber.payment_method || 'cash',
        notes: subscriber.notes || '',
        partner_id: subscriber.partner_id || null
      });
    } else {
      setFormData({
        subscriber_number: '',
        name: '',
        phone: '',
        email: '',
        identity_number: '',
        address: '',
        branch: '',
        subscription_type_id: null,
        subscription_duration: 30,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active',
        base_price: '',
        tax_amount: '',
        discount_amount: '',
        currency: 'USD',
        payment_method: 'cash',
        notes: '',
        partner_id: null
      });
    }
  }, [subscriber, open]);

  const loadPartners = async () => {
    try {
      const data = await neonService.getPartners(user.tenant_id);
      setPartners(data || []);
    } catch (error) {
      console.error('Load partners error:', error);
    }
  };

  // حساب تاريخ النهاية تلقائياً
  useEffect(() => {
    if (formData.start_date && formData.subscription_duration) {
      const startDate = new Date(formData.start_date);
      startDate.setDate(startDate.getDate() + parseInt(formData.subscription_duration));
      setFormData(prev => ({ ...prev, end_date: startDate.toISOString().split('T')[0] }));
    }
  }, [formData.start_date, formData.subscription_duration]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      base_price: parseFloat(formData.base_price || 0),
      tax_amount: parseFloat(formData.tax_amount || 0),
      discount_amount: parseFloat(formData.discount_amount || 0),
      subscription_duration: parseInt(formData.subscription_duration)
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بيانات مشترك إنترنت. أدخل رقم المشترك، الاسم، الهاتف، البريد الإلكتروني، رقم الهوية، العنوان، الفرع، نوع الاشتراك، تاريخ البدء والانتهاء، السعر، والضريبة. يمكنك ربط المشترك بشريك (عميل)."
          helpTextEn="Here you can add or edit internet subscriber data. Enter the subscriber number, name, phone, email, identity number, address, branch, subscription type, start and end dates, price, and tax. You can link the subscriber to a partner (customer)."
          helpTextTr="Burada internet abone verilerini ekleyebilir veya düzenleyebilirsiniz. Abone numarasını, adı, telefonu, e-postayı, kimlik numarasını, adresi, şubeyi, abonelik türünü, başlangıç ve bitiş tarihlerini, fiyatı ve vergiyi girin. Aboneyi bir ortakla (müşteri) bağlayabilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {subscriber ? 'تعديل مشترك' : 'إضافة مشترك جديد'}
          </DialogTitle>
          <DialogDescription>
            {subscriber ? 'قم بتعديل بيانات المشترك' : 'قم بإدخال بيانات مشترك جديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الهاتف</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الهوية (اختياري)</label>
              <input
                type="text"
                value={formData.identity_number}
                onChange={(e) => setFormData({ ...formData, identity_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">العنوان</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المتجر/الفرع</label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع الاشتراك</label>
              <select
                value={formData.subscription_type_id || ''}
                onChange={(e) => setFormData({ ...formData, subscription_type_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">-- اختر نوع الاشتراك --</option>
                {subscriptionTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مدة الاشتراك (بالأيام)</label>
              <input
                type="number"
                min="1"
                value={formData.subscription_duration}
                onChange={(e) => setFormData({ ...formData, subscription_duration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ البداية *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ النهاية</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="suspended">موقوف</option>
                <option value="cancelled">ملغى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العميل (اختياري)</label>
              <select
                value={formData.partner_id || ''}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">-- اختر عميل --</option>
                {partners.filter(p => p.type === 'Customer').map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium mb-1">الضريبة</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الخصم</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
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
              <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="cash">نقد</option>
                <option value="card">بطاقة</option>
                <option value="transfer">تحويل</option>
                <option value="credit">ذمة</option>
              </select>
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
            <InteractiveButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </InteractiveButton>
            <InteractiveButton
              type="submit"
              variant="default"
              className="bg-gradient-to-r from-orange-500 to-pink-500"
            >
              {subscriber ? 'تحديث' : 'إضافة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriberDialog;

