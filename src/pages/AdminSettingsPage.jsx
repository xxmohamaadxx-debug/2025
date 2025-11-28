import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, Lock, Save, UserPlus, Trash2, Shield, Smartphone, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Store } from 'lucide-react';

const AdminSettingsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    support_phone: '',
    support_whatsapp: '',
    support_email: '',
    mobile_app_android_url: '',
    mobile_app_windows_url: '',
    vapid_public_key: '',
    vapid_private_key: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [superAdmins, setSuperAdmins] = useState([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Sections visibility management (per tenant)
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [sectionSettings, setSectionSettings] = useState([]);
  const [savingSections, setSavingSections] = useState(false);
  const availableSections = [
    { code: 'dashboard', label: 'لوحة التحكم', category: 'عام' },
    { code: 'invoices_in', label: 'فواتير الوارد', category: 'عام' },
    { code: 'invoices_out', label: 'فواتير الصادر', category: 'عام' },
    { code: 'inventory', label: 'المخزون', category: 'عام' },
    { code: 'daily_transactions', label: 'الحركة اليومية', category: 'عام' },
    { code: 'customers', label: 'العملاء والديون', category: 'عام' },
    { code: 'partners', label: 'الشركاء', category: 'عام' },
    { code: 'employees', label: 'الموظفون', category: 'عام' },
    { code: 'store_users', label: 'مستخدمو المتجر', category: 'عام' },
    { code: 'reports', label: 'التقارير', category: 'عام' },
    { code: 'journal', label: 'اليومية المحاسبية', category: 'عام' },

    { code: 'internet_cafe_subscribers', label: 'مشتركو الإنترنت', category: 'صالات الإنترنت' },
    { code: 'internet_cafe_subscription_types', label: 'أنواع الاشتراكات', category: 'صالات الإنترنت' },
    { code: 'internet_cafe_sessions', label: 'الجلسات', category: 'صالات الإنترنت' },
    { code: 'internet_cafe_devices', label: 'الأجهزة', category: 'صالات الإنترنت' },

    { code: 'fuel_station', label: 'متجر المحروقات', category: 'المحروقات' },
    { code: 'fuel_counters', label: 'إدارة العدادات', category: 'المحروقات' },

    { code: 'inventory_categories', label: 'الأقسام والفئات', category: 'المخزون' },
    { code: 'inventory_thresholds', label: 'تنبيهات المخزون', category: 'المخزون' },
    { code: 'inventory_audit', label: 'سجل التغييرات', category: 'المخزون' },
    { code: 'warehouse_transactions', label: 'الوارد والصادر', category: 'المخزون' },

    { code: 'contractor_projects', label: 'مشاريع المقاول', category: 'المقاول' },
    { code: 'contractor_project_items', label: 'بنود الكميات', category: 'المقاول' },

    { code: 'store_products', label: 'منتجات المتجر', category: 'المتجر' },
    { code: 'store_pos', label: 'نقاط البيع POS', category: 'المتجر' },
    { code: 'store_sales_invoices', label: 'فواتير المبيعات', category: 'المتجر' },
    { code: 'store_purchase_invoices', label: 'فواتير المشتريات', category: 'المتجر' },
    { code: 'store_bundles', label: 'الحزم', category: 'المتجر' },

    { code: 'comprehensive_reports', label: 'التقارير الشاملة', category: 'النظام' },
    { code: 'subscription', label: 'الاشتراك', category: 'النظام' },
    { code: 'notification_settings', label: 'إعدادات الإشعارات', category: 'النظام' },
    { code: 'support', label: 'الدعم والمساعدة', category: 'النظام' },
    { code: 'messages', label: 'المراسلة', category: 'النظام' },
    { code: 'backup', label: 'النسخ الاحتياطي', category: 'النظام' },
    { code: 'settings', label: 'الإعدادات', category: 'النظام' },
  ];

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadSettings();
      loadSuperAdmins();
      loadTenants();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const data = await neonService.getSystemSettings();
      setSettings({
        support_phone: data.support_phone || '',
        support_whatsapp: data.support_whatsapp || '',
        support_email: data.support_email || '',
        mobile_app_android_url: data.mobile_app_android_url || '',
        mobile_app_windows_url: data.mobile_app_windows_url || '',
        vapid_public_key: data.vapid_public_key || 'BLTLp5pwZyDL8OCGuEv-occebm9Z7KB3UDS5KJ2VjBToYprIKMrtS2ZXob5uEArjkcECSGwKH8iWGWnpo8bTw9c',
        vapid_private_key: data.vapid_private_key || 'hNoVtIuf9kOvXP5QmeWyu9bHMPQ9yCBY3Wn9V0CuQVE'
      });
    } catch (error) {
      console.error('Load settings error:', error);
      toast({ title: 'خطأ في تحميل الإعدادات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.isSuperAdmin) {
      toast({ title: 'غير مصرح', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        neonService.updateSystemSetting('support_phone', settings.support_phone, user.id),
        neonService.updateSystemSetting('support_whatsapp', settings.support_whatsapp, user.id),
        neonService.updateSystemSetting('support_email', settings.support_email, user.id),
        neonService.updateSystemSetting('mobile_app_android_url', settings.mobile_app_android_url, user.id),
        neonService.updateSystemSetting('mobile_app_windows_url', settings.mobile_app_windows_url, user.id),
        neonService.updateSystemSetting('vapid_public_key', settings.vapid_public_key, user.id),
        neonService.updateSystemSetting('vapid_private_key', settings.vapid_private_key, user.id)
      ]);
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
      console.error('Save settings error:', error);
      toast({ title: 'خطأ في حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const loadSuperAdmins = async () => {
    try {
      const admins = await neonService.getAllSuperAdmins();
      setSuperAdmins(admins || []);
    } catch (error) {
      console.error('Load super admins error:', error);
      toast({ title: 'خطأ في تحميل قائمة المدراء', variant: 'destructive' });
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!newAdminData.name || !newAdminData.email || !newAdminData.password) {
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    if (newAdminData.password.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    try {
      await neonService.createSuperAdmin(newAdminData);
      toast({ title: 'تم إضافة المدير بنجاح' });
      setAdminDialogOpen(false);
      setNewAdminData({ name: '', email: '', password: '' });
      loadSuperAdmins();
    } catch (error) {
      console.error('Create super admin error:', error);
      toast({ 
        title: 'خطأ في إضافة المدير', 
        description: error.message || 'قد يكون البريد الإلكتروني مستخدماً بالفعل',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteSuperAdmin = async (adminId) => {
    if (adminId === user.id) {
      toast({ title: 'لا يمكنك حذف نفسك', variant: 'destructive' });
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذا المدير؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      await neonService.deleteSuperAdmin(adminId);
      toast({ title: 'تم حذف المدير بنجاح' });
      loadSuperAdmins();
    } catch (error) {
      console.error('Delete super admin error:', error);
      toast({ 
        title: 'خطأ في حذف المدير', 
        description: error.message || 'لا يمكن حذف آخر مدير في النظام',
        variant: 'destructive' 
      });
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'كلمات المرور غير متطابقة', variant: 'destructive' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    try {
      // التحقق من كلمة المرور الحالية
      const currentUser = await neonService.getUserByEmail(user.email);
      const isValid = await neonService.verifyPassword(user.email, passwordData.currentPassword);
      
      if (!isValid) {
        toast({ title: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
        return;
      }

      // تحديث كلمة المرور
      const newHash = await neonService.hashPassword(passwordData.newPassword);
      await neonService.updateUserAdmin(user.id, { password_hash: newHash });
      
      toast({ title: 'تم تحديث كلمة المرور بنجاح' });
      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Change password error:', error);
      toast({ title: 'خطأ في تحديث كلمة المرور', variant: 'destructive' });
    }
  };

  const loadTenants = async () => {
    try {
      const list = await neonService.getAllTenants();
      setTenants(list || []);
      // select first by default
      if (!selectedTenantId && list && list.length > 0) {
        setSelectedTenantId(list[0].id);
      }
    } catch (error) {
      console.error('Load tenants error:', error);
    }
  };

  useEffect(() => {
    const loadSectionSettings = async () => {
      if (!selectedTenantId) return;
      try {
        const data = await neonService.getTenantSectionSettings?.(selectedTenantId);
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((s, idx) => ({
            section_code: s.section_code,
            is_visible: !!s.is_visible,
            display_order: typeof s.display_order === 'number' ? s.display_order : idx + 1,
          }));
          setSectionSettings(normalized);
        } else {
          const defaults = availableSections.map((sec, idx) => ({
            section_code: sec.code,
            is_visible: true,
            display_order: idx + 1,
          }));
          setSectionSettings(defaults);
        }
      } catch (error) {
        console.error('Load section settings error:', error);
      }
    };
    loadSectionSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const getVisibilityFor = (code) => {
    const found = sectionSettings.find((s) => s.section_code === code);
    return found ? !!found.is_visible : true;
  };

  const toggleVisibility = (code) => {
    setSectionSettings((prev) => {
      const exists = prev.find((s) => s.section_code === code);
      if (exists) {
        return prev.map((s) => (s.section_code === code ? { ...s, is_visible: !s.is_visible } : s));
      }
      return [...prev, { section_code: code, is_visible: true, display_order: prev.length + 1 }];
    });
  };

  const moveSection = (code, direction) => {
    setSectionSettings((prev) => {
      const list = [...prev];
      list.sort((a, b) => a.display_order - b.display_order);
      const idx = list.findIndex((s) => s.section_code === code);
      if (idx === -1) return prev;
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= list.length) return prev;
      const tempOrder = list[idx].display_order;
      list[idx].display_order = list[swapWith].display_order;
      list[swapWith].display_order = tempOrder;
      list.sort((a, b) => a.display_order - b.display_order);
      return list;
    });
  };

  const saveSectionSettings = async () => {
    if (!selectedTenantId) return;
    try {
      setSavingSections(true);
      const merged = availableSections.map((sec, idx) => {
        const existing = sectionSettings.find((s) => s.section_code === sec.code);
        return {
          section_code: sec.code,
          is_visible: existing ? !!existing.is_visible : true,
          display_order: existing && typeof existing.display_order === 'number' ? existing.display_order : idx + 1,
        };
      });
      await neonService.updateTenantSectionSettings?.(selectedTenantId, merged);
      toast({ title: 'تم حفظ الأقسام الظاهرة', description: 'تم تطبيق التغييرات على الشريط الجانبي' });
    } catch (error) {
      console.error('Save section settings error:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ إعدادات الأقسام', variant: 'destructive' });
    } finally {
      setSavingSections(false);
    }
  };

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
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
        <title>إعدادات المدير - نظام إبراهيم للمحاسبة</title>
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">إعدادات المدير</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة إعدادات النظام العامة</p>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">إعدادات التواصل</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              رقم الجوال للدعم
            </label>
            <input
              type="text"
              value={settings.support_phone}
              onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+963994054027"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              رقم الواتساب للدعم
            </label>
            <input
              type="text"
              value={settings.support_whatsapp}
              onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+963994054027"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني للدعم
            </label>
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="systemibrahem@gmail.com"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
            >
              <Save className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile App Download Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            روابط تحميل تطبيق الجوال
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة روابط تحميل تطبيق الجوال (أندرويد وويندوز)</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              رابط تحميل تطبيق أندرويد (Android)
            </label>
            <input
              type="url"
              value={settings.mobile_app_android_url}
              onChange={(e) => setSettings({ ...settings, mobile_app_android_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://play.google.com/store/apps/... أو رابط مباشر للتنزيل"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              رابط تحميل تطبيق ويندوز (Windows)
            </label>
            <input
              type="url"
              value={settings.mobile_app_windows_url}
              onChange={(e) => setSettings({ ...settings, mobile_app_windows_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://apps.microsoft.com/... أو رابط مباشر للتنزيل"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
            >
              <Save className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              {saving ? 'جاري الحفظ...' : 'حفظ الروابط'}
            </Button>
          </div>
        </div>
      </div>

      {/* VAPID Keys Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            إعدادات VAPID للإشعارات الخارجية
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            المفاتيح المطلوبة لتشغيل الإشعارات الخارجية (Push Notifications). راجع ملف <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">VAPID_KEY_GUIDE.md</code> لمعرفة كيفية الحصول عليها.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              VAPID Public Key
            </label>
            <input
              type="text"
              value={settings.vapid_public_key}
              onChange={(e) => setSettings({ ...settings, vapid_public_key: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="BEl62iUYgUivxIkv69yViEuiBIa40HIWz..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              المفتاح العام - يستخدم في المتصفح (يمكن عرضه)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              VAPID Private Key
            </label>
            <input
              type="password"
              value={settings.vapid_private_key}
              onChange={(e) => setSettings({ ...settings, vapid_private_key: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="xK7YqP9R2S5T8U1V4W6X9Y0Z3..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              المفتاح الخاص - يستخدم في الخادم فقط (يُحفظ بشكل آمن - لا يشارك)
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
            >
              <Save className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              {saving ? 'جاري الحفظ...' : 'حفظ المفاتيح'}
            </Button>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="h-5 w-5" />
            تغيير كلمة المرور
          </h2>
        </div>
        <div className="p-6">
          <Button
            onClick={() => setPasswordDialogOpen(true)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Lock className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            تغيير كلمة المرور
          </Button>
        </div>
      </div>

      {/* Super Admins Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إدارة المدراء (Super Admins)
          </h2>
          <Button
            onClick={() => setAdminDialogOpen(true)}
            variant="outline"
            className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
          >
            <UserPlus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            إضافة مدير جديد
          </Button>
        </div>
        <div className="p-6">
          {superAdmins.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا يوجد مدراء مسجلون</p>
          ) : (
            <div className="space-y-2">
              {superAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{admin.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                  </div>
                  {admin.id !== user.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSuperAdmin(admin.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {admin.id === user.id && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">أنت</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Admin Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مدير جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                value={newAdminData.name}
                onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                placeholder="اسم المدير"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                البريد الإلكتروني *
              </label>
              <input
                type="email"
                value={newAdminData.email}
                onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور * (6 أحرف على الأقل)
              </label>
              <input
                type="password"
                value={newAdminData.password}
                onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                placeholder="كلمة المرور"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setAdminDialogOpen(false);
                  setNewAdminData({ name: '', email: '', password: '' });
                }} 
                variant="outline" 
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleCreateSuperAdmin} 
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                إضافة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPasswordDialogOpen(false)} variant="outline" className="flex-1">
                إلغاء
              </Button>
              <Button onClick={handleChangePassword} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tenant Sections Visibility Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Store className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">إدارة الأقسام الظاهرة للمتاجر</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر المتجر</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name || t.id}</option>
              ))}
            </select>
          </div>

          {['عام','صالات الإنترنت','المحروقات','المخزون','المقاول','المتجر','النظام'].map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableSections.filter((s) => s.category === cat).map((sec) => (
                  <div key={sec.code} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Switch checked={getVisibilityFor(sec.code)} onCheckedChange={() => toggleVisibility(sec.code)} />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{sec.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => moveSection(sec.code, 'up')}>↑</Button>
                      <Button size="sm" variant="outline" onClick={() => moveSection(sec.code, 'down')}>↓</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button onClick={saveSectionSettings} disabled={savingSections} className="bg-orange-600 text-white">
              {savingSections ? 'جاري الحفظ...' : 'حفظ الأقسام الظاهرة'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;

