import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import DeviceDialog from '@/components/internet-cafe/DeviceDialog';
import InteractiveButton from '@/components/ui/InteractiveButton';

const InternetCafeDevicesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getDevices(user.tenant_id);
      setDevices(data || []);
    } catch (error) {
      console.error('Load devices error:', error);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        variant: "destructive" 
      });
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedDevice) {
        await neonService.updateDevice(selectedDevice.id, data, user.tenant_id);
        toast({ title: "تم تحديث الجهاز بنجاح" });
      } else {
        await neonService.createDevice(data, user.tenant_id);
        toast({ title: "تم إضافة الجهاز بنجاح" });
      }
      setDialogOpen(false);
      setSelectedDevice(null);
      loadData();
    } catch (error) {
      console.error('Save device error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    
    try {
      await neonService.deleteDevice(id, user.tenant_id);
      toast({ title: "تم الحذف بنجاح" });
      loadData();
    } catch (error) {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = !searchTerm || 
      device.device_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      available: { text: 'متاح', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      in_use: { text: 'قيد الاستخدام', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      maintenance: { text: 'صيانة', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      offline: { text: 'غير متصل', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    };
    return statusMap[status] || statusMap.available;
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>الأجهزة - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          الأجهزة والمقاعد
        </h1>
        <Button 
          onClick={() => { setSelectedDevice(null); setDialogOpen(true); }} 
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة جهاز
        </Button>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="بحث في الأجهزة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">جميع الحالات</option>
            <option value="available">متاح</option>
            <option value="in_use">قيد الاستخدام</option>
            <option value="maintenance">صيانة</option>
            <option value="offline">غير متصل</option>
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
                  <th className="text-right py-3 px-4 text-sm font-semibold">رقم الجهاز</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المواصفات</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الموقع</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">سعر الجلسة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      لا يوجد أجهزة
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const statusBadge = getStatusBadge(device.status);
                    return (
                      <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-sm font-medium">{device.device_number}</td>
                        <td className="py-3 px-4 text-sm">{device.specifications || '-'}</td>
                        <td className="py-3 px-4 text-sm">{device.location || '-'}</td>
                        <td className="py-3 px-4 text-sm">{device.session_price || 0} {device.currency || 'TRY'}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <InteractiveButton
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedDevice(device); setDialogOpen(true); }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </InteractiveButton>
                            <InteractiveButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(device.id)}
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

      <DeviceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        device={selectedDevice} 
        onSave={handleSave}
      />
    </div>
  );
};

export default InternetCafeDevicesPage;

