import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, Lock, Save, UserPlus, Trash2, Shield } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminSettingsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    support_phone: '',
    support_whatsapp: '',
    support_email: ''
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

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadSettings();
      loadSuperAdmins();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const data = await neonService.getSystemSettings();
      setSettings({
        support_phone: data.support_phone || '',
        support_whatsapp: data.support_whatsapp || '',
        support_email: data.support_email || ''
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
        neonService.updateSystemSetting('support_email', settings.support_email, user.id)
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
    </div>
  );
};

export default AdminSettingsPage;

