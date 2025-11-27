import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Play, Square, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import SessionDialog from '@/components/internet-cafe/SessionDialog';
import { formatDateAR } from '@/lib/dateUtils';
import InteractiveButton from '@/components/ui/InteractiveButton';

const InternetSessionsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, ended

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
      loadSubscribers();
      loadDevices();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getSessions(user.tenant_id);
      setSessions(data || []);
    } catch (error) {
      console.error('Load sessions error:', error);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        variant: "destructive" 
      });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribers = async () => {
    try {
      const data = await neonService.getSubscribers(user.tenant_id);
      setSubscribers(data || []);
    } catch (error) {
      console.error('Load subscribers error:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const data = await neonService.getDevices(user.tenant_id);
      setDevices(data || []);
    } catch (error) {
      console.error('Load devices error:', error);
    }
  };

  const handleStartSession = () => {
    setSelectedSession(null);
    setDialogOpen(true);
  };

  const handleEndSession = async (session) => {
    if (!session.end_time) {
      const endTime = new Date().toISOString();
      const durationMinutes = Math.floor((new Date(endTime) - new Date(session.start_time)) / (1000 * 60));
      const totalAmount = session.base_price || (durationMinutes / 60 * (session.price_per_hour || 0));
      
      try {
        await neonService.endSession(session.id, endTime, totalAmount, user.tenant_id);
        toast({ title: "تم إنهاء الجلسة بنجاح" });
        loadData();
      } catch (error) {
        console.error('End session error:', error);
        toast({ title: "خطأ في إنهاء الجلسة", variant: "destructive" });
      }
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchTerm || 
      session.session_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.guest_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isActive = !session.end_time;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'ended' && !isActive);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>الجلسات - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          الجلسات
        </h1>
        <Button 
          onClick={handleStartSession}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white w-full sm:w-auto"
        >
          <Play className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> بدء جلسة
        </Button>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="بحث في الجلسات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">جميع الجلسات</option>
            <option value="active">نشطة</option>
            <option value="ended">منتهية</option>
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
                  <th className="text-right py-3 px-4 text-sm font-semibold">رقم الجلسة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المشترك/الضيف</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الجهاز</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">وقت البداية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">وقت النهاية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المدة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الاستهلاك</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المبلغ</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-gray-500">
                      لا يوجد جلسات
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = !session.end_time;
                    const subscriber = subscribers.find(s => s.id === session.subscriber_id);
                    const device = devices.find(d => d.id === session.device_id);
                    return (
                      <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-sm font-medium">{session.session_number}</td>
                        <td className="py-3 px-4 text-sm">
                          {subscriber ? subscriber.name : session.guest_name || 'ضيف'}
                        </td>
                        <td className="py-3 px-4 text-sm">{device?.device_number || '-'}</td>
                        <td className="py-3 px-4 text-sm">
                          {session.start_time ? new Date(session.start_time).toLocaleString('ar-EG') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {session.end_time ? new Date(session.end_time).toLocaleString('ar-EG') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {session.duration_minutes ? `${Math.floor(session.duration_minutes / 60)}:${String(session.duration_minutes % 60).padStart(2, '0')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {session.data_consumption_gb ? `${session.data_consumption_gb.toFixed(2)} GB` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold">
                          {session.total_amount ? `${session.total_amount} ${session.currency || 'TRY'}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            {isActive && (
                              <InteractiveButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleEndSession(session)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Square className="h-4 w-4" />
                              </InteractiveButton>
                            )}
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

      <SessionDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        session={selectedSession}
        subscribers={subscribers}
        devices={devices}
        onSave={async (data) => {
          try {
            if (selectedSession) {
              await neonService.updateSession(selectedSession.id, data, user.tenant_id);
            } else {
              await neonService.createSession(data, user.tenant_id);
            }
            toast({ title: "تم حفظ الجلسة بنجاح" });
            setDialogOpen(false);
            loadData();
          } catch (error) {
            toast({ title: "خطأ في الحفظ", variant: "destructive" });
          }
        }}
      />
    </div>
  );
};

export default InternetSessionsPage;

