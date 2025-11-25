import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, UserX, UserCheck, Edit, Shield, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ROLES } from '@/lib/constants';

const StoreUsersPage = () => {
  const { user, permissions } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    can_delete_data: false,
    can_edit_data: false,
    can_create_users: false
  });
  
  useEffect(() => {
    if (user?.tenant_id) fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const data = await neonService.getUsers(user.tenant_id);
      // تصفية المستخدمين - مدير المتجر يمكنه فقط رؤية موظفيه
      const filtered = data.filter(u => 
        u.tenant_id === user.tenant_id && 
        (user.isSuperAdmin || u.id !== user.id) // لا يمكن للمدير حذف نفسه
      );
      setUsers(filtered || []);
    } catch (error) {
      toast({ title: "خطأ في تحميل المستخدمين", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!permissions.canEdit) {
        toast({ title: "غير مصرح", variant: "destructive" });
        return;
    }
    
    // مدير المتجر لا يمكنه تعديل/حذف مدير متجر آخر
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.role === ROLES.STORE_OWNER && !user.isSuperAdmin) {
      toast({ title: "لا يمكنك تعديل مدير متجر آخر", variant: "destructive" });
      return;
    }
    
    try {
        await neonService.updateUser(userId, { is_active: !currentStatus }, user.tenant_id);
        toast({ title: "تم تحديث حالة المستخدم" });
        fetchUsers();
    } catch (e) {
        toast({ title: "فشل التحديث", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    try {
      await neonService.createUser({
        ...formData,
        tenant_id: user.tenant_id,
        created_by: user.id
      });
      toast({ title: "تم إنشاء المستخدم بنجاح" });
      setDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        can_delete_data: false,
        can_edit_data: false,
        can_create_users: false
      });
      fetchUsers();
    } catch (error) {
      toast({ title: "فشل إنشاء المستخدم", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (userId) => {
    // مدير المتجر لا يمكنه حذف مدير متجر آخر
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.role === ROLES.STORE_OWNER && !user.isSuperAdmin) {
      toast({ title: "لا يمكنك حذف مدير متجر آخر", variant: "destructive" });
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
      await neonService.deleteUser(userId, user.tenant_id);
      toast({ title: "تم حذف المستخدم" });
      fetchUsers();
    } catch (error) {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  if (!user?.isStoreOwner && !user?.isSuperAdmin) {
      return <div className="p-8 text-center">فقط مالك المتجر يمكنه إدارة المستخدمين</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet><title>إدارة الفريق - {t('common.systemName')}</title></Helmet>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الفريق</h1>
        </div>
        {permissions.canCreateUsers && (
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4" /> إضافة عضو جديد
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
         <table className="w-full text-right rtl:text-right">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th className="p-4 font-semibold text-sm">الاسم</th>
                    <th className="p-4 font-semibold text-sm">الدور</th>
                    <th className="p-4 font-semibold text-sm">الصلاحيات</th>
                    <th className="p-4 font-semibold text-sm">الحالة</th>
                    <th className="p-4 font-semibold text-sm">الإجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4">
                            <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="p-4">
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium">
                                {u.role === ROLES.STORE_OWNER ? 'مالك المتجر' :
                                 u.role === ROLES.ACCOUNTANT ? 'محاسب' :
                                 u.role === ROLES.WAREHOUSE_MANAGER ? 'مدير مستودع' : 'موظف'}
                            </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                            <div className="flex gap-2 flex-wrap">
                                {u.can_delete_data && <span className="text-red-500" title="يمكن الحذف">حذف</span>}
                                {u.can_edit_data && <span className="text-orange-500" title="يمكن التعديل">تعديل</span>}
                                {u.can_create_users && <span className="text-green-500" title="يمكن إدارة المستخدمين">مستخدمين</span>}
                            </div>
                        </td>
                        <td className="p-4">
                            {u.is_active ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm"><UserCheck className="h-3 w-3"/> نشط</span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-600 text-sm"><UserX className="h-3 w-3"/> غير نشط</span>
                            )}
                        </td>
                        <td className="p-4">
                            <div className="flex gap-2 justify-end">
                                {permissions.canEdit && (
                                  <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(u.id, u.is_active)}>
                                    {u.is_active ? 'تعطيل' : 'تفعيل'}
                                  </Button>
                                )}
                                {permissions.canDelete && u.role !== ROLES.STORE_OWNER && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)} className="text-red-500">
                                    حذف
                                  </Button>
                                )}
                            </div>
                        </td>
                    </tr>
                  ))
                )}
            </tbody>
         </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة عضو جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">الاسم</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الدور</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="employee">موظف</option>
                <option value="Accountant">محاسب</option>
                <option value="Warehouse Manager">مدير مستودع</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.can_edit_data}
                  onChange={(e) => setFormData({ ...formData, can_edit_data: e.target.checked })}
                />
                <span className="text-sm">يمكن التعديل</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.can_delete_data}
                  onChange={(e) => setFormData({ ...formData, can_delete_data: e.target.checked })}
                />
                <span className="text-sm">يمكن الحذف</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(false)} variant="outline" className="flex-1">
                إلغاء
              </Button>
              <Button onClick={handleCreateUser} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreUsersPage;
