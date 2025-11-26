import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Wifi, Clock, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import InternetUsageDialog from '@/components/internet/InternetUsageDialog';

const InternetUsagePage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [usage, setUsage] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterSubscriber, setFilterSubscriber] = useState('all');

  useEffect(() => {
    if (user?.tenant_id) {
      loadUsage();
      loadSubscribers();
    }
  }, [user, filterDate]);

  const loadSubscribers = async () => {
    try {
      const data = await neonService.getSubscribers(user.tenant_id);
      setSubscribers(data || []);
    } catch (error) {
      console.error('Load subscribers error:', error);
    }
  };

  const loadUsage = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getInternetUsage(
        user.tenant_id,
        filterSubscriber !== 'all' ? filterSubscriber : null,
        filterDate,
        filterDate
      );
      setUsage(data || []);
    } catch (error) {
      console.error('Load internet usage error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل سجل الاستخدام',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedUsage(null);
    setDialogOpen(true);
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedUsage) {
        await neonService.updateInternetUsage(selectedUsage.id, { ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم تحديث السجل بنجاح' });
      } else {
        await neonService.createInternetUsage({ ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم إضافة السجل بنجاح' });
      }
      setDialogOpen(false);
      setSelectedUsage(null);
      loadUsage();
    } catch (error) {
      console.error('Save internet usage error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ السجل',
        variant: 'destructive'
      });
    }
  };

  const filteredUsage = usage;

  const totalMinutes = filteredUsage.reduce((sum, u) => sum + (parseInt(u.duration_minutes) || 0), 0);
  const totalData = filteredUsage.reduce((sum, u) => sum + (parseFloat(u.data_used_mb) || 0), 0);
  const totalCost = filteredUsage.reduce((sum, u) => sum + (parseFloat(u.cost) || 0), 0);

  return (
    <div className="space-y-6">
      <Helmet><title>استخدام الإنترنت - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Wifi className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            استخدام الإنترنت
          </h1>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة سجل استخدام
        </Button>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المدة</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {Math.floor(totalMinutes / 60)}:{(totalMinutes % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-gray-500">ساعة:دقيقة</p>
            </div>
            <Clock className="h-10 w-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي البيانات</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {totalData.toFixed(2)} MB
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي التكلفة</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {totalCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Wifi className="h-10 w-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* الفلترة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">المشترك</label>
            <select
              value={filterSubscriber}
              onChange={(e) => {
                setFilterSubscriber(e.target.value);
                loadUsage();
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">الكل</option>
              {subscribers.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المشترك</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">النهاية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المدة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">السرعة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">البيانات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsage.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    لا توجد سجلات استخدام
                  </td>
                </tr>
              ) : (
                filteredUsage.map((item) => {
                  const durationHours = Math.floor((item.duration_minutes || 0) / 60);
                  const durationMins = (item.duration_minutes || 0) % 60;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subscribers.find(s => s.id === item.subscriber_id)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.session_start ? formatDateShort(item.session_start) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.session_end ? formatDateShort(item.session_end) : 'قيد التشغيل'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {durationHours}:{durationMins.toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.internet_speed || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {parseFloat(item.data_used_mb || 0).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {parseFloat(item.cost || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InternetUsageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usage={selectedUsage}
        subscribers={subscribers}
        onSave={handleSave}
      />
    </div>
  );
};

export default InternetUsagePage;

