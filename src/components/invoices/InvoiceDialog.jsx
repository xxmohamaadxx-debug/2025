import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Upload, X, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import HelpButton from '@/components/ui/HelpButton';

const InvoiceDialog = ({ open, onOpenChange, invoice, onSave, type }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    partner_id: null,
    language: 'ar',
    payment_method: 'cash',
    is_credit: false,
    credit_amount: 0,
  });

  // تحميل الشركاء والمخزون
  useEffect(() => {
    if (open && user?.tenant_id) {
      loadPartners();
      loadInventory();
      loadInvoiceItems();
    }
  }, [open, user]);

  const loadPartners = async () => {
    setLoadingPartners(true);
    try {
      const data = await neonService.getPartners(user.tenant_id);
      setPartners(data || []);
    } catch (error) {
      console.error('Load partners error:', error);
    } finally {
      setLoadingPartners(false);
    }
  };

  const loadInventory = async () => {
    setLoadingInventory(true);
    try {
      const data = await neonService.getInventory(user.tenant_id);
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Load inventory error:', error);
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadInvoiceItems = async () => {
    if (!invoice?.id) {
      setInvoiceItems([]);
      return;
    }
    try {
      const items = await neonService.getInvoiceItems(invoice.id, type === 'in' ? 'invoice_in' : 'invoice_out', user.tenant_id);
      setInvoiceItems(items || []);
    } catch (error) {
      console.error('Load invoice items error:', error);
      setInvoiceItems([]);
    }
  };

  // إضافة منتج من المخزون
  const handleAddItemFromInventory = (inventoryItem) => {
    const existingIndex = invoiceItems.findIndex(item => item.inventory_item_id === inventoryItem.id);
    if (existingIndex >= 0) {
      toast({ title: 'المنتج موجود بالفعل في الفاتورة' });
      return;
    }

    const newItem = {
      inventory_item_id: inventoryItem.id,
      item_name: inventoryItem.name,
      item_code: inventoryItem.code || inventoryItem.sku || '',
      quantity: 1,
      unit: inventoryItem.unit || 'piece',
      unit_price: parseFloat(inventoryItem.price || 0),
      currency: inventoryItem.currency || formData.currency,
      total_price: parseFloat(inventoryItem.price || 0),
    };
    setInvoiceItems([...invoiceItems, newItem]);
    calculateTotal();
  };

  // إضافة منتج يدوياً
  const handleAddManualItem = () => {
    const newItem = {
      inventory_item_id: null,
      item_name: '',
      item_code: '',
      quantity: 1,
      unit: 'piece',
      unit_price: 0,
      currency: formData.currency,
      total_price: 0,
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  // تحديث عنصر
  const handleUpdateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(updated[index].quantity || 0);
      const unitPrice = parseFloat(updated[index].unit_price || 0);
      updated[index].total_price = quantity * unitPrice;
    }
    
    setInvoiceItems(updated);
    calculateTotal();
  };

  // حذف عنصر
  const handleRemoveItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    calculateTotal();
  };

  // حساب المبلغ الإجمالي
  const calculateTotal = () => {
    const total = invoiceItems.reduce((sum, item) => {
      if (item.currency === formData.currency) {
        return sum + parseFloat(item.total_price || 0);
      }
      return sum;
    }, 0);
    setFormData({ ...formData, amount: total.toFixed(2) });
  };

  useEffect(() => {
    calculateTotal();
  }, [invoiceItems, formData.currency]);

  // معالجة المرفقات
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type,
          url: reader.result,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (invoice) {
      setFormData({
        amount: invoice.amount || '',
        currency: invoice.currency || 'TRY',
        description: invoice.description || '',
        date: invoice.date || new Date().toISOString().split('T')[0],
        category: invoice.category || '',
        partner_id: invoice.partner_id || null,
        language: invoice.language || 'ar',
      });
      if (invoice.attachments && Array.isArray(invoice.attachments)) {
        setAttachments(invoice.attachments);
      } else {
        setAttachments([]);
      }
      loadInvoiceItems();
    } else {
      setFormData({
        amount: '',
        currency: 'USD',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        partner_id: null,
        language: 'ar',
        payment_method: 'cash',
        is_credit: false,
        credit_amount: 0,
      });
      setAttachments([]);
      setInvoiceItems([]);
    }
  }, [invoice, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSave = {
        ...formData,
        attachments: attachments.length > 0 ? attachments.map(a => ({
          name: a.name,
          size: a.size,
          type: a.type,
          url: a.url,
        })) : [],
        items: invoiceItems,
      };
      
      // حفظ الفاتورة والعناصر
      await onSave(dataToSave, invoiceItems);
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw]">
        <HelpButton
          position="top-right"
          helpTextAr={type === 'in' 
            ? "هنا يمكنك إدخال أو تعديل فاتورة وارد. أدخل التاريخ، المبلغ، العملة، والوصف. يمكنك إضافة عناصر من المخزون وربط الفاتورة بشريك (مورد). يمكنك أيضاً إرفاق ملفات مثل صورة الفاتورة."
            : "هنا يمكنك إدخال أو تعديل فاتورة صادر. أدخل التاريخ، المبلغ، العملة، والوصف. يمكنك إضافة عناصر من المخزون وربط الفاتورة بشريك (عميل). يمكنك تحديد طريقة الدفع (كاش، حوالة، أو دين)."}
          helpTextEn={type === 'in'
            ? "Here you can add or edit an incoming invoice. Enter the date, amount, currency, and description. You can add items from inventory and link the invoice to a partner (vendor). You can also attach files like invoice images."
            : "Here you can add or edit an outgoing invoice. Enter the date, amount, currency, and description. You can add items from inventory and link the invoice to a partner (customer). You can specify payment method (cash, transfer, or credit)."}
          helpTextTr={type === 'in'
            ? "Burada gelen bir fatura ekleyebilir veya düzenleyebilirsiniz. Tarih, tutar, para birimi ve açıklamayı girin. Envanterden öğeler ekleyebilir ve faturayı bir ortakla (tedarikçi) bağlayabilirsiniz. Fatura görüntüleri gibi dosyalar da ekleyebilirsiniz."
            : "Burada giden bir fatura ekleyebilir veya düzenleyebilirsiniz. Tarih, tutar, para birimi ve açıklamayı girin. Envanterden öğeler ekleyebilir ve faturayı bir ortakla (müşteri) bağlayabilirsiniz. Ödeme yöntemini (nakit, transfer veya kredi) belirtebilirsiniz."}
        />
        <DialogHeader>
          <DialogTitle>
            {invoice ? t('common.edit') : t('common.add')} {type === 'in' ? t('common.invoicesIn') : t('common.invoicesOut')}
          </DialogTitle>
          <DialogDescription>
            {invoice ? 'قم بتعديل بيانات الفاتورة' : type === 'in' ? 'قم بإدخال بيانات فاتورة وارد جديدة' : 'قم بإدخال بيانات فاتورة صادر جديدة'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                {t('common.date')}
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                {t('common.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
                <option value="SAR">﷼ ريال سعودي (SAR)</option>
                <option value="EUR">€ يورو (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                {t('common.category')}
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="مثال: مواد غذائية، أثاث، إلخ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                {type === 'in' ? 'المورد' : 'العميل'}
              </label>
              <select
                value={formData.partner_id || ''}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={loadingPartners}
              >
                <option value="">-- اختر {type === 'in' ? 'مورد' : 'عميل'} --</option>
                {partners
                  .filter(p => type === 'in' ? p.type === 'Vendor' : p.type === 'Customer')
                  .map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                اللغة / Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                {t('common.amount')} ({formData.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 rtl:text-right">
                طريقة الدفع
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value, is_credit: e.target.value === 'credit' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="cash">نقد</option>
                <option value="card">بطاقة</option>
                <option value="transfer">تحويل</option>
                <option value="credit">ذمة</option>
              </select>
            </div>

            {formData.is_credit || formData.payment_method === 'credit' ? (
              <div>
                <label className="block text-sm font-medium mb-2 rtl:text-right">
                  مبلغ الذمة ({formData.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.credit_amount || formData.amount}
                  onChange={(e) => setFormData({ ...formData, credit_amount: e.target.value, is_credit: true })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 rtl:text-right">
              {t('common.description')}
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows="3"
            />
          </div>

          {/* جدول المنتجات */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-semibold rtl:text-right">المنتجات / Items</h3>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualItem}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">إضافة منتج يدوياً</span>
                  <span className="sm:hidden">إضافة يدوي</span>
                </Button>
                {inventoryItems.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const item = inventoryItems.find(i => i.id === e.target.value);
                        if (item) handleAddItemFromInventory(item);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={loadingInventory}
                  >
                    <option value="">اختر من المخزون...</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.code ? `(${item.code})` : ''} - متوفر: {item.quantity}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {invoiceItems.length > 0 ? (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">#</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">اسم المنتج</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap hidden sm:table-cell">الكود</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">الكمية</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap hidden md:table-cell">الوحدة</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">سعر الوحدة</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">الإجمالي</th>
                      <th className="text-right p-1 sm:p-2 whitespace-nowrap">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="p-1 sm:p-2">{index + 1}</td>
                        <td className="p-1 sm:p-2 min-w-[120px]">
                          <input
                            type="text"
                            value={item.item_name || ''}
                            onChange={(e) => handleUpdateItem(index, 'item_name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="اسم المنتج"
                            required
                          />
                        </td>
                        <td className="p-1 sm:p-2 hidden sm:table-cell min-w-[80px]">
                          <input
                            type="text"
                            value={item.item_code || ''}
                            onChange={(e) => handleUpdateItem(index, 'item_code', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="الكود"
                          />
                        </td>
                        <td className="p-1 sm:p-2 min-w-[80px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                        </td>
                        <td className="p-1 sm:p-2 hidden md:table-cell min-w-[60px]">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="قطعة"
                          />
                        </td>
                        <td className="p-1 sm:p-2 min-w-[100px]">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                        </td>
                        <td className="p-1 sm:p-2 font-semibold text-xs sm:text-sm min-w-[80px]">
                          {parseFloat(item.total_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-1 sm:p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan="5" className="text-right p-2 hidden sm:table-cell">المجموع:</td>
                      <td colSpan="2" className="text-right p-2 sm:hidden">المجموع:</td>
                      <td className="p-2 text-xs sm:text-sm">
                        {invoiceItems
                          .filter(item => item.currency === formData.currency)
                          .reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0)
                          .toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm rtl:text-right">لا توجد منتجات. أضف منتجات من المخزون أو يدوياً.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              المرفقات (اختياري)
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <Upload className="h-5 w-5 mr-2" />
                <span className="text-sm">رفع ملف</span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf,.doc,.docx"
                />
              </label>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm truncate flex-1">{attachment.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 rtl:flex-row-reverse pt-2 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <InteractiveButton
              variant="cancel"
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </InteractiveButton>
            <InteractiveButton
              variant="save"
              type="submit"
              className="w-full sm:w-auto"
            >
              {t('common.save')}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
