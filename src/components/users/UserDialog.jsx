
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InteractiveButton } from '@/components/ui/InteractiveButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROLES } from '@/lib/constants';

const UserDialog = ({ open, onOpenChange, user, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.ENTRY,
    can_edit_data: false,
    can_delete_data: false,
    can_create_users: false,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: user.password || '',
        role: user.role || ROLES.ENTRY,
        can_edit_data: user.can_edit_data || false,
        can_delete_data: user.can_delete_data || false,
        can_create_users: user.can_create_users || false,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: ROLES.ENTRY,
        can_edit_data: false,
        can_delete_data: false,
        can_create_users: false,
      });
    }
  }, [user, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? t('common.edit') : t('common.add')} {t('users.user')}</DialogTitle>
          <DialogDescription>
            {user ? 'قم بتعديل بيانات المستخدم' : 'قم بإدخال بيانات مستخدم جديد'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.name')}</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('common.name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.email')}</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('common.email')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('users.password')}</label>
            <input
              type="password"
              required={!user}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('users.password')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">{t('common.role')}</label>
            <select
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
                {Object.values(ROLES).map(role => (
                    <option key={role} value={role}>{t(`roles.${role.toLowerCase()}`) || role}</option>
                ))}
            </select>
          </div>

          {/* الصلاحيات - فقط للمحاسب */}
          {formData.role === 'Accountant' || formData.role === ROLES.ACCOUNTANT ? (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">صلاحيات المحاسب</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.can_edit_data || false}
                    onChange={(e) => setFormData({ ...formData, can_edit_data: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">يمكن التعديل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.can_delete_data || false}
                    onChange={(e) => setFormData({ ...formData, can_delete_data: e.target.checked })}
                    className="w-4 h-4 text-red-500 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">يمكن الحذف</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.can_create_users || false}
                    onChange={(e) => setFormData({ ...formData, can_create_users: e.target.checked })}
                    className="w-4 h-4 text-green-500 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">إدارة المستخدمين</span>
                </label>
              </div>
            </div>
          ) : null}

          <div className="flex gap-4 mt-6">
            <InteractiveButton
              variant="cancel"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </InteractiveButton>
            <InteractiveButton
              variant="save"
              type="submit"
            >
              {t('common.save')}
            </InteractiveButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
