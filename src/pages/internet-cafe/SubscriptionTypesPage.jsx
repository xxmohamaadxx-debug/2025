import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import SubscriptionTypeDialog from '@/components/internet-cafe/SubscriptionTypeDialog';
import InteractiveButton from '@/components/ui/InteractiveButton';

const SubscriptionTypesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getSubscriptionTypes(user.tenant_id);
      setTypes(data || []);
    } catch (error) {
      console.error('Load subscription types error:', error);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        variant: "destructive" 
      });
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedType) {
        await neonService.updateSubscriptionType(selectedType.id, data, user.tenant_id);
        toast({ title: "تم تحديث نوع الاشتراك بنجاح" });
      } else {
        await neonService.createSubscriptionType(data, user.tenant_id);
        toast({ title: "تم إضافة نوع الاشتراك بنجاح" });
      }
      setDialogOpen(false);
      setSelectedType(null);
      loadData();
    } catch (error) {
      console.error('Save subscription type error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا النوع؟')) return;
    
    try {
      await neonService.deleteSubscriptionType(id, user.tenant_id);
      toast({ title: "تم الحذف بنجاح" });
      loadData();
    } catch (error) {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const filteredTypes = types.filter(type => 
    !searchTerm || 
    type.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>أنواع الاشتراكات - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          أنواع الاشتراكات
        </h1>
        <Button 
          onClick={() => { setSelectedType(null); setDialogOpen(true); }} 
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة نوع اشتراك
        </Button>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="بحث في أنواع الاشتراكات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          />
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
                  <th className="text-right py-3 px-4 text-sm font-semibold">الاسم</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المدة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">السرعة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">حد الاستخدام</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">السعر</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      لا يوجد أنواع اشتراكات
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm font-medium">{type.name}</td>
                      <td className="py-3 px-4 text-sm">
                        {type.duration_days ? `${type.duration_days} يوم` : ''}
                        {type.duration_hours ? `${type.duration_hours} ساعة` : ''}
                      </td>
                      <td className="py-3 px-4 text-sm">{type.speed_limit || '-'}</td>
                      <td className="py-3 px-4 text-sm">{type.data_limit_gb ? `${type.data_limit_gb} GB` : '-'}</td>
                      <td className="py-3 px-4 text-sm">{type.price} {type.currency}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          type.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {type.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <InteractiveButton
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedType(type); setDialogOpen(true); }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </InteractiveButton>
                          <InteractiveButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(type.id)}
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

      <SubscriptionTypeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        subscriptionType={selectedType} 
        onSave={handleSave}
      />
    </div>
  );
};

export default SubscriptionTypesPage;

