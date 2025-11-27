import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, Key, Shield, Clock, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { neonService } from '@/lib/neonService';

const ProfileDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [canChangePassword, setCanChangePassword] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    checkPasswordChangePermissions();
  }, [user]);

  const checkPasswordChangePermissions = async () => {
    if (!user) return;
    
    try {
      // Super Admin can always change password
      if (user.isSuperAdmin) {
        setCanChangePassword(true);
        setRequiresApproval(false);
        return;
      }

      // Check user creation date
      const userData = await neonService.getUserById(user.id);
      if (!userData || !userData.created_at) {
        setCanChangePassword(false);
        setRequiresApproval(true);
        return;
      }

      const createdDate = new Date(userData.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

      // Users can change password once in first 10 days
      const passwordChanged = userData.password_changed_at !== null;
      const withinTenDays = daysSinceCreation <= 10;

      if (!passwordChanged && withinTenDays) {
        setCanChangePassword(true);
        setRequiresApproval(false);
      } else if (passwordChanged || !withinTenDays) {
        setCanChangePassword(false);
        setRequiresApproval(true);
      }
    } catch (error) {
      console.error('Error checking password permissions:', error);
      setCanChangePassword(false);
      setRequiresApproval(true);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Verify current password first
      const loginResult = await neonService.login(user.email, passwordForm.currentPassword);
      if (!loginResult) {
        toast({
          title: 'خطأ',
          description: 'كلمة المرور الحالية غير صحيحة',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // If requires approval, send request to admin
      if (requiresApproval && !user.isSuperAdmin) {
        await neonService.requestPasswordChange(user.id, passwordForm.newPassword);
        toast({
          title: 'تم إرسال الطلب',
          description: 'سيتم مراجعة طلب تغيير كلمة المرور من قبل المدير'
        });
        setChangePasswordOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        // Direct password change
        await neonService.changePassword(user.id, passwordForm.currentPassword, passwordForm.newPassword);
        toast({
          title: 'تم التغيير بنجاح',
          description: 'تم تغيير كلمة المرور بنجاح'
        });
        setChangePasswordOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تغيير كلمة المرور',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 pl-4 rtl:pr-4 rtl:pl-0 border-l rtl:border-r rtl:border-l-0 border-gray-200 dark:border-gray-700"
        >
          <div className="text-right rtl:text-left hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500">{user?.role || 'Admin'}</div>
          </div>
          <motion.div 
            className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <User className="h-5 w-5 text-white" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Click outside to close */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              {/* Close button inside dropdown */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 rtl:left-0 ltr:right-0 z-50 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 relative">
                  {/* Close button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-2 left-2 rtl:right-2 rtl:left-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label="إغلاق"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white pr-6">{user?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                  {user?.isSuperAdmin && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <Shield className="h-3 w-3" />
                      <span>مدير النظام</span>
                    </div>
                  )}
                </div>

                <div className="py-2">
                  <motion.button
                    whileHover={{ x: 5, backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left rtl:text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    <span>الإعدادات</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 5, backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                    onClick={() => {
                      setIsOpen(false);
                      setChangePasswordOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left rtl:text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Key className="h-4 w-4" />
                    <span>تغيير كلمة المرور</span>
                    {requiresApproval && (
                      <span className="text-xs text-orange-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        يحتاج موافقة
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 5, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left rtl:text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              {requiresApproval ? (
                <span className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  هذا الطلب يحتاج موافقة المدير
                </span>
              ) : (
                'أدخل كلمة المرور الحالية والجديدة'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور الحالية</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
                placeholder="كلمة المرور الحالية"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
                placeholder="تأكيد كلمة المرور"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setChangePasswordOpen(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {loading ? 'جاري الحفظ...' : requiresApproval ? 'إرسال الطلب' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileDropdown;

