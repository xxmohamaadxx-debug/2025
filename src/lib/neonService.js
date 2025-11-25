// خدمة Neon لاستبدال Supabase تماماً
import { getNeonClient, sql } from './neonClient';

// Helper to check if database connection is available
const checkConnection = () => {
  if (!sql) {
    throw new Error('الاتصال بقاعدة البيانات غير متاح. يرجى التحقق من إعدادات قاعدة البيانات.');
  }
};

// Helper functions - استخدام Web Crypto API للتشفير
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifyPassword = async (password, hash) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHash === hash;
};

// Helper to perform a query with tenant filtering
const getByTenant = async (table, tenantId, { select = '*', orderBy = { column: 'created_at', ascending: false } } = {}) => {
  if (!tenantId) {
    console.warn(`getByTenant: No tenantId provided for table ${table}`);
    return [];
  }
  
  try {
    let query = `SELECT ${select} FROM ${table} WHERE tenant_id = $1`;
    if (orderBy && orderBy.column) {
      query += ` ORDER BY ${orderBy.column} ${orderBy.ascending ? 'ASC' : 'DESC'}`;
    }
    const result = await sql(query, [tenantId]);
    return result || [];
  } catch (error) {
    console.error(`getByTenant error for ${table}:`, error);
    return [];
  }
};

// Helper to insert a record with tenant ID
const createRecord = async (table, data, tenantId) => {
  if (!tenantId) throw new Error('Tenant ID is required');
  
  const payload = { ...data, tenant_id: tenantId };
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await sql(query, values);
  return result[0];
};

