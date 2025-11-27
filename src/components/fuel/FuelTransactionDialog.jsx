import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENCIES } from '@/lib/constants';
import HelpButton from '@/components/ui/HelpButton';

const FuelTransactionDialog = ({ open, onOpenChange, transaction, fuelTypes, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fuel_type_id: '',
    transaction_type: 'sale',
    quantity: '',
    unit_price: '',
    total_amount: '',
    currency: 'USD',
    payment_method: 'cash',
    reference_number: '',
    supplier_customer_name: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  useEffect(() => {
    if (transaction && open) {
      const date = transaction.transaction_date ? new Date(transaction.transaction_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      setFormData({
        fuel_type_id: transaction.fuel_type_id || '',
        transaction_type: transaction.transaction_type || 'sale',
        quantity: transaction.quantity || '',
        unit_price: transaction.unit_price || '',
        total_amount: transaction.total_amount || '',
        currency: transaction.currency || 'TRY',
        payment_method: transaction.payment_method || 'cash',
        reference_number: transaction.reference_number || '',
        supplier_customer_name: transaction.supplier_customer_name || '',
        transaction_date: date,
        notes: transaction.notes || ''
      });
    } else if (open) {
      setFormData({
        fuel_type_id: '',
        transaction_type: 'sale',
        quantity: '',
        unit_price: '',
        total_amount: '',
        currency: 'USD',
        payment_method: 'cash',
        reference_number: '',
        supplier_customer_name: '',
        transaction_date: new Date().toISOString().slice(0, 16),
        notes: ''
      });
    }
  }, [transaction, open]);

  const calculateTotal = () => {
    if (formData.quantity && formData.unit_price) {
      const total = parseFloat(formData.quantity) * parseFloat(formData.unit_price);
      setFormData({ ...formData, total_amount: total.toFixed(2) });
    }
  };

  useEffect(() => {
    calculateTotal();
  }, [formData.quantity, formData.unit_price]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      quantity: parseFloat(formData.quantity),
      unit_price: parseFloat(formData.unit_price),
      total_amount: parseFloat(formData.total_amount || 0)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل معاملة محروقات (شراء، بيع، تعديل، أو فقد). حدد نوع المحروقات، الكمية، سعر الوحدة (سيتم حساب الإجمالي تلقائياً)، العملة، طريقة الدفع، والمورد/العميل. يمكنك إضافة ملاحظات."
          helpTextEn="Here you can add or edit a fuel transaction (purchase, sale, adjustment, or loss). Select the fuel type, quantity, unit price (total will be calculated automatically), currency, payment method, and supplier/customer. You can add notes."
          helpTextTr="Burada bir yakıt işlemi (satın alma, satış, ayarlama veya kayıp) ekleyebilir veya düzenleyebilirsiniz. Yakıt türünü, miktarı, birim fiyatını (toplam otomatik olarak hesaplanacaktır), para birimini, ödeme yöntemini ve tedarikçi/müşteriyi seçin. Notlar ekleyebilirsiniz."}
        />
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'تعديل معاملة محروقات' : 'إضافة معاملة محروقات جديدة'}
          </DialogTitle>
          <DialogDescription>
            {transaction ? 'قم بتعديل بيانات معاملة المحروقات' : 'قم بإدخال معاملة محروقات جديدة (بيع، شراء، تعديل، أو فقد)'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المحروقات *</label>
              <select
                required
                value={formData.fuel_type_id}
                onChange={(e) => setFormData({ ...formData, fuel_type_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر نوع المحروقات</option>
                {fuelTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name_ar}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المعاملة *</label>
              <select
                required
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="purchase">شراء</option>
                <option value="sale">بيع</option>
                <option value="adjustment">تعديل</option>
                <option value="loss">فقد</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الكمية *</label>
              <input
                type="number"
                step="0.001"
                required
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  calculateTotal();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="1000.000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">سعر الوحدة *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.unit_price}
                onChange={(e) => {
                  setFormData({ ...formData, unit_price: e.target.value });
                  calculateTotal();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="25.50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الإجمالي *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 font-semibold"
                placeholder="25500.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                سيتم حسابه تلقائياً عند تحديد الكمية وسعر الوحدة
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
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
                <option value="SAR">﷼ ريال سعودي (SAR)</option>
                <option value="EUR">€ يورو (EUR)</option>
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
                <option value="credit">دين</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">رقم المرجع</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="رقم الفاتورة أو الإيصال"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">اسم المورد/العميل</label>
              <input
                type="text"
                value={formData.supplier_customer_name}
                onChange={(e) => setFormData({ ...formData, supplier_customer_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم المورد أو العميل"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">التاريخ والوقت *</label>
              <input
                type="datetime-local"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
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

export default FuelTransactionDialog;

