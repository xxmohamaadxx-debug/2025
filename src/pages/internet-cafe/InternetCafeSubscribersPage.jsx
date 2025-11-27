import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import SubscriberDialog from '@/components/internet-cafe/SubscriberDialog';
import { formatDateAR } from '@/lib/dateUtils';
import InteractiveButton from '@/components/ui/InteractiveButton';

const InternetCafeSubscribersPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subscribers, setSubscribers] = useState([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
      loadSubscriptionTypes();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getSubscribers(user.tenant_id);
      setSubscribers(data || []);
    } catch (error) {
      console.error('Load subscribers error:', error);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        description: error.message || 'حدث خطأ أثناء تحميل المشتركين',
        variant: "destructive" 
      });
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionTypes = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getSubscriptionTypes(user.tenant_id);
      setSubscriptionTypes(data || []);
    } catch (error) {
      console.error('Load subscription types error:', error);
    }
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) {
      toast({ 
        title: "خطأ", 
        description: "لا يمكن حفظ البيانات. يجب أن تكون مرتبطاً بمتجر.",
        variant: "destructive" 
      });
      return;
    }

    try {
      if (selectedSubscriber) {
        await neonService.updateSubscriber(selectedSubscriber.id, data, user.tenant_id);
        toast({ title: "تم تحديث المشترك بنجاح" });
      } else {
        await neonService.createSubscriber(data, user.tenant_id);
        toast({ title: "تم إضافة المشترك بنجاح" });
      }
      setDialogOpen(false);
      setSelectedSubscriber(null);
      loadData();
    } catch (error) {
      console.error('Save subscriber error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: error.message || "حدث خطأ أثناء حفظ البيانات.",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشترك؟')) return;
    
    try {
      await neonService.deleteSubscriber(id, user.tenant_id);
      toast({ title: "تم حذف المشترك بنجاح" });
      loadData();
    } catch (error) {
      console.error('Delete subscriber error:', error);
      toast({ 
        title: "خطأ في الحذف", 
        variant: "destructive" 
      });
    }
  };

  const handleRenew = async (subscriber, additionalDays = 30, startFromToday = true) => {
    if (!window.confirm(`هل تريد تجديد الاشتراك ${additionalDays} يوم ${startFromToday ? 'من تاريخ اليوم' : 'من تاريخ الانتهاء'}؟`)) return;
    
    try {
      await neonService.renewSubscription(subscriber.id, additionalDays, startFromToday, user.tenant_id);
      toast({ title: "تم تجديد الاشتراك بنجاح" });
      loadData();
    } catch (error) {
      console.error('Renew subscription error:', error);
      toast({ 
        title: "خطأ في التجديد", 
        description: error.message || "حدث خطأ أثناء تجديد الاشتراك.",
        variant: "destructive" 
      });
    }
  };

  // Filter subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = !searchTerm || 
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.subscriber_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.phone?.includes(searchTerm) ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    
    if (filterPeriod !== 'all' && sub.end_date) {
      const endDate = new Date(sub.end_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      if (filterPeriod === 'expiring_soon' && daysUntilExpiry > 7) return false;
      if (filterPeriod === 'expired' && daysUntilExpiry >= 0) return false;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status, endDate) => {
    if (endDate) {
      const daysUntilExpiry = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) return { text: 'منتهي', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
      if (daysUntilExpiry <= 7) return { text: 'قريب الانتهاء', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    }
    
    const statusMap = {
      active: { text: 'نشط', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      expired: { text: 'منتهي', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      suspended: { text: 'موقوف', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      cancelled: { text: 'ملغى', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' }
    };
    
    return statusMap[status] || statusMap.active;
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>المشتركين - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            المشتركين
          </h1>
        </div>
        <Button 
          onClick={() => { setSelectedSubscriber(null); setDialogOpen(true); }} 
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة مشترك
        </Button>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="بحث في المشتركين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="suspended">موقوف</option>
            <option value="cancelled">ملغى</option>
          </select>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">جميع الفترات</option>
            <option value="expiring_soon">قريب الانتهاء (أسبوع)</option>
            <option value="expired">منتهي</option>
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
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">رقم المشترك</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الاسم</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الهاتف</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">نوع الاشتراك</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">تاريخ البداية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">تاريخ النهاية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      لا يوجد مشتركين
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((sub) => {
                    const statusBadge = getStatusBadge(sub.status, sub.end_date);
                    const subType = subscriptionTypes.find(st => st.id === sub.subscription_type_id);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {sub.subscriber_number}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {sub.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {sub.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {subType?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {sub.start_date ? formatDateAR(sub.start_date) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {sub.end_date ? formatDateAR(sub.end_date) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            {sub.status === 'active' && (
                              <InteractiveButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleRenew(sub, 30, true)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Calendar className="h-4 w-4" />
                              </InteractiveButton>
                            )}
                            <InteractiveButton
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedSubscriber(sub); setDialogOpen(true); }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </InteractiveButton>
                            <InteractiveButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(sub.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </InteractiveButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <SubscriberDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        subscriber={selectedSubscriber} 
        onSave={handleSave}
        subscriptionTypes={subscriptionTypes}
      />
    </div>
  );
};

export default InternetCafeSubscribersPage;

