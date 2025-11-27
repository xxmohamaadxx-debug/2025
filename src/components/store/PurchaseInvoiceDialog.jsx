import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Plus, Trash2 } from 'lucide-react';

const PurchaseInvoiceDialog = ({ open, onOpenChange, invoice, onSave }) => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    vendor_id: null,
    date: new Date().toISOString().split('T')[0],
    payment_terms: '',
    shipping_cost: '',
    tax_amount: '',
    discount_amount: '',
    currency: 'TRY',
    payment_method: 'cash',
    is_credit: false,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (open && user?.tenant_id) {
      loadPartners();
      loadProducts();
    }
  }, [open, user]);

  useEffect(() => {
    if (invoice) {
      setFormData({
        vendor_id: invoice.vendor_id || null,
        date: invoice.date || new Date().toISOString().split('T')[0],
        payment_terms: invoice.payment_terms || '',
        shipping_cost: invoice.shipping_cost || '',
        tax_amount: invoice.tax_amount || '',
        discount_amount: invoice.discount_amount || '',
        currency: invoice.currency || 'TRY',
        payment_method: invoice.payment_method || 'cash',
        is_credit: invoice.is_credit || false,
        due_date: invoice.due_date || '',
        notes: invoice.notes || ''
      });
    } else {
      setFormData({
        vendor_id: null,
        date: new Date().toISOString().split('T')[0],
        payment_terms: '',
        shipping_cost: '',
        tax_amount: '',
        discount_amount: '',
        currency: 'TRY',
        payment_method: 'cash',
        is_credit: false,
        due_date: '',
        notes: ''
      });
      setItems([]);
    }
  }, [invoice, open]);

  const loadPartners = async () => {
    try {
      const data = await neonService.getPartners(user.tenant_id);
      setPartners(data?.filter(p => p.type === 'Vendor') || []);
    } catch (error) {
      console.error('Load partners error:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await neonService.getProducts(user.tenant_id);
      setProducts(data || []);
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  const addItem = () => {
    setItems([...items, {
      product_id: null,
      sku: '',
      name: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
      currency: formData.currency
    }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_cost') {
      const quantity = parseFloat(updated[index].quantity || 0);
      const unitCost = parseFloat(updated[index].unit_cost || 0);
      updated[index].total_cost = quantity * unitCost;
    }
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].sku = product.sku || '';
        updated[index].name = product.name || '';
        updated[index].unit_cost = product.cost_price || 0;
      }
    }
    
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const shipping = parseFloat(formData.shipping_cost || 0);
    const tax = parseFloat(formData.tax_amount || 0);
    const discount = parseFloat(formData.discount_amount || 0);
    return subtotal + shipping + tax - discount;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalAmount = calculateTotal();
    const dataToSave = {
      ...formData,
      vendor_id: formData.vendor_id || null,
      subtotal: items.reduce((sum, item) => sum + (item.total_cost || 0), 0),
      shipping_cost: parseFloat(formData.shipping_cost || 0),
      tax_amount: parseFloat(formData.tax_amount || 0),
      discount_amount: parseFloat(formData.discount_amount || 0),
      total_amount: totalAmount,
      is_credit: formData.payment_method === 'credit'
    };
    onSave(dataToSave, items);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'تعديل فاتورة شراء' : 'إضافة فاتورة شراء جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المورد *</label>
              <select
                required
                value={formData.vendor_id || ''}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">-- اختر مورد --</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">التاريخ *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">شروط الدفع</label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تكلفة الشحن</label>
              <input
                type="number"
                step="0.01"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
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
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value, is_credit: e.target.value === 'credit' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="cash">نقد</option>
                <option value="card">بطاقة</option>
                <option value="transfer">تحويل</option>
                <option value="credit">ذمة</option>
              </select>
            </div>
            {formData.is_credit && (
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">العناصر</label>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 ml-2" /> إضافة عنصر
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <select
                    value={item.product_id || ''}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  >
                    <option value="">-- اختر منتج --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="الكمية"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="سعر الوحدة"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  />
                  <div className="w-24 px-3 py-2 text-sm font-semibold text-right">
                    {item.total_cost.toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">الإجمالي:</span>
                <span className="text-2xl font-bold text-orange-600">
                  {calculateTotal().toFixed(2)} {formData.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <InteractiveButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </InteractiveButton>
            <InteractiveButton type="submit" variant="default" className="bg-gradient-to-r from-orange-500 to-pink-500">
              {invoice ? 'تحديث' : 'إضافة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseInvoiceDialog;

