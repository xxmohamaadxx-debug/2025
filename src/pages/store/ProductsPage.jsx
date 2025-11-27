import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import ProductDialog from '@/components/store/ProductDialog';
import InteractiveButton from '@/components/ui/InteractiveButton';

const ProductsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getProducts(user.tenant_id);
      setProducts(data || []);
    } catch (error) {
      console.error('Load products error:', error);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        variant: "destructive" 
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedProduct) {
        await neonService.updateProduct(selectedProduct.id, data, user.tenant_id);
        toast({ title: "تم تحديث المنتج بنجاح" });
      } else {
        await neonService.createProduct(data, user.tenant_id);
        toast({ title: "تم إضافة المنتج بنجاح" });
      }
      setDialogOpen(false);
      setSelectedProduct(null);
      loadData();
    } catch (error) {
      console.error('Save product error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
      await neonService.deleteProduct(id, user.tenant_id);
      toast({ title: "تم الحذف بنجاح" });
      loadData();
    } catch (error) {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>المنتجات - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          المنتجات
        </h1>
        <Button 
          onClick={() => { setSelectedProduct(null); setDialogOpen(true); }} 
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة منتج
        </Button>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="بحث في المنتجات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-semibold">SKU</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الاسم</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">التصنيف</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">العلامة التجارية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">سعر البيع</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">سعر التكلفة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      لا يوجد منتجات
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm font-medium">{product.sku}</td>
                      <td className="py-3 px-4 text-sm">{product.name}</td>
                      <td className="py-3 px-4 text-sm">{product.category || '-'}</td>
                      <td className="py-3 px-4 text-sm">{product.brand || '-'}</td>
                      <td className="py-3 px-4 text-sm font-semibold">{product.selling_price} {product.currency}</td>
                      <td className="py-3 px-4 text-sm">{product.cost_price} {product.currency}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          product.availability_status === 'available' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {product.availability_status === 'available' ? 'متاح' : 'غير متاح'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <InteractiveButton
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedProduct(product); setDialogOpen(true); }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </InteractiveButton>
                          <InteractiveButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </InteractiveButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <ProductDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        product={selectedProduct} 
        onSave={handleSave}
      />
    </div>
  );
};

export default ProductsPage;

