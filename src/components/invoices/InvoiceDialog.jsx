
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { Upload, X, Paperclip } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const InvoiceDialog = ({ open, onOpenChange, invoice, onSave, type }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'TRY',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    partner_id: null,
  });

  // تحميل الشركاء (عملاء/موردين)
  useEffect(() => {
    if (open && user?.tenant_id) {
      loadPartners();
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

  // معالجة المرفقات
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      // في التطبيق الحقيقي، يجب رفع الملفات إلى خدمة تخزين
      // هنا سنحفظ معلومات الملف فقط
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type,
          url: reader.result, // في التطبيق الحقيقي، يجب استخدام رابط من خدمة التخزين
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
      });
      // تحميل المرفقات إذا كانت موجودة
      if (invoice.attachments && Array.isArray(invoice.attachments)) {
        setAttachments(invoice.attachments);
      } else {
        setAttachments([]);
      }
    } else {
      setFormData({
        amount: '',
        currency: 'TRY',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        partner_id: null,
      });
      setAttachments([]);
    }
  }, [invoice, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      attachments: attachments.length > 0 ? attachments.map(a => ({
        name: a.name,
        size: a.size,
        type: a.type,
        url: a.url,
      })) : [],
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {invoice ? t('common.edit') : t('common.add')} {type === 'in' ? t('common.invoicesIn') : t('common.invoicesOut')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('common.amount')}
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
