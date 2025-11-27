import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES } from '@/lib/constants';
import HelpButton from '@/components/ui/HelpButton';

const ContractorProjectItemDialog = ({ open, onOpenChange, item, projects, units, products, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project_id: '',
    item_code: '',
    item_name: '',
    description: '',
    quantity: '',
    unit_id: '',
    unit_price: '',
    currency: 'USD',
    sort_order: 0,
    notes: ''
  });

  useEffect(() => {
    if (item && open) {
      setFormData({
        project_id: item.project_id || '',
        item_code: item.item_code || '',
        item_name: item.item_name || '',
        description: item.description || '',
        quantity: item.quantity || '',
        unit_id: item.unit_id || '',
        unit_price: item.unit_price || '',
        currency: item.currency || 'TRY',
        sort_order: item.sort_order || 0,
        notes: item.notes || ''
      });
    } else if (open) {
      setFormData({
        project_id: '',
        item_code: '',
        item_name: '',
        description: '',
        quantity: '',
        unit_id: '',
        unit_price: '',
        currency: 'USD',
        sort_order: 0,
        notes: ''
      });
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      quantity: parseFloat(formData.quantity || 0),
      unit_price: parseFloat(formData.unit_price || 0),
      sort_order: parseInt(formData.sort_order || 0)
    });
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        item_code: product.code || formData.item_code,
        item_name: product.name || formData.item_name,
        unit_id: product.unit_id || formData.unit_id,
        unit_price: product.price || formData.unit_price,
        currency: product.currency || formData.currency
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل بند من جدول الكميات (BOQ) للمشروع. حدد المشروع، أدخل كود البند، الاسم، الكمية، الوحدة، سعر الوحدة، والعملة. يمكنك ربط البند بمنتج من المخزون إذا كان متوفراً."
          helpTextEn="Here you can add or edit a Bill of Quantities (BOQ) item for the project. Select the project, enter the item code, name, quantity, unit, unit price, and currency. You can link the item to an inventory product if available."
          helpTextTr="Burada proje için bir Miktar Listesi (BOQ) öğesi ekleyebilir veya düzenleyebilirsiniz. Projeyi seçin, öğe kodunu, adını, miktarını, birimini, birim fiyatını ve para birimini girin. Öğeyi mevcut ise bir envanter ürününe bağlayabilirsiniz."}
        />
        <DialogHeader>
          <DialogTitle>
            {item ? 'تعديل بند الكميات' : 'إضافة بند كميات جديد'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'قم بتعديل بيانات بند الكميات' : 'قم بإدخال بيانات بند كميات جديد (BOQ)'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">المشروع *</label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر المشروع</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} - {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">المنتج (اختياري)</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleProductSelect(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر منتج لتعبئة البيانات</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">كود البند *</label>
              <input
                type="text"
                required
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="BOQ-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">اسم البند *</label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم البند"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                rows="2"
                placeholder="وصف البند"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الكمية *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الوحدة *</label>
              <select
                required
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر الوحدة</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name_ar} ({unit.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">سعر الوحدة *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
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
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
                <option value="SAR">﷼ ريال سعودي (SAR)</option>
                <option value="EUR">€ يورو (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">ترتيب العرض</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0"
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

          {formData.quantity && formData.unit_price && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                الإجمالي: <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {CURRENCIES[formData.currency]?.symbol || formData.currency} {(parseFloat(formData.quantity || 0) * parseFloat(formData.unit_price || 0)).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <InteractiveButton
              variant="cancel"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </InteractiveButton>
            <InteractiveButton
              variant="save"
              type="submit"
            >
              {t('common.save')}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractorProjectItemDialog;