// Helper to update a record ensuring it belongs to the tenant
const updateRecord = async (table, id, data, tenantId) => {
  if (!tenantId) throw new Error('Tenant ID is required');

  const columns = Object.keys(data);
  const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const values = [id, ...Object.values(data)];
  
  const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 AND tenant_id = $${values.length + 1} RETURNING *`;
  values.push(tenantId);
  
  const result = await sql(query, values);
  if (!result || result.length === 0) throw new Error('Record not found or access denied');
  return result[0];
};

// Helper to delete a record ensuring it belongs to the tenant
const deleteRecord = async (table, id, tenantId) => {
  if (!tenantId) throw new Error('Tenant ID is required');

  const query = `DELETE FROM ${table} WHERE id = $1 AND tenant_id = $2`;
  await sql(query, [id, tenantId]);
  return true;
};

const auditLog = async (tenantId, userId, action, details) => {
  try {
    await sql`INSERT INTO audit_logs (tenant_id, user_id, action, details) VALUES (${tenantId}, ${userId}, ${action}, ${JSON.stringify(details)})`;
  } catch (e) {
    console.error('Audit log failed', e);
  }
};

// --- Exported Service ---

export const neonService = {
  // Password utilities (exported for use in other components)
  hashPassword,
  verifyPassword,

  // Auth & User
  getUserByEmail: async (email) => {
    try {
      checkConnection();
      const result = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = true LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getUserByEmail error:', error);
      // Check if it's an authentication error
      const errorMsg = error.message || error.toString() || '';
      if (errorMsg.includes('password authentication failed') || errorMsg.includes('authentication failed')) {
        const helpMsg = 'فشل التحقق من قاعدة البيانات.\n\n' +
          'الحل:\n' +
          '1. اذهب إلى https://console.neon.tech/\n' +
          '2. اختر مشروعك > Dashboard > Connection Details\n' +
          '3. اختر "Connection pooling" وانسخ الرابط الكامل\n' +
          '4. ضع الرابط في ملف .env كالتالي:\n' +
          '   VITE_NEON_DATABASE_URL=postgresql://...\n' +
          '5. أعد تشغيل الخادم\n\n' +
          'راجع ملف NEON_CONNECTION_SETUP.md للمزيد من التفاصيل';
        throw new Error(helpMsg);
      }
      if (errorMsg.includes('Connection') || errorMsg.includes('اتصال') || errorMsg.includes('connect')) {
        throw new Error('لا يمكن الاتصال بقاعدة البيانات. يرجى التحقق من:\n1. ملف .env موجود ويحتوي على VITE_NEON_DATABASE_URL\n2. رابط الاتصال صحيح ومحدث من Neon Console\n3. الإنترنت متصل');
      }
      return null;
    }
  },

  getUserProfile: async (userId) => {
    if (!userId) {
      console.warn('getUserProfile: No userId provided');
      return null;
    }
    
    try {
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
      const user = userResult[0];
      
      if (!user) return null;

      let tenant = null;
      if (user.tenant_id) {
        const tenantResult = await sql`SELECT * FROM tenants WHERE id = ${user.tenant_id} LIMIT 1`;
        tenant = tenantResult[0] || null;
      }

      return { ...user, tenant };
    } catch (error) {
      console.error('getUserProfile error:', error);
      return null;
    }
  },

  createUser: async (userData) => {
    try {
      const passwordHash = await hashPassword(userData.password);
      const result = await sql`
        INSERT INTO users (email, password_hash, name, tenant_id, role, can_delete_data, can_edit_data, can_create_users, created_by)
        VALUES (${userData.email}, ${passwordHash}, ${userData.name}, ${userData.tenant_id || null}, ${userData.role || 'employee'}, 
                ${userData.can_delete_data || false}, ${userData.can_edit_data || false}, ${userData.can_create_users || false}, ${userData.created_by || null})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createUser error:', error);
      throw error;
    }
  },

  verifyPassword: async (email, password) => {
    try {
      checkConnection();
      const user = await neonService.getUserByEmail(email);
      if (!user) return null;
      
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) return null;
      
      // تحديث last_login
      await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
      
      return user;
    } catch (error) {
      console.error('verifyPassword error:', error);
      // Re-throw connection/authentication errors with better messages
      const errorMsg = error.message || error.toString() || '';
      if (errorMsg.includes('password authentication failed') || 
          errorMsg.includes('authentication failed') ||
          errorMsg.includes('الاتصال') || 
          errorMsg.includes('Connection') || 
          errorMsg.includes('connect')) {
        throw error; // Re-throw with improved message from getUserByEmail
      }
      return null;
    }
  },

  createTenant: async (tenantName, ownerUserId) => {
    try {
      const result = await sql`
        INSERT INTO tenants (name, owner_user_id)
        VALUES (${tenantName}, ${ownerUserId})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createTenant error:', error);
      throw error;
    }
  },
  
  createUserProfile: async (userProfile) => {
    try {
      const passwordHash = userProfile.password ? await hashPassword(userProfile.password) : null;
      const columns = Object.keys(userProfile).filter(k => k !== 'password');
      const values = Object.values(userProfile).filter((_, i) => Object.keys(userProfile)[i] !== 'password');
      
      if (passwordHash) {
        columns.push('password_hash');
        values.push(passwordHash);
      }
      
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await sql(query, values);
      return result[0];
    } catch (error) {
      console.error('createUserProfile error:', error);
      throw error;
    }
  },

  getUsers: (tenantId) => getByTenant('users', tenantId),
  updateUser: (id, data, tenantId) => updateRecord('users', id, data, tenantId),
  updateUserAdmin: async (id, data) => {
    // تحديث المستخدم بدون tenant_id (للمدير فقط)
    try {
      const columns = Object.keys(data);
      const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const values = [id, ...Object.values(data)];
      const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
      const result = await sql(query, values);
      if (!result || result.length === 0) throw new Error('User not found');
      return result[0];
    } catch (error) {
      console.error('updateUserAdmin error:', error);
      throw error;
    }
  },
  deleteUser: (id, tenantId) => deleteRecord('users', id, tenantId),

  // System Settings (Admin only)
  getSystemSettings: async () => {
    try {
      const result = await sql`SELECT * FROM system_settings ORDER BY key`;
      const settings = {};
      result.forEach(row => {
        settings[row.key] = row.value;
      });
      return settings;
    } catch (error) {
      console.error('getSystemSettings error:', error);
      return {};
    }
  },

  updateSystemSetting: async (key, value, userId) => {
    try {
      await sql`
        INSERT INTO system_settings (key, value, updated_by)
        VALUES (${key}, ${value}, ${userId})
        ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_by = ${userId}, updated_at = NOW()
      `;
      return true;
    } catch (error) {
      console.error('updateSystemSetting error:', error);
      throw error;
    }
  },

  // Partners
  getPartners: (tenantId) => getByTenant('partners', tenantId),
  createPartner: (data, tenantId) => createRecord('partners', data, tenantId),
  updatePartner: (id, data, tenantId) => updateRecord('partners', id, data, tenantId),
  deletePartner: (id, tenantId) => deleteRecord('partners', id, tenantId),

  // Invoices
  getInvoicesIn: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT i.*, p.name as partner_name, p.type as partner_type
        FROM invoices_in i
        LEFT JOIN partners p ON i.partner_id = p.id
        WHERE i.tenant_id = ${tenantId}
        ORDER BY i.date DESC, i.created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getInvoicesIn error:', error);
      return [];
    }
  },
  createInvoiceIn: (data, tenantId) => createRecord('invoices_in', data, tenantId),
  updateInvoiceIn: (id, data, tenantId) => updateRecord('invoices_in', id, data, tenantId),
  deleteInvoiceIn: (id, tenantId) => deleteRecord('invoices_in', id, tenantId),

  getInvoicesOut: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT o.*, p.name as partner_name, p.type as partner_type
        FROM invoices_out o
        LEFT JOIN partners p ON o.partner_id = p.id
        WHERE o.tenant_id = ${tenantId}
        ORDER BY o.date DESC, o.created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getInvoicesOut error:', error);
      return [];
    }
  },
  createInvoiceOut: (data, tenantId) => createRecord('invoices_out', data, tenantId),
  updateInvoiceOut: (id, data, tenantId) => updateRecord('invoices_out', id, data, tenantId),
  deleteInvoiceOut: (id, tenantId) => deleteRecord('invoices_out', id, tenantId),

  // Inventory
  getInventory: async (tenantId) => {
    if (!tenantId) return [];
    try {
      return await getByTenant('inventory_items', tenantId);
    } catch (error) {
      console.error('getInventory error:', error);
      return [];
    }
  },
  createInventory: (data, tenantId) => createRecord('inventory_items', data, tenantId),
  updateInventory: (id, data, tenantId) => updateRecord('inventory_items', id, data, tenantId),
  deleteInventory: (id, tenantId) => deleteRecord('inventory_items', id, tenantId),

  // Employees
  getEmployees: async (tenantId) => {
    if (!tenantId) return [];
    try {
      return await getByTenant('employees', tenantId);
    } catch (error) {
      console.error('getEmployees error:', error);
      return [];
    }
  },
  createEmployee: (data, tenantId) => createRecord('employees', data, tenantId),
  updateEmployee: (id, data, tenantId) => updateRecord('employees', id, data, tenantId),
  deleteEmployee: (id, tenantId) => deleteRecord('employees', id, tenantId),

  // Payroll
  getPayroll: (tenantId) => getByTenant('payroll', tenantId),
  createPayroll: (data, tenantId) => createRecord('payroll', data, tenantId),
  deletePayroll: (id, tenantId) => deleteRecord('payroll', id, tenantId),

  // Tenants (Admin only)
  getAllTenants: async () => {
    try {
      const result = await sql`
        SELECT t.*, u.name as owner_name, u.email as owner_email
        FROM tenants t
        LEFT JOIN users u ON t.owner_user_id = u.id
        ORDER BY t.created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getAllTenants error:', error);
      return [];
    }
  },

  updateTenant: async (tenantId, data) => {
    try {
      const columns = Object.keys(data);
      const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const values = [tenantId, ...Object.values(data)];
      const query = `UPDATE tenants SET ${setClause} WHERE id = $1 RETURNING *`;
      const result = await sql(query, values);
      return result[0];
    } catch (error) {
      console.error('updateTenant error:', error);
      throw error;
    }
  },

  deleteTenant: async (tenantId) => {
    try {
      // حذف جميع البيانات المرتبطة بالمتجر بالترتيب الصحيح
      // الحذف التلقائي بسبب ON DELETE CASCADE في قاعدة البيانات
      // لكن نفضل الحذف اليدوي لضمان الحذف الكامل
      
      // 1. حذف البيانات المرتبطة
      await sql`DELETE FROM invoices_in WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM invoices_out WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM inventory_items WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM employees WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM partners WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM payroll WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM audit_logs WHERE tenant_id = ${tenantId}`;
      
      // 2. حذف جميع المستخدمين المرتبطين بالمتجر
      await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;
      
      // 3. حذف المتجر نفسه
      await sql`DELETE FROM tenants WHERE id = ${tenantId}`;
      
      return true;
    } catch (error) {
      console.error('deleteTenant error:', error);
      throw error;
    }
  },

  // Super Admin Management
  getAllSuperAdmins: async () => {
    try {
      // البحث عن Super Admins (بما في ذلك admin@ibrahim.com)
      const result = await sql`
        SELECT id, email, name, role, is_active, created_at
        FROM users
        WHERE role = 'SUPER_ADMIN' OR email = 'admin@ibrahim.com'
        ORDER BY created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getAllSuperAdmins error:', error);
      return [];
    }
  },

  createSuperAdmin: async (adminData) => {
    try {
      const passwordHash = await hashPassword(adminData.password);
      const result = await sql`
        INSERT INTO users (
          email, password_hash, name, role,
          can_delete_data, can_edit_data, can_create_users, is_active
        )
        VALUES (
          ${adminData.email}, ${passwordHash}, ${adminData.name}, 'SUPER_ADMIN',
          true, true, true, true
        )
        RETURNING id, email, name, role, is_active, created_at
      `;
      return result[0];
    } catch (error) {
      console.error('createSuperAdmin error:', error);
      throw error;
    }
  },

  deleteSuperAdmin: async (adminId) => {
    try {
      // التأكد من عدم حذف آخر Super Admin
      const admins = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE (role = 'SUPER_ADMIN' OR email = 'admin@ibrahim.com') AND is_active = true
      `;
      if (parseInt(admins[0]?.count || 0) <= 1) {
        throw new Error('لا يمكن حذف آخر مدير في النظام');
      }
      
      await sql`
        DELETE FROM users 
        WHERE id = ${adminId} AND (role = 'SUPER_ADMIN' OR email = 'admin@ibrahim.com')
      `;
      return true;
    } catch (error) {
      console.error('deleteSuperAdmin error:', error);
      throw error;
    }
  },

  updateSuperAdminPassword: async (adminId, newPassword) => {
    try {
      const passwordHash = await hashPassword(newPassword);
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${adminId} AND role = 'SUPER_ADMIN'
      `;
      return true;
    } catch (error) {
      console.error('updateSuperAdminPassword error:', error);
      throw error;
    }
  },

  // Logs
  getAuditLogs: (tenantId) => getByTenant('audit_logs', tenantId),
  log: auditLog,
};
