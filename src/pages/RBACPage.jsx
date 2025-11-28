import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { ROLES } from '@/lib/constants';

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">إدارة الأدوار والصلاحيات (RBAC)</h1>
      {loading && <div className="text-gray-600">جاري التحميل...</div>}
      {message && <div className="mb-3 text-sm text-blue-600">{message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">المستخدمون</h2>
          <ul className="space-y-2">
            {(users || []).map(u => (
              <li key={u.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium">{u.name || u.email}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1"
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
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">الأدوار المتاحة</h2>
          <ul className="space-y-2">
            {(roles || []).map(r => (
              <li key={r.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium">{r.name}</div>
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