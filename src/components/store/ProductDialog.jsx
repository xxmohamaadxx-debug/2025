import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import HelpButton from '@/components/ui/HelpButton';
// import ImageUploader from '@/components/ImageUploader'; // سيتم إضافته لاحقاً

const ProductDialog = ({ open, onOpenChange, product, onSave }) => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    brand: '',
    specifications: {},
    selling_price: '',
    cost_price: '',
    currency: 'USD',
    tax_rate: '',
    discount_allowed: '',
    reorder_level: '',
    shelf_location: '',
    images: [],
    availability_status: 'available',
    notes: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        brand: product.brand || '',
        specifications: product.specifications || {},
        selling_price: product.selling_price || '',
        cost_price: product.cost_price || '',
        currency: product.currency || 'TRY',
        tax_rate: product.tax_rate || '',
        discount_allowed: product.discount_allowed || '',
        reorder_level: product.reorder_level || '',
        shelf_location: product.shelf_location || '',
        images: product.images || [],
        availability_status: product.availability_status || 'available',
        notes: product.notes || ''
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        category: '',
        brand: '',
        specifications: {},
        selling_price: '',
        cost_price: '',
        currency: 'USD',
        tax_rate: '',
        discount_allowed: '',
        reorder_level: '',
        shelf_location: '',
        images: [],
        availability_status: 'available',
        notes: ''
      });
    }
  }, [product, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      selling_price: parseFloat(formData.selling_price || 0),
      cost_price: parseFloat(formData.cost_price || 0),
      tax_rate: parseFloat(formData.tax_rate || 0),
      discount_allowed: parseFloat(formData.discount_allowed || 0),
      reorder_level: parseInt(formData.reorder_level || 0),
      specifications: typeof formData.specifications === 'string' 
        ? JSON.parse(formData.specifications || '{}')
        : formData.specifications
    };
    onSave(dataToSave);
  };

  const categories = ['شواحن', 'كفرات', 'سماعات', 'كابلات', 'حافظات', 'أخرى'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل منتج. أدخل SKU (كود المنتج)، الاسم، الفئة، الماركة، سعر البيع، سعر التكلفة، العملة، معدل الضريبة، والحد الأدنى لإعادة الطلب. يمكنك إضافة مواصفات تفصيلية وموقع الرف."
          helpTextEn="Here you can add or edit a product. Enter the SKU (product code), name, category, brand, selling price, cost price, currency, tax rate, and reorder level. You can add detailed specifications and shelf location."
          helpTextTr="Burada bir ürün ekleyebilir veya düzenleyebilirsiniz. SKU'yu (ürün kodu), adı, kategoriyi, markayı, satış fiyatını, maliyet fiyatını, para birimini, vergi oranını ve yeniden sipariş seviyesini girin. Detaylı özellikler ve raf konumu ekleyebilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>{product ? 'تعديل منتج' : 'إضافة منتج جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
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
              <label className="block text-sm font-medium mb-1">التصنيف</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">-- اختر تصنيف --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العلامة التجارية</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر البيع *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر التكلفة *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
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
              <label className="block text-sm font-medium mb-1">نسبة الضريبة (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الخصم المسموح (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_allowed}
                onChange={(e) => setFormData({ ...formData, discount_allowed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حد إعادة الطلب</label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموقع على الرف</label>
              <input
                type="text"
                value={formData.shelf_location}
                onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حالة التوفر</label>
              <select
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="available">متاح</option>
                <option value="out_of_stock">نفذ من المخزون</option>
                <option value="discontinued">متوقف</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">الصور</label>
              <div className="text-sm text-gray-500 mb-2">ميزة رفع الصور قيد التطوير</div>
              {/* ImageUploader component will be integrated later */}
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
            <InteractiveButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </InteractiveButton>
            <InteractiveButton type="submit" variant="default" className="bg-gradient-to-r from-orange-500 to-pink-500">
              {product ? 'تحديث' : 'إضافة'}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;

