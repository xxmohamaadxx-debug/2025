import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Upload, X, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
    currency: 'TRY',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    partner_id: null,
    language: 'ar',
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
        currency: 'TRY',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        partner_id: null,
        language: 'ar',
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? t('common.edit') : t('common.add')} {type === 'in' ? t('common.invoicesIn') : t('common.invoicesOut')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('common.date')}
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('common.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('common.category')}
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثال: مواد غذائية، أثاث، إلخ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {type === 'in' ? 'المورد' : 'العميل'}
              </label>
              <select
                value={formData.partner_id || ''}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
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
              <label className="block text-sm font-medium mb-2">
                اللغة / Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('common.amount')} ({formData.currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('common.description')}
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="3"
            />
          </div>

          {/* جدول المنتجات */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">المنتجات / Items</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إضافة منتج يدوياً
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
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-right p-2">#</th>
                      <th className="text-right p-2">اسم المنتج</th>
                      <th className="text-right p-2">الكود</th>
                      <th className="text-right p-2">الكمية</th>
                      <th className="text-right p-2">الوحدة</th>
                      <th className="text-right p-2">سعر الوحدة</th>
                      <th className="text-right p-2">الإجمالي</th>
                      <th className="text-right p-2">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.item_name || ''}
                            onChange={(e) => handleUpdateItem(index, 'item_name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
                            placeholder="اسم المنتج"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.item_code || ''}
                            onChange={(e) => handleUpdateItem(index, 'item_code', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
                            placeholder="الكود"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
                            placeholder="قطعة"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
                            required
                          />
                        </td>
                        <td className="p-2 font-semibold">
                          {parseFloat(item.total_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan="6" className="text-right p-2">المجموع:</td>
                      <td className="p-2">
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
              <p className="text-gray-500 text-center py-4">لا توجد منتجات. أضف منتجات من المخزون أو يدوياً.</p>
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

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
