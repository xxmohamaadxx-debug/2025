import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Bell, Save, CheckCircle, Volume2, VolumeX, Smartphone, Globe, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

const NotificationSettingsPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  const notificationTypes = [
    { type: 'create', label: 'إضافة', desc: 'إشعارات عند إضافة بيانات جديدة' },
    { type: 'update', label: 'تعديل', desc: 'إشعارات عند تعديل البيانات' },
    { type: 'delete', label: 'حذف', desc: 'إشعارات عند حذف البيانات' },
    { type: 'upload_success', label: 'رفع ناجح', desc: 'إشعارات عند نجاح رفع التحديثات' },
    { type: 'upload_failed', label: 'رفع فاشل', desc: 'إشعارات عند فشل رفع التحديثات' },
    { type: 'sync_success', label: 'مزامنة ناجحة', desc: 'إشعارات عند نجاح المزامنة' },
    { type: 'sync_failed', label: 'مزامنة فاشلة', desc: 'إشعارات عند فشل المزامنة' },
    { type: 'alert', label: 'تنبيه', desc: 'إشعارات تنبيهية مهمة' },
    { type: 'system', label: 'نظام', desc: 'إشعارات النظام' },
    { type: 'backup_success', label: 'نسخ احتياطي ناجح', desc: 'إشعارات عند نجاح النسخ الاحتياطي' },
    { type: 'backup_failed', label: 'نسخ احتياطي فاشل', desc: 'إشعارات عند فشل النسخ الاحتياطي' },
    { type: 'subscription_expiring', label: 'انتهاء اشتراك قريب', desc: 'إشعارات قبل انتهاء الاشتراك' },
    { type: 'subscription_expired', label: 'انتهاء اشتراك', desc: 'إشعارات عند انتهاء الاشتراك' },
    { type: 'low_stock', label: 'مخزون منخفض', desc: 'إشعارات عند انخفاض المخزون' },
    { type: 'payment_received', label: 'استلام دفعة', desc: 'إشعارات عند استلام دفعات' }
  ];

  useEffect(() => {
    if (user?.tenant_id) {
      loadSettings();
      checkPushSupport();
    }
  }, [user]);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      checkPushPermission();
    } else {
      setPushSupported(false);
    }
  };

  const checkPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushEnabled(permission === 'granted');
    } catch (error) {
      console.error('Check push permission error:', error);
    }
  };

  const loadSettings = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getTenantNotificationSettings(user.tenant_id);
      
      // إنشاء إعدادات افتراضية إذا لم تكن موجودة
      const defaultSettings = notificationTypes.map(nt => ({
        notification_type: nt.type,
        enabled: true,
        show_in_app: true,
        show_push: ['alert', 'system', 'upload_failed', 'sync_failed', 'subscription_expiring', 'subscription_expired'].includes(nt.type),
        show_sound: ['alert', 'upload_failed', 'sync_failed'].includes(nt.type),
        priority: ['alert', 'system'].includes(nt.type) ? 'high' : 'normal'
      }));

      // دمج الإعدادات الموجودة مع الافتراضية
      const mergedSettings = defaultSettings.map(def => {
        const existing = data.find(s => s.notification_type === def.notification_type);
        return existing || def;
      });

      setSettings(mergedSettings);
    } catch (error) {
      console.error('Load settings error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل إعدادات الإشعارات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (index, field) => {
    const newSettings = [...settings];
    newSettings[index] = {
      ...newSettings[index],
      [field]: !newSettings[index][field]
    };
    setSettings(newSettings);
  };

  const handlePriorityChange = (index, priority) => {
    const newSettings = [...settings];
    newSettings[index] = {
      ...newSettings[index],
      priority
    };
    setSettings(newSettings);
  };

  const handleSave = async () => {
    if (!user?.tenant_id) return;

    setSaving(true);
    try {
      await Promise.all(
        settings.map(setting =>
          neonService.updateNotificationSetting(
            user.tenant_id,
            setting.notification_type,
            {
              enabled: setting.enabled,
              show_in_app: setting.show_in_app,
              show_push: setting.show_push,
              show_sound: setting.show_sound,
              priority: setting.priority
            },
            user.id
          )
        )
      );

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات الإشعارات بنجاح'
      });
    } catch (error) {
      console.error('Save settings error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ إعدادات الإشعارات',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    if (!pushSupported) {
      toast({
        title: 'غير مدعوم',
        description: 'الإشعارات الخارجية غير مدعومة في هذا المتصفح',
        variant: 'destructive'
      });
      return;
    }

    try {
      // تسجيل Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // الحصول على VAPID Public Key من إعدادات النظام
        const settings = await neonService.getSystemSettings();
        const vapidPublicKey = settings.vapid_public_key;
        
        if (!vapidPublicKey) {
          toast({
            title: 'خطأ',
            description: 'لم يتم تكوين VAPID Public Key. يرجى التواصل مع الأدمن لإضافته في إعدادات النظام.',
            variant: 'destructive'
          });
          return;
        }

        // الحصول على Push subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        // حفظ الاشتراك
        await neonService.savePushSubscription(
          user.tenant_id,
          user.id,
          subscription
        );

        setPushEnabled(true);
        toast({
          title: 'تم التفعيل',
          description: 'تم تفعيل الإشعارات الخارجية بنجاح'
        });
      } else {
        toast({
          title: 'تم الرفض',
          description: 'تم رفض إذن الإشعارات',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Enable push error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تفعيل الإشعارات الخارجية',
        variant: 'destructive'
      });
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!user?.tenant_id) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>غير مصرح لك بالوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>إعدادات الإشعارات - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="h-8 w-8 text-orange-500" />
            إعدادات الإشعارات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            قم بتخصيص أنواع الإشعارات التي تريد تلقيها
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
        >
          <Save className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>

      {/* Push Notifications Enable Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الإشعارات الخارجية (Push Notifications)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تلقي الإشعارات حتى عند إغلاق التطبيق
              </p>
            </div>
          </div>
          {!pushEnabled ? (
            <Button
              onClick={handleEnablePush}
              disabled={!pushSupported}
              variant={pushSupported ? 'default' : 'outline'}
              className={pushSupported ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
            >
              {pushSupported ? 'تفعيل الإشعارات الخارجية' : 'غير مدعوم'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">مفعل</span>
            </div>
          )}
        </div>
      </div>

      {/* Notification Types Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            أنواع الإشعارات
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {settings.map((setting, index) => {
            const typeInfo = notificationTypes.find(nt => nt.type === setting.notification_type);
            return (
              <div key={setting.notification_type} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      {typeInfo?.label || setting.notification_type}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {typeInfo?.desc || ''}
                    </p>
                  </div>
                  <Switch
                    checked={setting.enabled}
                    onCheckedChange={() => handleToggle(index, 'enabled')}
                  />
                </div>

                {setting.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pl-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">في التطبيق</span>
                      </div>
                      <Switch
                        checked={setting.show_in_app}
                        onCheckedChange={() => handleToggle(index, 'show_in_app')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">إشعار خارجي</span>
                      </div>
                      <Switch
                        checked={setting.show_push}
                        onCheckedChange={() => handleToggle(index, 'show_push')}
                        disabled={!pushEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {setting.show_sound ? (
                          <Volume2 className="h-4 w-4 text-gray-400" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">صوت</span>
                      </div>
                      <Switch
                        checked={setting.show_sound}
                        onCheckedChange={() => handleToggle(index, 'show_sound')}
                      />
                    </div>
                  </div>
                )}

                {setting.enabled && (
                  <div className="mt-4 pl-8">
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                      الأولوية
                    </label>
                    <select
                      value={setting.priority}
                      onChange={(e) => handlePriorityChange(index, e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                    >
                      <option value="low">منخفضة</option>
                      <option value="normal">عادية</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;

