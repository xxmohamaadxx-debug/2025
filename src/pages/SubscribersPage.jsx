import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Edit, Trash2, Users, Wifi, Calendar, Wallet } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import SubscriberDialog from '@/components/subscribers/SubscriberDialog';

const SubscribersPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'suspended', 'expired'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadSubscribers();
  }, [user]);

  const loadSubscribers = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getSubscribers(user.tenant_id);
      setSubscribers(data || []);
    } catch (error) {
      console.error('Load subscribers error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المشتركين',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedSubscriber(null);
    setDialogOpen(true);
  };

  const handleEdit = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setDialogOpen(true);
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedSubscriber) {
        await neonService.updateSubscriber(selectedSubscriber.id, { ...data, updated_by: user.id }, user.tenant_id);
        toast({ title: 'تم تحديث المشترك بنجاح' });
      } else {
        await neonService.createSubscriber({ ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم إضافة المشترك بنجاح' });
      }
      setDialogOpen(false);
      setSelectedSubscriber(null);
      loadSubscribers();
    } catch (error) {
      console.error('Save subscriber error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ المشترك',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشترك؟')) return;

    try {
      await neonService.deleteSubscriber(id, user.tenant_id);
      toast({ title: 'تم حذف المشترك بنجاح' });
      loadSubscribers();
    } catch (error) {
      console.error('Delete subscriber error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف المشترك',
        variant: 'destructive'
      });
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    if (searchTerm && !sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !sub.phone?.includes(searchTerm) && !sub.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (filterActive === 'active' && (!sub.is_active || sub.is_suspended)) return false;
    if (filterActive === 'suspended' && !sub.is_suspended) return false;
    if (filterActive === 'expired' && sub.end_date && new Date(sub.end_date) > new Date()) return false;
    
    return true;
  });

  const activeCount = subscribers.filter(s => s.is_active && !s.is_suspended).length;
  const suspendedCount = subscribers.filter(s => s.is_suspended).length;
  const expiredCount = subscribers.filter(s => s.end_date && new Date(s.end_date) < new Date()).length;

  return (
    <div className="space-y-6">
      <Helmet><title>المشتركين - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            المشتركين
          </h1>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة مشترك
        </Button>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المشتركين</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {subscribers.length}
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">نشطين</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {activeCount}
              </p>
            </div>
            <Wifi className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">معلقين</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                {suspendedCount}
              </p>
            </div>
            <Calendar className="h-10 w-10 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">منتهية</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {expiredCount}
              </p>
            </div>
            <Calendar className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* الفلترة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن مشترك..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">الكل</option>
            <option value="active">نشطين فقط</option>
            <option value="suspended">معلقين</option>
            <option value="expired">منتهية</option>
          </select>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الهاتف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">نوع الاشتراك</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">السرعة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">من - إلى</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الرصيد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    لا توجد مشتركين
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((subscriber) => {
                  const currencyInfo = CURRENCIES[subscriber.currency] || { symbol: subscriber.currency || 'TRY' };
                  const isExpired = subscriber.end_date && new Date(subscriber.end_date) < new Date();
                  
                  return (
                    <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {subscriber.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {subscriber.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {subscriber.subscription_type === 'daily' ? 'يومي' :
                         subscriber.subscription_type === 'weekly' ? 'أسبوعي' :
                         subscriber.subscription_type === 'monthly' ? 'شهري' : 'مخصص'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {subscriber.internet_speed || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {subscriber.start_date ? formatDateShort(subscriber.start_date) : '-'}
                        {subscriber.end_date && ` - ${formatDateShort(subscriber.end_date)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          parseFloat(subscriber.balance || 0) >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {currencyInfo.symbol} {parseFloat(subscriber.balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subscriber.is_suspended ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                            معلق
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                            منتهي
                          </span>
                        ) : subscriber.is_active ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                            نشط
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200">
                            غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(subscriber)}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(subscriber.id)}
                            title="حذف"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SubscriberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscriber={selectedSubscriber}
        onSave={handleSave}
      />
    </div>
  );
};

export default SubscribersPage;

