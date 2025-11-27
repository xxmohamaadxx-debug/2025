import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import InteractiveButton from '@/components/ui/InteractiveButton';

const ProductBundlesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getProductBundles(user.tenant_id);
      setBundles(data || []);
    } catch (error) {
      console.error('Load bundles error:', error);
      toast({ title: 'خطأ في تحميل البيانات', variant: "destructive" });
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBundles = bundles.filter(bundle => 
    !searchTerm || 
    bundle.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>الحزم - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          الحزم
        </h1>
        <Button 
          onClick={() => {}}
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة حزمة
        </Button>
      </div>

      <GlassCard>
        <input
          type="text"
          placeholder="بحث في الحزم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
        />
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
                  <th className="text-right py-3 px-4 text-sm font-semibold">اسم الحزمة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">السعر</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">ساعات الإنترنت</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBundles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      لا يوجد حزم
                    </td>
                  </tr>
                ) : (
                  filteredBundles.map((bundle) => (
                    <tr key={bundle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm font-medium">{bundle.name}</td>
                      <td className="py-3 px-4 text-sm font-semibold">{bundle.bundle_price} {bundle.currency}</td>
                      <td className="py-3 px-4 text-sm">{bundle.included_internet_hours || 0} ساعة</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          bundle.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bundle.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <InteractiveButton variant="outline" size="sm" className="text-blue-600">
                            <Edit className="h-4 w-4" />
                          </InteractiveButton>
                          <InteractiveButton variant="outline" size="sm" className="text-red-600">
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
    </div>
  );
};

export default ProductBundlesPage;

