import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, Lock, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Logo from '@/components/Logo';

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

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadSettings();
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
        <div className="hidden md:block">
          <Logo size="md" showText={false} />
        </div>
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

