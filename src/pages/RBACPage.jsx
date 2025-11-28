import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Users, Key } from 'lucide-react';

const RBACPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    setMessage('');
    try {
      await neonService.ensureRBACSchema(user.tenant_id);
      const [u, r] = await Promise.all([
        neonService.getByTenant('users', user.tenant_id),
        neonService.getRoles(user.tenant_id)
      ]);
      setUsers(u || []);
      setRoles(r || []);
    } catch (error) {
      console.error('RBAC load error:', error);
      setMessage('حدث خطأ أثناء تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.tenant_id]);

  const handleAssignRole = async (targetUserId, roleId) => {
    if (!user?.tenant_id) return;
    setLoading(true);
    setMessage('');
    try {
      await neonService.assignRoleToUser(targetUserId, roleId, user.tenant_id);
      await neonService.auditLog(user.tenant_id, user.id, 'ASSIGN_ROLE', { targetUserId, roleId });
      setMessage('تم تعيين الدور بنجاح');
    } catch (error) {
      console.error('Assign role error:', error);
      setMessage('فشل تعيين الدور');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeRole = async (targetUserId, roleId) => {
    setLoading(true);
    setMessage('');
    try {
      await neonService.revokeRoleFromUser(targetUserId, roleId);
      await neonService.auditLog(user.tenant_id, user.id, 'REVOKE_ROLE', { targetUserId, roleId });
      setMessage('تم إلغاء الدور بنجاح');
    } catch (error) {
      console.error('Revoke role error:', error);
      setMessage('فشل إلغاء الدور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">إدارة الأدوار والصلاحيات (RBAC)</h1>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحميل...
        </div>
      )}
      {message && <div className="mb-3 text-sm text-blue-600">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold">المستخدمون</h2>
          </div>
          <ul className="space-y-2">
            {(users || []).map(u => (
              <li key={u.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{u.name || u.email}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-700 dark:text-gray-100"
                    onChange={(e) => handleAssignRole(u.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>اختر دورًا</option>
                    {(roles || []).map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold">الأدوار المتاحة</h2>
          </div>
          <ul className="space-y-2">
            {(roles || []).map(r => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.code}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RBACPage;
