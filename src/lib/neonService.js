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

  // =========================
  // RBAC Schema & Management
  // =========================
  ensureRBACSchema: async (tenantId) => {
    try {
      // Create roles table
      await sql`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          is_system BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(tenant_id, code)
        )
      `;
      // Create permissions table (global)
      await sql`
        CREATE TABLE IF NOT EXISTS permissions (
          code TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT
        )
      `;
      // Create role_permissions mapping
      await sql`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
          permission_code TEXT REFERENCES permissions(code) ON DELETE CASCADE,
          PRIMARY KEY (role_id, permission_code)
        )
      `;
      // Create user_roles mapping
      await sql`
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        )
      `;

      // Seed permissions if empty
      const existingPerms = await sql`SELECT COUNT(*)::INT as count FROM permissions`;
      if ((existingPerms[0]?.count || 0) === 0) {
        await sql`
          INSERT INTO permissions (code, name, description) VALUES
            ('CAN_EDIT', 'Edit Data', 'Ability to edit records'),
            ('CAN_DELETE', 'Delete Data', 'Ability to delete records'),
            ('CAN_CREATE_USERS', 'Create Users', 'Ability to create and manage users'),
            ('VIEW_REPORTS', 'View Reports', 'Access to reports pages'),
            ('MANAGE_INVENTORY', 'Manage Inventory', 'Access to inventory operations'),
            ('MANAGE_PAYROLL', 'Manage Payroll', 'Access to payroll operations')
        `;
      }

      // Ensure default roles for tenant
      const defaultRoles = [
        { code: 'SUPER_ADMIN', name: 'Super Admin', is_system: true },
        { code: 'STORE_OWNER', name: 'Store Owner', is_system: true },
        { code: 'ACCOUNTANT', name: 'Accountant', is_system: true },
        { code: 'WAREHOUSE_MANAGER', name: 'Warehouse Manager', is_system: true },
        { code: 'EMPLOYEE', name: 'Employee', is_system: true }
      ];

      for (const r of defaultRoles) {
        const roleExists = await sql`
          SELECT id FROM roles WHERE tenant_id = ${tenantId} AND code = ${r.code} LIMIT 1
        `;
        if (!roleExists || roleExists.length === 0) {
          await sql`
            INSERT INTO roles (tenant_id, code, name, is_system)
            VALUES (${tenantId}, ${r.code}, ${r.name}, ${r.is_system})
          `;
        }
      }

      // Grant default permissions for roles
      const roleRows = await sql`SELECT id, code FROM roles WHERE tenant_id = ${tenantId}`;
      const roleIdByCode = Object.fromEntries((roleRows || []).map(r => [r.code, r.id]));
      const grants = [
        { role: 'SUPER_ADMIN', perms: ['CAN_EDIT','CAN_DELETE','CAN_CREATE_USERS','VIEW_REPORTS','MANAGE_INVENTORY','MANAGE_PAYROLL'] },
        { role: 'STORE_OWNER', perms: ['CAN_EDIT','CAN_DELETE','CAN_CREATE_USERS','VIEW_REPORTS','MANAGE_INVENTORY','MANAGE_PAYROLL'] },
        { role: 'ACCOUNTANT', perms: ['CAN_EDIT','VIEW_REPORTS','MANAGE_PAYROLL'] },
        { role: 'WAREHOUSE_MANAGER', perms: ['CAN_EDIT','VIEW_REPORTS','MANAGE_INVENTORY'] },
        { role: 'EMPLOYEE', perms: ['VIEW_REPORTS'] }
      ];

      for (const g of grants) {
        const roleId = roleIdByCode[g.role];
        if (!roleId) continue;
        for (const p of g.perms) {
          await sql`
            INSERT INTO role_permissions (role_id, permission_code)
            VALUES (${roleId}, ${p})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    } catch (error) {
      console.error('ensureRBACSchema error:', error);
      throw error;
    }
  },

  getRoles: async (tenantId) => {
    try {
      return await sql`SELECT * FROM roles WHERE tenant_id = ${tenantId} ORDER BY name`;
    } catch (error) {
      console.error('getRoles error:', error);
      return [];
    }
  },

  getPermissions: async () => {
    try {
      return await sql`SELECT * FROM permissions ORDER BY code`;
    } catch (error) {
      console.error('getPermissions error:', error);
      return [];
    }
  },

  assignRoleToUser: async (userId, roleId, tenantId) => {
    try {
      await sql`
        INSERT INTO user_roles (user_id, role_id, tenant_id)
        VALUES (${userId}, ${roleId}, ${tenantId})
        ON CONFLICT DO NOTHING
      `;
      return true;
    } catch (error) {
      console.error('assignRoleToUser error:', error);
      throw error;
    }
  },

  revokeRoleFromUser: async (userId, roleId) => {
    try {
      await sql`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${roleId}`;
      return true;
    } catch (error) {
      console.error('revokeRoleFromUser error:', error);
      throw error;
    }
  },

  getUserPermissions: async (userId, tenantId) => {
    try {
      const perms = await sql`
        SELECT DISTINCT rp.permission_code as code
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON rp.role_id = r.id
        WHERE ur.user_id = ${userId} AND ur.tenant_id = ${tenantId}
      `;
      const codes = (perms || []).map(p => p.code);
      return {
        canEdit: codes.includes('CAN_EDIT'),
        canDelete: codes.includes('CAN_DELETE'),
        canCreateUsers: codes.includes('CAN_CREATE_USERS'),
        canAccessData: true,
        canModifyData: codes.includes('CAN_EDIT') || codes.includes('CAN_DELETE'),
      };
    } catch (error) {
      console.error('getUserPermissions error:', error);
      return { canEdit: false, canDelete: false, canCreateUsers: false, canAccessData: true, canModifyData: false };
    }
  },

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
  
  getUserById: async (userId) => {
    try {
      const result = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getUserById error:', error);
      return null;
    }
  },

  login: async (email, password) => {
    return await neonService.verifyPassword(email, password);
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const user = await neonService.getUserById(userId);
      if (!user) throw new Error('المستخدم غير موجود');

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) throw new Error('كلمة المرور الحالية غير صحيحة');

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password and set password_changed_at
      await sql`
        UPDATE users 
        SET password_hash = ${newPasswordHash}, 
            password_changed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${userId}
      `;

      return true;
    } catch (error) {
      console.error('changePassword error:', error);
      throw error;
    }
  },

  requestPasswordChange: async (userId, newPassword) => {
    try {
      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Create password change request (assuming we have a table for this)
      // If not, we'll create a notification or log entry
      await sql`
        INSERT INTO password_change_requests (user_id, new_password_hash, status, requested_at)
        VALUES (${userId}, ${newPasswordHash}, 'pending', NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET new_password_hash = ${newPasswordHash}, requested_at = NOW(), status = 'pending'
      `;

      // Log the request
      await auditLog(null, userId, 'PASSWORD_CHANGE_REQUESTED', { userId });

      return true;
    } catch (error) {
      // If table doesn't exist, try alternative approach
      console.warn('password_change_requests table may not exist, using alternative:', error);
      
      // Alternative: Store in audit_logs or system_settings
      await auditLog(null, userId, 'PASSWORD_CHANGE_REQUESTED', { 
        userId, 
        hashedPassword: newPasswordHash.substring(0, 20) + '...' // Don't log full hash
      });

      return true;
    }
  },

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

  // ============================================
  // Inventory Categories & Management
  // ============================================
  getInventoryCategories: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`SELECT * FROM inventory_categories WHERE tenant_id = ${tenantId} ORDER BY display_order ASC`;
      return result || [];
    } catch (error) {
      console.error('getInventoryCategories error:', error);
      return [];
    }
  },

  createInventoryCategory: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO inventory_categories (tenant_id, name, description, color, display_order, is_active)
        VALUES (${tenantId}, ${data.name}, ${data.description || null}, ${data.color || '#FF8C00'}, ${data.display_order || 0}, ${data.is_active !== undefined ? data.is_active : true})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createInventoryCategory error:', error);
      throw error;
    }
  },

  // ============================================
  // Low Stock Thresholds (Per Store)
  // ============================================
  getLowStockThreshold: async (tenantId, productId) => {
    try {
      const result = await sql`SELECT * FROM low_stock_thresholds WHERE tenant_id = ${tenantId} AND product_id = ${productId}`;
      return result[0] || null;
    } catch (error) {
      console.error('getLowStockThreshold error:', error);
      return null;
    }
  },

  setLowStockThreshold: async (tenantId, productId, data) => {
    try {
      // Accept either a number (minimum quantity) or an object with detailed fields
      const thresholdQty = typeof data === 'number' ? data : (data && (data.threshold_quantity ?? data.minimum_quantity)) || 5;
      const alertEnabled = typeof data === 'object' ? (data.alert_enabled !== undefined ? data.alert_enabled : true) : true;
      const alertMethod = typeof data === 'object' ? (data.alert_method || 'notification') : 'notification';
      const notes = typeof data === 'object' ? (data.notes || null) : null;

      const result = await sql`
        INSERT INTO low_stock_thresholds (tenant_id, product_id, threshold_quantity, alert_enabled, alert_method, notes)
        VALUES (${tenantId}, ${productId}, ${thresholdQty}, ${alertEnabled}, ${alertMethod}, ${notes})
        ON CONFLICT (tenant_id, product_id) DO UPDATE SET 
          threshold_quantity = ${thresholdQty}, 
          alert_enabled = ${alertEnabled},
          alert_method = ${alertMethod},
          notes = ${notes},
          updated_at = NOW()
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('setLowStockThreshold error:', error);
      throw error;
    }
  },

  // Return all low-stock thresholds for a tenant with product info and current quantities
  getAllLowStockThresholds: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT
          l.id,
          l.tenant_id,
          l.product_id,
          l.threshold_quantity AS minimum_quantity,
          l.alert_enabled,
          l.alert_method,
          l.last_alert_sent,
          l.notes,
          l.created_at,
          l.updated_at,
          p.name AS product_name,
          p.sku AS product_code,
          COALESCE(SUM(inv.quantity), 0) AS current_quantity
        FROM low_stock_thresholds l
        LEFT JOIN products p ON l.product_id = p.id
        LEFT JOIN inventory_items inv ON inv.product_id = p.id AND inv.tenant_id = l.tenant_id
        WHERE l.tenant_id = ${tenantId}
        GROUP BY l.id, p.id, p.name, p.sku, l.threshold_quantity, l.alert_enabled, l.alert_method, l.last_alert_sent, l.notes, l.created_at, l.updated_at, l.tenant_id, l.product_id
        ORDER BY p.name ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getAllLowStockThresholds error:', error);
      return [];
    }
  },

  // ============================================
  // Inventory Changes History
  // ============================================
  getInventoryChanges: async (tenantId, productId = null, limit = 100) => {
    try {
      let query;
      if (productId) {
        query = sql`SELECT * FROM inventory_changes WHERE tenant_id = ${tenantId} AND product_id = ${productId} ORDER BY recorded_at DESC LIMIT ${limit}`;
      } else {
        query = sql`SELECT * FROM inventory_changes WHERE tenant_id = ${tenantId} ORDER BY recorded_at DESC LIMIT ${limit}`;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getInventoryChanges error:', error);
      return [];
    }
  },

  // ============================================
  // Fuel Counters (6 Configurable Per Store)
  // ============================================
  getFuelCounters: async (tenantId) => {
    try {
      const result = await sql`SELECT * FROM fuel_counters WHERE tenant_id = ${tenantId} ORDER BY counter_number ASC`;
      return result || [];
    } catch (error) {
      console.error('getFuelCounters error:', error);
      return [];
    }
  },

  initializeFuelCounters: async (tenantId) => {
    try {
      const counters = [];
      for (let i = 1; i <= 6; i++) {
        const result = await sql`
          INSERT INTO fuel_counters (tenant_id, counter_number, counter_name, liters_sold, price_per_liter, is_active)
          VALUES (${tenantId}, ${i}, ${'عداد ' + i}, 0, 0, TRUE)
          ON CONFLICT (tenant_id, counter_number) DO NOTHING
          RETURNING *
        `;
        if (result.length > 0) counters.push(result[0]);
      }
      return counters;
    } catch (error) {
      console.error('initializeFuelCounters error:', error);
      throw error;
    }
  },

  updateFuelCounterName: async (fuelCounterId, name) => {
    try {
      const result = await sql`
        UPDATE fuel_counters SET counter_name = ${name}, last_updated_at = NOW() WHERE id = ${fuelCounterId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateFuelCounterName error:', error);
      throw error;
    }
  },

  updateFuelCounterPrice: async (fuelCounterId, pricePerLiter) => {
    try {
      const result = await sql`
        UPDATE fuel_counters SET price_per_liter = ${pricePerLiter}, last_updated_at = NOW() WHERE id = ${fuelCounterId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateFuelCounterPrice error:', error);
      throw error;
    }
  },

  getFuelCounterMovements: async (fuelCounterId, limit = 50) => {
    try {
      const result = await sql`SELECT * FROM fuel_counter_movements WHERE fuel_counter_id = ${fuelCounterId} ORDER BY recorded_at DESC LIMIT ${limit}`;
      return result || [];
    } catch (error) {
      console.error('getFuelCounterMovements error:', error);
      return [];
    }
  },

  addFuelCounterMovement: async (tenantId, fuelCounterId, data) => {
    try {
      const result = await sql`
        INSERT INTO fuel_counter_movements (tenant_id, fuel_counter_id, movement_type, liters, price_per_liter, total_amount, currency, reference_id, reference_type, notes, recorded_by, recorded_at)
        VALUES (${tenantId}, ${fuelCounterId}, ${data.movement_type}, ${data.liters}, ${data.price_per_liter || null}, ${data.total_amount || null}, ${data.currency || 'SYP'}, ${data.reference_id || null}, ${data.reference_type || null}, ${data.notes || null}, ${data.recorded_by || null}, NOW())
        RETURNING *
      `;
      await sql`UPDATE fuel_counters SET liters_sold = liters_sold + ${data.liters} WHERE id = ${fuelCounterId}`;
      return result[0];
    } catch (error) {
      console.error('addFuelCounterMovement error:', error);
      throw error;
    }
  },

  getFuelCounterSummary: async (tenantId) => {
    try {
      const result = await sql`SELECT * FROM fuel_counters WHERE tenant_id = ${tenantId}`;
      const summary = {};
      result.forEach(counter => {
        summary[counter.counter_number] = {
          id: counter.id,
          name: counter.counter_name,
          liters: counter.liters_sold,
          price: counter.price_per_liter,
          total: counter.liters_sold * counter.price_per_liter
        };
      });
      return summary;
    } catch (error) {
      console.error('getFuelCounterSummary error:', error);
      return {};
    }
  },

  getInventoryStats: async (tenantId) => {
    try {
      const result = await sql`SELECT * FROM get_inventory_stats(${tenantId})`;
      return result[0] || { total_items: 0, low_stock_count: 0, total_value: 0, categories_count: 0 };
    } catch (error) {
      console.error('getInventoryStats error:', error);
      return { total_items: 0, low_stock_count: 0, total_value: 0, categories_count: 0 };
    }
  },

  // Accounting - debts/payments/employees/deductions
  getDebts: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`SELECT * FROM debts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
      return result || [];
    } catch (error) {
      console.error('getDebts error:', error);
      return [];
    }
  },

  createDebt: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO debts (tenant_id, partner_id, related_invoice_id, description, amount, currency, due_date, status, metadata)
        VALUES (${tenantId}, ${data.partner_id || null}, ${data.related_invoice_id || null}, ${data.description || null}, ${data.amount}, ${data.currency || 'SYP'}, ${data.due_date || null}, ${data.status || 'open'}, ${JSON.stringify(data.metadata || {})}::jsonb)
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createDebt error:', error);
      throw error;
    }
  },

  getPayments: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`SELECT * FROM payments WHERE tenant_id = ${tenantId} ORDER BY recorded_at DESC`;
      return result || [];
    } catch (error) {
      console.error('getPayments error:', error);
      return [];
    }
  },

  createPayment: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO payments (tenant_id, debt_id, partner_id, amount, currency, payment_method, reference, recorded_by, recorded_at, metadata)
        VALUES (${tenantId}, ${data.debt_id || null}, ${data.partner_id || null}, ${data.amount}, ${data.currency || 'SYP'}, ${data.payment_method || 'cash'}, ${data.reference || null}, ${data.recorded_by || null}, ${data.recorded_at || new Date().toISOString()}, ${JSON.stringify(data.metadata || {})}::jsonb)
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createPayment error:', error);
      throw error;
    }
  },

  getEmployees: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`SELECT * FROM employees WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
      return result || [];
    } catch (error) {
      console.error('getEmployees error:', error);
      return [];
    }
  },

  createEmployee: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO employees (tenant_id, user_id, name, national_id, position, salary_amount, salary_currency, pay_frequency, is_active, meta)
        VALUES (${tenantId}, ${data.user_id || null}, ${data.name}, ${data.national_id || null}, ${data.position || null}, ${data.salary_amount || 0}, ${data.salary_currency || 'SYP'}, ${data.pay_frequency || 'monthly'}, ${data.is_active !== undefined ? data.is_active : true}, ${JSON.stringify(data.meta || {})}::jsonb)
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createEmployee error:', error);
      throw error;
    }
  },

  createDeduction: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO deductions (employee_id, tenant_id, deduction_type, amount, currency, is_recurring, recurring_rule, metadata)
        VALUES (${data.employee_id}, ${tenantId}, ${data.deduction_type}, ${data.amount}, ${data.currency || 'SYP'}, ${data.is_recurring || false}, ${data.recurring_rule || null}, ${JSON.stringify(data.metadata || {})}::jsonb)
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createDeduction error:', error);
      throw error;
    }
  },

  processPayrollForEmployee: async (employeeId, periodDate, processedBy) => {
    try {
      const result = await sql`SELECT process_payroll_for_employee(${employeeId}::uuid, ${periodDate}::date, ${processedBy}::uuid) as result`;
      return result && result[0] ? result[0].result : null;
    } catch (error) {
      console.error('processPayrollForEmployee error:', error);
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
  createInvoiceIn: async (data, tenantId, items = []) => {
    try {
      // تحويل items إلى JSONB إذا كان موجوداً في data
      const invoiceData = { ...data };
      if (items && items.length > 0) {
        invoiceData.items = JSON.stringify(items);
      }
      
      const invoice = await createRecord('invoices_in', invoiceData, tenantId);
      // حفظ عناصر الفاتورة في جدول invoice_items أيضاً
      if (items && items.length > 0 && invoice?.id) {
        await neonService.createInvoiceItems(invoice.id, 'invoice_in', items, tenantId);
      }
      return invoice;
    } catch (error) {
      console.error('createInvoiceIn error:', error);
      throw error;
    }
  },
  updateInvoiceIn: (id, data, tenantId) => updateRecord('invoices_in', id, data, tenantId),
  deleteInvoiceIn: async (id, tenantId) => {
    try {
      // حذف عناصر الفاتورة أولاً (سيتم استرجاع الكميات تلقائياً عبر Trigger)
      await sql`DELETE FROM invoice_items WHERE invoice_id = ${id} AND invoice_type = 'invoice_in'`;
      await deleteRecord('invoices_in', id, tenantId);
    } catch (error) {
      console.error('deleteInvoiceIn error:', error);
      throw error;
    }
  },

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
  createInvoiceOut: async (data, tenantId, items = []) => {
    try {
      // تحويل items إلى JSONB إذا كان موجوداً في data
      const invoiceData = { ...data };
      if (items && items.length > 0) {
        invoiceData.items = JSON.stringify(items);
      }
      
      const invoice = await createRecord('invoices_out', invoiceData, tenantId);
      // حفظ عناصر الفاتورة في جدول invoice_items أيضاً
      if (items && items.length > 0 && invoice?.id) {
        await neonService.createInvoiceItems(invoice.id, 'invoice_out', items, tenantId);
      }
      return invoice;
    } catch (error) {
      console.error('createInvoiceOut error:', error);
      throw error;
    }
  },
  updateInvoiceOut: (id, data, tenantId) => updateRecord('invoices_out', id, data, tenantId),
  deleteInvoiceOut: async (id, tenantId) => {
    try {
      // حذف عناصر الفاتورة أولاً (سيتم استرجاع الكميات تلقائياً عبر Trigger)
      await sql`DELETE FROM invoice_items WHERE invoice_id = ${id} AND invoice_type = 'invoice_out'`;
      await deleteRecord('invoices_out', id, tenantId);
    } catch (error) {
      console.error('deleteInvoiceOut error:', error);
      throw error;
    }
  },

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
  updatePayroll: (id, data, tenantId) => updateRecord('payroll', id, data, tenantId),
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

  // Notifications
  getNotifications: async (userId) => {
    try {
      const result = await sql`
        SELECT * FROM notifications 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return result || [];
    } catch (error) {
      console.error('getNotifications error:', error);
      return [];
    }
  },

  getUnreadNotificationsCount: async (userId) => {
    try {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ${userId} AND is_read = false
      `;
      return parseInt(result[0]?.count || 0);
    } catch (error) {
      console.error('getUnreadNotificationsCount error:', error);
      return 0;
    }
  },

  markNotificationAsRead: async (notificationId, userId) => {
    try {
      await sql`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = ${notificationId} AND user_id = ${userId}
      `;
      return true;
    } catch (error) {
      console.error('markNotificationAsRead error:', error);
      throw error;
    }
  },

  markAllNotificationsAsRead: async (userId) => {
    try {
      await sql`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE user_id = ${userId} AND is_read = false
      `;
      return true;
    } catch (error) {
      console.error('markAllNotificationsAsRead error:', error);
      throw error;
    }
  },

  createNotification: async (notificationData) => {
    try {
      const result = await sql`
        INSERT INTO notifications (tenant_id, user_id, type, title, message)
        VALUES (
          ${notificationData.tenant_id || null},
          ${notificationData.user_id},
          ${notificationData.type || 'system'},
          ${notificationData.title},
          ${notificationData.message}
        )
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createNotification error:', error);
      throw error;
    }
  },

  // Support Tickets
  getSupportTickets: async (tenantId, userId, isAdmin = false) => {
    try {
      let result;
      if (isAdmin) {
        // Admin can see all tickets
        result = await sql`
          SELECT st.*, u.name as user_name, u.email as user_email,
                 t.name as tenant_name
          FROM support_tickets st
          LEFT JOIN users u ON st.user_id = u.id
          LEFT JOIN tenants t ON st.tenant_id = t.id
          ORDER BY st.created_at DESC
          LIMIT 100
        `;
      } else {
        // Regular user sees only their tenant tickets
        result = await sql`
          SELECT st.*, u.name as user_name, u.email as user_email
          FROM support_tickets st
          LEFT JOIN users u ON st.user_id = u.id
          WHERE st.tenant_id = ${tenantId}
          ORDER BY st.created_at DESC
          LIMIT 100
        `;
      }
      return result || [];
    } catch (error) {
      console.error('getSupportTickets error:', error);
      return [];
    }
  },

  createSupportTicket: async (ticketData) => {
    try {
      const result = await sql`
        INSERT INTO support_tickets (tenant_id, user_id, subject, message, priority, is_from_admin)
        VALUES (
          ${ticketData.tenant_id},
          ${ticketData.user_id || null},
          ${ticketData.subject},
          ${ticketData.message},
          ${ticketData.priority || 'medium'},
          ${ticketData.is_from_admin || false}
        )
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createSupportTicket error:', error);
      throw error;
    }
  },

  deleteSupportTicket: async (ticketId) => {
    try {
      const result = await sql`
        DELETE FROM support_tickets WHERE id = ${ticketId}::UUID
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('deleteSupportTicket error:', error);
      throw error;
    }
  },

  updateSupportTicket: async (ticketId, data) => {
    try {
      const result = await sql`
        UPDATE support_tickets 
        SET 
          status = ${data.status || 'open'},
          admin_response = ${data.admin_response || null},
          resolved_at = ${data.resolved_at ? new Date(data.resolved_at).toISOString() : null},
          resolved_by = ${data.resolved_by || null},
          updated_at = NOW()
        WHERE id = ${ticketId}::UUID
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateSupportTicket error:', error);
      throw error;
    }
  },

  getSupportTicketMessages: async (ticketId) => {
    try {
      const result = await sql`
        SELECT sm.*, u.name as user_name, u.email as user_email
        FROM support_messages sm
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.ticket_id = ${ticketId}
        ORDER BY sm.created_at ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getSupportTicketMessages error:', error);
      return [];
    }
  },

  addSupportTicketMessage: async (messageData) => {
    try {
      const result = await sql`
        INSERT INTO support_messages (ticket_id, user_id, message, is_from_admin, attachments)
        VALUES (
          ${messageData.ticket_id},
          ${messageData.user_id || null},
          ${messageData.message},
          ${messageData.is_from_admin || false},
          ${messageData.attachments ? JSON.stringify(messageData.attachments) : null}
        )
        RETURNING *
      `;
      
      // Update ticket updated_at
      await sql`
        UPDATE support_tickets 
        SET updated_at = NOW()
        WHERE id = ${messageData.ticket_id}
      `;
      
      return result[0];
    } catch (error) {
      console.error('addSupportTicketMessage error:', error);
      throw error;
    }
  },

  updateSupportTicketStatus: async (ticketId, status, assignedTo = null) => {
    try {
      await sql`
        UPDATE support_tickets 
        SET status = ${status}, 
            assigned_to = ${assignedTo || null},
            resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE resolved_at END,
            resolved_by = CASE WHEN ${status} = 'resolved' AND ${assignedTo} IS NOT NULL THEN ${assignedTo} ELSE resolved_by END,
            updated_at = NOW()
        WHERE id = ${ticketId}
      `;
      return true;
    } catch (error) {
      console.error('updateSupportTicketStatus error:', error);
      throw error;
    }
  },

  // Update user permissions (allow store owner to edit accountant even with permissions)
  updateUserPermissions: async (userId, data, tenantId, isStoreOwner = false) => {
    try {
      // If store owner, allow editing even if user has permissions
      if (isStoreOwner) {
        const columns = Object.keys(data);
        const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
        const values = [userId, ...Object.values(data)];
        const query = `UPDATE users SET ${setClause} WHERE id = $1 AND tenant_id = $${values.length + 1} RETURNING *`;
        values.push(tenantId);
        const result = await sql(query, values);
        if (!result || result.length === 0) throw new Error('User not found or access denied');
        return result[0];
      } else {
        // Regular update with tenant check
        return await updateRecord('users', userId, data, tenantId);
      }
    } catch (error) {
      console.error('updateUserPermissions error:', error);
      throw error;
    }
  },

  // Invoice Items
  getInvoiceItems: async (invoiceId, invoiceType, tenantId) => {
    if (!invoiceId || !tenantId) return [];
    try {
      const result = await sql`
        SELECT ii.*, inv.name as inventory_item_name, inv.sku as inventory_item_sku
        FROM invoice_items ii
        LEFT JOIN inventory_items inv ON ii.inventory_item_id = inv.id
        WHERE ii.invoice_id = ${invoiceId}
        AND ii.invoice_type = ${invoiceType}
        AND ii.tenant_id = ${tenantId}
        ORDER BY ii.created_at ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getInvoiceItems error:', error);
      return [];
    }
  },

  createInvoiceItems: async (invoiceId, invoiceType, items, tenantId) => {
    if (!invoiceId || !items || items.length === 0 || !tenantId) return [];
    try {
      const createdItems = [];
      for (const item of items) {
        const itemData = {
          invoice_id: invoiceId,
          invoice_type: invoiceType,
          tenant_id: tenantId,
          inventory_item_id: item.inventory_item_id || null,
          item_name: item.item_name || item.name || '',
          item_code: item.item_code || item.code || '',
          quantity: parseFloat(item.quantity || 1),
          unit: item.unit || 'piece',
          unit_price: parseFloat(item.unit_price || 0),
          total_price: parseFloat(item.total_price || item.quantity * item.unit_price || 0),
          currency: item.currency || 'TRY',
          notes: item.notes || null,
        };
        const created = await createRecord('invoice_items', itemData, tenantId);
        createdItems.push(created);
      }
      return createdItems;
    } catch (error) {
      console.error('createInvoiceItems error:', error);
      throw error;
    }
  },

  updateInvoiceItems: async (invoiceId, invoiceType, items, tenantId) => {
    if (!invoiceId || !tenantId) return [];
    try {
      // حذف العناصر القديمة
      await sql`DELETE FROM invoice_items WHERE invoice_id = ${invoiceId} AND invoice_type = ${invoiceType} AND tenant_id = ${tenantId}`;
      // إضافة العناصر الجديدة
      if (items && items.length > 0) {
        return await neonService.createInvoiceItems(invoiceId, invoiceType, items, tenantId);
      }
      return [];
    } catch (error) {
      console.error('updateInvoiceItems error:', error);
      throw error;
    }
  },

  deleteInvoiceItem: async (itemId, tenantId) => {
    try {
      return await deleteRecord('invoice_items', itemId, tenantId);
    } catch (error) {
      console.error('deleteInvoiceItem error:', error);
      throw error;
    }
  },

  // Backup & Restore
  createBackup: async (tenantId, userId) => {
    if (!tenantId) throw new Error('Tenant ID is required');
    try {
      // استدعاء Function من قاعدة البيانات لإنشاء النسخة الاحتياطية
      const backupData = await sql`
        SELECT create_tenant_backup(${tenantId}) as backup_data
      `;
      
      const data = backupData[0]?.backup_data;
      if (!data) throw new Error('Failed to create backup');

      // حفظ النسخة الاحتياطية في جدول backups
      const backupRecord = await createRecord('backups', {
        tenant_id: tenantId,
        backup_type: 'full',
        backup_data: data,
        file_name: `backup_${tenantId}_${Date.now()}.json`,
        file_size: JSON.stringify(data).length / 1024, // بالكيلوبايت
        created_by: userId,
      }, tenantId);

      return backupRecord;
    } catch (error) {
      console.error('createBackup error:', error);
      throw error;
    }
  },

  getBackups: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT b.*, u.name as created_by_name
        FROM backups b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.tenant_id = ${tenantId}
        ORDER BY b.created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getBackups error:', error);
      return [];
    }
  },

  deleteBackup: async (backupId, tenantId) => {
    try {
      return await deleteRecord('backups', backupId, tenantId);
    } catch (error) {
      console.error('deleteBackup error:', error);
      throw error;
    }
  },

  exportBackupData: async (tenantId) => {
    if (!tenantId) throw new Error('Tenant ID is required');
    try {
      const backupData = await sql`
        SELECT create_tenant_backup(${tenantId}) as backup_data
      `;
      return backupData[0]?.backup_data || null;
    } catch (error) {
      console.error('exportBackupData error:', error);
      throw error;
    }
  },

  importBackupData: async (backupData, targetTenantId) => {
    if (!backupData || !targetTenantId) throw new Error('Backup data and tenant ID are required');
    try {
      // التحقق من صحة البيانات
      if (!backupData.tenant || !backupData.invoices_in || !backupData.invoices_out) {
        throw new Error('Invalid backup data format');
      }

      // ملاحظة: استعادة البيانات يجب أن تتم بعناية
      // هنا سنحفظ البيانات فقط في جدول backups للاستعادة اليدوية
      const backupRecord = await createRecord('backups', {
        tenant_id: targetTenantId,
        backup_type: 'imported',
        backup_data: backupData,
        file_name: `imported_backup_${targetTenantId}_${Date.now()}.json`,
        file_size: JSON.stringify(backupData).length / 1024,
      }, targetTenantId);

      return backupRecord;
    } catch (error) {
      console.error('importBackupData error:', error);
      throw error;
    }
  },

  // Customer Transactions (الدفعات والديون)
  getCustomerTransactions: async (tenantId, partnerId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (partnerId) {
        query = sql`
          SELECT ct.*, p.name as partner_name, u.name as created_by_name
          FROM customer_transactions ct
          LEFT JOIN partners p ON ct.partner_id = p.id
          LEFT JOIN users u ON ct.created_by = u.id
          WHERE ct.tenant_id = ${tenantId} AND ct.partner_id = ${partnerId}
          ORDER BY ct.transaction_date DESC, ct.created_at DESC
        `;
      } else {
        query = sql`
          SELECT ct.*, p.name as partner_name, u.name as created_by_name
          FROM customer_transactions ct
          LEFT JOIN partners p ON ct.partner_id = p.id
          LEFT JOIN users u ON ct.created_by = u.id
          WHERE ct.tenant_id = ${tenantId}
          ORDER BY ct.transaction_date DESC, ct.created_at DESC
        `;
      }
      return await query;
    } catch (error) {
      console.error('getCustomerTransactions error:', error);
      return [];
    }
  },

  createCustomerTransaction: async (data, tenantId) => {
    try {
      return await createRecord('customer_transactions', {
        ...data,
        transaction_date: data.transaction_date || new Date().toISOString(),
      }, tenantId);
    } catch (error) {
      console.error('createCustomerTransaction error:', error);
      throw error;
    }
  },

  updateCustomerTransaction: (id, data, tenantId) => updateRecord('customer_transactions', id, data, tenantId),
  deleteCustomerTransaction: (id, tenantId) => deleteRecord('customer_transactions', id, tenantId),

  // Daily Transactions (الحركة اليومية)
  getDailyTransactions: async (tenantId, date = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (date) {
        query = sql`
          SELECT dt.*, u.name as created_by_name
          FROM daily_transactions dt
          LEFT JOIN users u ON dt.created_by = u.id
          WHERE dt.tenant_id = ${tenantId} AND dt.transaction_date = ${date}
          ORDER BY dt.transaction_date DESC, dt.created_at DESC
        `;
      } else {
        query = sql`
          SELECT dt.*, u.name as created_by_name
          FROM daily_transactions dt
          LEFT JOIN users u ON dt.created_by = u.id
          WHERE dt.tenant_id = ${tenantId}
          ORDER BY dt.transaction_date DESC, dt.created_at DESC
          LIMIT 500
        `;
      }
      return await query;
    } catch (error) {
      console.error('getDailyTransactions error:', error);
      return [];
    }
  },

  getDailyProfitLoss: async (tenantId, startDate = null, endDate = null) => {
    if (!tenantId) return null;
    try {
      let query;
      if (startDate && endDate) {
        query = sql`
          SELECT * FROM daily_profit_loss
          WHERE tenant_id = ${tenantId}
          AND transaction_date BETWEEN ${startDate} AND ${endDate}
          ORDER BY transaction_date DESC
        `;
      } else {
        query = sql`
          SELECT * FROM daily_profit_loss
          WHERE tenant_id = ${tenantId}
          ORDER BY transaction_date DESC
          LIMIT 30
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getDailyProfitLoss error:', error);
      return [];
    }
  },

  createDailyTransaction: async (data, tenantId) => {
    try {
      return await createRecord('daily_transactions', {
        ...data,
        transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
      }, tenantId);
    } catch (error) {
      console.error('createDailyTransaction error:', error);
      throw error;
    }
  },

  // ========== المصاريف اليومية ==========
  getDailyExpenses: async (tenantId, date = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (date) {
        query = sql`
          SELECT de.*, u.name as created_by_name, emp.name as employee_name
          FROM daily_expenses de
          LEFT JOIN users u ON de.created_by = u.id
          LEFT JOIN users emp ON de.employee_id = emp.id
          WHERE de.tenant_id = ${tenantId} AND de.expense_date = ${date}
          ORDER BY de.expense_date DESC, de.created_at DESC
        `;
      } else {
        query = sql`
          SELECT de.*, u.name as created_by_name, emp.name as employee_name
          FROM daily_expenses de
          LEFT JOIN users u ON de.created_by = u.id
          LEFT JOIN users emp ON de.employee_id = emp.id
          WHERE de.tenant_id = ${tenantId}
          ORDER BY de.expense_date DESC, de.created_at DESC
          LIMIT 500
        `;
      }
      return await query;
    } catch (error) {
      console.error('getDailyExpenses error:', error);
      return [];
    }
  },

  createDailyExpense: async (data, tenantId) => {
    try {
      return await createRecord('daily_expenses', {
        ...data,
        expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      }, tenantId);
    } catch (error) {
      console.error('createDailyExpense error:', error);
      throw error;
    }
  },

  updateDailyExpense: async (id, data, tenantId) => {
    return updateRecord('daily_expenses', id, data, tenantId);
  },

  deleteDailyExpense: async (id, tenantId) => {
    return deleteRecord('daily_expenses', id, tenantId);
  },

  // Customer Summary (تقرير العملاء)
  getCustomerSummary: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM customer_summary
        WHERE tenant_id = ${tenantId}
        ORDER BY debt DESC, balance DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getCustomerSummary error:', error);
      return [];
    }
  },

  // Offline Queue
  getOfflineQueue: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM offline_queue
        WHERE tenant_id = ${tenantId} AND sync_status = 'pending'
        ORDER BY created_at ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getOfflineQueue error:', error);
      return [];
    }
  },

  createOfflineQueueItem: async (data, tenantId) => {
    try {
      return await createRecord('offline_queue', data, tenantId);
    } catch (error) {
      console.error('createOfflineQueueItem error:', error);
      throw error;
    }
  },

  updateOfflineQueueItem: (id, data, tenantId) => updateRecord('offline_queue', id, data, tenantId),
  deleteOfflineQueueItem: (id, tenantId) => deleteRecord('offline_queue', id, tenantId),

  // Export Tenant Data (for Admin Panel)
  exportTenantData: async (tenantId) => {
    if (!tenantId) return null;
    try {
      const result = await sql`
        SELECT export_tenant_data(${tenantId}) as export_data
      `;
      return result[0]?.export_data || null;
    } catch (error) {
      console.error('exportTenantData error:', error);
      throw error;
    }
  },

  // Cash Register Functions
  getCashRegister: async (tenantId, currency = 'TRY') => {
    if (!tenantId) return null;
    try {
      const result = await sql`
        SELECT * FROM cash_register
        WHERE tenant_id = ${tenantId} AND currency = ${currency}
        LIMIT 1
      `;
      return result[0] || null;
    } catch (error) {
      console.error('getCashRegister error:', error);
      return null;
    }
  },

  getCashTransactions: async (tenantId, startDate = null, endDate = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (startDate && endDate) {
        query = sql`
          SELECT ct.*, u.name as user_name
          FROM cash_transactions ct
          LEFT JOIN users u ON ct.created_by = u.id
          WHERE ct.tenant_id = ${tenantId}
          AND ct.created_at BETWEEN ${startDate} AND ${endDate}
          ORDER BY ct.created_at DESC
        `;
      } else {
        query = sql`
          SELECT ct.*, u.name as user_name
          FROM cash_transactions ct
          LEFT JOIN users u ON ct.created_by = u.id
          WHERE ct.tenant_id = ${tenantId}
          ORDER BY ct.created_at DESC
          LIMIT 100
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getCashTransactions error:', error);
      return [];
    }
  },

  createCashTransaction: async (data, tenantId) => {
    try {
      const result = await sql`
        SELECT create_cash_transaction(
          ${tenantId},
          ${data.currency || 'TRY'},
          ${data.amount},
          ${data.transaction_type},
          ${data.description || ''},
          ${data.reference_type || null},
          ${data.reference_id || null},
          ${data.user_id || null}
        ) as transaction_id
      `;
      return result[0]?.transaction_id || null;
    } catch (error) {
      console.error('createCashTransaction error:', error);
      throw error;
    }
  },

  // ============================================
  // Store Types Management
  // ============================================
  getStoreTypes: async () => {
    try {
      const result = await sql`SELECT * FROM store_types WHERE is_active = true ORDER BY sort_order, name_ar`;
      return result || [];
    } catch (error) {
      console.error('getStoreTypes error:', error);
      return [];
    }
  },
  
  createStoreType: async (data) => {
    try {
      const result = await sql`
        INSERT INTO store_types (code, name_ar, name_en, name_tr, description_ar, description_en, features, sort_order, icon)
        VALUES (${data.code}, ${data.name_ar}, ${data.name_en}, ${data.name_tr}, ${data.description_ar}, ${data.description_en}, ${JSON.stringify(data.features || {})}::jsonb, ${data.sort_order || 0}, ${data.icon})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createStoreType error:', error);
      throw error;
    }
  },
  
  updateStoreType: async (id, data) => {
    try {
      const result = await sql`
        UPDATE store_types 
        SET name_ar = ${data.name_ar}, name_en = ${data.name_en}, name_tr = ${data.name_tr},
            description_ar = ${data.description_ar}, description_en = ${data.description_en},
            features = ${JSON.stringify(data.features || {})}::jsonb, sort_order = ${data.sort_order || 0},
            icon = ${data.icon}, is_active = ${data.is_active !== undefined ? data.is_active : true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateStoreType error:', error);
      throw error;
    }
  },

  // ============================================
  // Subscribers Management (Legacy - kept for backward compatibility)
  // Note: The new Internet Cafe system uses internet_cafe_subscribers table
  // ============================================

  // ============================================
  // Subscriptions Management
  // ============================================
  getSubscriptions: async (tenantId, subscriberId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (subscriberId) {
        query = sql`
          SELECT * FROM subscriptions 
          WHERE tenant_id = ${tenantId} AND subscriber_id = ${subscriberId}
          ORDER BY end_date DESC
        `;
      } else {
        query = sql`
          SELECT * FROM subscriptions 
          WHERE tenant_id = ${tenantId}
          ORDER BY end_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getSubscriptions error:', error);
      return [];
    }
  },

  createSubscription: async (data, tenantId) => {
    return createRecord('subscriptions', data, tenantId);
  },

  updateSubscription: async (id, data, tenantId) => {
    return updateRecord('subscriptions', id, data, tenantId);
  },

  deleteSubscription: async (id, tenantId) => {
    return deleteRecord('subscriptions', id, tenantId);
  },

  getExpiringSubscriptions: async (tenantId, days = 7) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM expiring_subscriptions
        WHERE tenant_id = ${tenantId}
        AND days_remaining <= ${days}
        ORDER BY days_remaining ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getExpiringSubscriptions error:', error);
      return [];
    }
  },

  // ============================================
  // Internet Usage Management
  // ============================================
  getInternetUsage: async (tenantId, subscriberId = null, startDate = null, endDate = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (subscriberId) {
        if (startDate && endDate) {
          query = sql`
            SELECT * FROM internet_usage 
            WHERE tenant_id = ${tenantId} AND subscriber_id = ${subscriberId}
            AND DATE(session_start) BETWEEN ${startDate} AND ${endDate}
            ORDER BY session_start DESC
          `;
        } else {
          query = sql`
            SELECT * FROM internet_usage 
            WHERE tenant_id = ${tenantId} AND subscriber_id = ${subscriberId}
            ORDER BY session_start DESC
          `;
        }
      } else {
        if (startDate && endDate) {
          query = sql`
            SELECT * FROM internet_usage 
            WHERE tenant_id = ${tenantId}
            AND DATE(session_start) BETWEEN ${startDate} AND ${endDate}
            ORDER BY session_start DESC
          `;
        } else {
          query = sql`
            SELECT * FROM internet_usage 
            WHERE tenant_id = ${tenantId}
            ORDER BY session_start DESC
          `;
        }
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getInternetUsage error:', error);
      return [];
    }
  },

  createInternetUsage: async (data, tenantId) => {
    return createRecord('internet_usage', data, tenantId);
  },

  updateInternetUsage: async (id, data, tenantId) => {
    return updateRecord('internet_usage', id, data, tenantId);
  },

  // ============================================
  // Subscriber Transactions
  // ============================================
  getSubscriberTransactions: async (tenantId, subscriberId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (subscriberId) {
        query = sql`
          SELECT * FROM subscriber_transactions 
          WHERE tenant_id = ${tenantId} AND subscriber_id = ${subscriberId}
          ORDER BY transaction_date DESC
        `;
      } else {
        query = sql`
          SELECT * FROM subscriber_transactions 
          WHERE tenant_id = ${tenantId}
          ORDER BY transaction_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getSubscriberTransactions error:', error);
      return [];
    }
  },

  createSubscriberTransaction: async (data, tenantId) => {
    return createRecord('subscriber_transactions', data, tenantId);
  },

  // ============================================
  // Fuel Station Management
  // ============================================
  getFuelTypes: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM fuel_types 
        WHERE tenant_id = ${tenantId} AND is_active = true
        ORDER BY name_ar
      `;
      return result || [];
    } catch (error) {
      console.error('getFuelTypes error:', error);
      return [];
    }
  },

  createFuelType: async (data, tenantId) => {
    return createRecord('fuel_types', data, tenantId);
  },

  updateFuelType: async (id, data, tenantId) => {
    return updateRecord('fuel_types', id, data, tenantId);
  },

  deleteFuelType: async (id, tenantId) => {
    return deleteRecord('fuel_types', id, tenantId);
  },

  getFuelTransactions: async (tenantId, fuelTypeId = null, startDate = null, endDate = null) => {
    if (!tenantId) return [];
    try {
      // التحقق من وجود الجدول أولاً
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'fuel_transactions'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        return [];
      }
      
      let query;
      if (fuelTypeId && startDate && endDate) {
        query = sql`
          SELECT ft.*, ftp.name_ar as fuel_name, ftp.code as fuel_code
          FROM fuel_transactions ft
          JOIN fuel_types ftp ON ft.fuel_type_id = ftp.id
          WHERE ft.tenant_id = ${tenantId} AND ft.fuel_type_id = ${fuelTypeId}
          AND DATE(ft.transaction_date) BETWEEN ${startDate} AND ${endDate}
          ORDER BY ft.transaction_date DESC
        `;
      } else if (startDate && endDate) {
        query = sql`
          SELECT ft.*, ftp.name_ar as fuel_name, ftp.code as fuel_code
          FROM fuel_transactions ft
          JOIN fuel_types ftp ON ft.fuel_type_id = ftp.id
          WHERE ft.tenant_id = ${tenantId}
          AND DATE(ft.transaction_date) BETWEEN ${startDate} AND ${endDate}
          ORDER BY ft.transaction_date DESC
        `;
      } else {
        query = sql`
          SELECT ft.*, ftp.name_ar as fuel_name, ftp.code as fuel_code
          FROM fuel_transactions ft
          JOIN fuel_types ftp ON ft.fuel_type_id = ftp.id
          WHERE ft.tenant_id = ${tenantId}
          ORDER BY ft.transaction_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getFuelTransactions error:', error);
      return [];
    }
  },

  createFuelTransaction: async (data, tenantId) => {
    return createRecord('fuel_transactions', data, tenantId);
  },

  updateFuelTransaction: async (id, data, tenantId) => {
    return updateRecord('fuel_transactions', id, data, tenantId);
  },

  deleteFuelTransaction: async (id, tenantId) => {
    return deleteRecord('fuel_transactions', id, tenantId);
  },

  getFuelInventory: async (tenantId) => {
    if (!tenantId) return [];
    try {
      // محاولة استخدام view أولاً
      const viewExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = 'current_fuel_inventory'
        ) as exists
      `;
      
      if (viewExists[0]?.exists) {
        const result = await sql`
          SELECT * FROM current_fuel_inventory WHERE tenant_id = ${tenantId}::UUID
        `;
        return result || [];
      }
      
      // Fallback: استخدام الدالة
      const funcExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'get_fuel_inventory'
        ) as exists
      `;
      
      if (funcExists[0]?.exists) {
        const result = await sql`
          SELECT * FROM get_fuel_inventory(${tenantId}::UUID)
        `;
        return result || [];
      }
      
      // Fallback: حساب يدوي
      const result = await sql`
        SELECT 
          ft.tenant_id,
          ft.fuel_type_id,
          ftp.name_ar as fuel_name,
          ftp.name_en as fuel_name_en,
          ftp.code as fuel_code,
          ftp.unit,
          ftp.min_stock_level,
          COALESCE(
            SUM(CASE 
              WHEN ft.transaction_type = 'purchase' THEN ft.quantity
              WHEN ft.transaction_type = 'sale' THEN -ft.quantity
              WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
              WHEN ft.transaction_type = 'loss' THEN -ft.quantity
              ELSE 0
            END), 
            0
          ) as quantity,
          CASE 
            WHEN COALESCE(
              SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
              END), 
              0
            ) <= ftp.min_stock_level THEN 'low_stock'
            WHEN COALESCE(
              SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
              END), 
              0
            ) >= (ftp.min_stock_level * 3) THEN 'high_stock'
            ELSE 'normal'
          END as stock_status,
          MAX(CASE WHEN ft.transaction_type = 'purchase' THEN ft.transaction_date END) as last_purchase_date,
          MAX(CASE WHEN ft.transaction_type = 'sale' THEN ft.transaction_date END) as last_sale_date
        FROM fuel_types ftp
        LEFT JOIN fuel_transactions ft ON ft.fuel_type_id = ftp.id AND ft.tenant_id = ${tenantId}
        WHERE ftp.tenant_id = ${tenantId} AND ftp.is_active = true
        GROUP BY ft.tenant_id, ft.fuel_type_id, ftp.id, ftp.name_ar, ftp.name_en, ftp.code, ftp.unit, ftp.min_stock_level
      `;
      return result || [];
    } catch (error) {
      console.error('getFuelInventory error:', error);
      return [];
    }
  },

  getFuelPrices: async (tenantId, fuelTypeId = null) => {
    if (!tenantId) return [];
    try {
      // التحقق من وجود الجدول أولاً
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'fuel_daily_prices'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        return [];
      }
      
      let query;
      if (fuelTypeId) {
        query = sql`
          SELECT * FROM fuel_daily_prices 
          WHERE tenant_id = ${tenantId} AND fuel_type_id = ${fuelTypeId}
          ORDER BY price_date DESC
          LIMIT 1
        `;
      } else {
        query = sql`
          SELECT * FROM fuel_daily_prices 
          WHERE tenant_id = ${tenantId}
          ORDER BY price_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getFuelPrices error:', error);
      return [];
    }
  },

  createFuelPrice: async (data, tenantId) => {
    try {
      // استخدام fuel_daily_prices بدلاً من fuel_prices
      const result = await sql`
        INSERT INTO fuel_daily_prices (tenant_id, fuel_type_id, price_date, unit_price, currency, notes)
        VALUES (${tenantId}, ${data.fuel_type_id}, ${data.price_date || new Date().toISOString().split('T')[0]}, ${data.unit_price}, ${data.currency || 'TRY'}, ${data.notes || ''})
        ON CONFLICT (tenant_id, fuel_type_id, price_date) 
        DO UPDATE SET unit_price = EXCLUDED.unit_price, currency = EXCLUDED.currency, notes = EXCLUDED.notes, updated_at = NOW()
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createFuelPrice error:', error);
      throw error;
    }
  },

  // ============================================
  // Subscription Notifications
  // ============================================
  getSubscriptionNotifications: async (tenantId, isSent = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (isSent !== null) {
        query = sql`
          SELECT * FROM subscription_notifications 
          WHERE tenant_id = ${tenantId} AND is_sent = ${isSent}
          ORDER BY created_at DESC
        `;
      } else {
        query = sql`
          SELECT * FROM subscription_notifications 
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getSubscriptionNotifications error:', error);
      return [];
    }
  },

  markNotificationAsSent: async (id, tenantId) => {
    try {
      const result = await sql`
        UPDATE subscription_notifications 
        SET is_sent = true, sent_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('markNotificationAsSent error:', error);
      throw error;
    }
  },

  // ============================================
  // Contractor Store Management
  // ============================================

  // Units
  getUnits: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM units 
        WHERE tenant_id = ${tenantId} AND is_active = true
        ORDER BY category, name_ar
      `;
      return result || [];
    } catch (error) {
      console.error('getUnits error:', error);
      return [];
    }
  },

  createUnit: async (data, tenantId) => {
    return createRecord('units', data, tenantId);
  },

  updateUnit: async (id, data, tenantId) => {
    return updateRecord('units', id, data, tenantId);
  },

  deleteUnit: async (id, tenantId) => {
    return deleteRecord('units', id, tenantId);
  },

  // Products
  getProducts: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT p.*, u.name_ar as unit_name, u.code as unit_code
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.tenant_id = ${tenantId} AND p.is_active = true
        ORDER BY p.name
      `;
      return result || [];
    } catch (error) {
      console.error('getProducts error:', error);
      return [];
    }
  },

  createProduct: async (data, tenantId) => {
    return createRecord('products', data, tenantId);
  },

  updateProduct: async (id, data, tenantId) => {
    return updateRecord('products', id, data, tenantId);
  },

  deleteProduct: async (id, tenantId) => {
    return deleteRecord('products', id, tenantId);
  },

  // Contractor Projects
  getContractorProjects: async (tenantId, status = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (status) {
        query = sql`
          SELECT cp.*, p.name as client_name_display, p.phone as client_phone
          FROM contractor_projects cp
          LEFT JOIN partners p ON cp.client_id = p.id
          WHERE cp.tenant_id = ${tenantId} AND cp.status = ${status}
          ORDER BY cp.start_date DESC, cp.created_at DESC
        `;
      } else {
        query = sql`
          SELECT cp.*, p.name as client_name_display, p.phone as client_phone
          FROM contractor_projects cp
          LEFT JOIN partners p ON cp.client_id = p.id
          WHERE cp.tenant_id = ${tenantId}
          ORDER BY cp.start_date DESC, cp.created_at DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getContractorProjects error:', error);
      return [];
    }
  },

  createContractorProject: async (data, tenantId) => {
    return createRecord('contractor_projects', data, tenantId);
  },

  updateContractorProject: async (id, data, tenantId) => {
    return updateRecord('contractor_projects', id, data, tenantId);
  },

  deleteContractorProject: async (id, tenantId) => {
    return deleteRecord('contractor_projects', id, tenantId);
  },

  // Project Items (BOQ)
  getProjectItems: async (tenantId, projectId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (projectId) {
        query = sql`
          SELECT pi.*, u.name_ar as unit_name, u.code as unit_code
          FROM project_items pi
          LEFT JOIN units u ON pi.unit_id = u.id
          WHERE pi.tenant_id = ${tenantId} AND pi.project_id = ${projectId}
          ORDER BY pi.sort_order, pi.created_at
        `;
      } else {
        query = sql`
          SELECT pi.*, u.name_ar as unit_name, u.code as unit_code
          FROM project_items pi
          LEFT JOIN units u ON pi.unit_id = u.id
          WHERE pi.tenant_id = ${tenantId}
          ORDER BY pi.project_id, pi.sort_order
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getProjectItems error:', error);
      return [];
    }
  },

  createProjectItem: async (data, tenantId) => {
    return createRecord('project_items', data, tenantId);
  },

  updateProjectItem: async (id, data, tenantId) => {
    return updateRecord('project_items', id, data, tenantId);
  },

  deleteProjectItem: async (id, tenantId) => {
    return deleteRecord('project_items', id, tenantId);
  },

  // Material Deliveries
  getMaterialDeliveries: async (tenantId, projectId = null, startDate = null, endDate = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (projectId) {
        if (startDate && endDate) {
          query = sql`
            SELECT md.*, ftp.name_ar as supplier_name_display,
                   u.name_ar as unit_name, u.code as unit_code
            FROM material_deliveries md
            LEFT JOIN partners ftp ON md.supplier_id = ftp.id
            LEFT JOIN units u ON md.unit_id = u.id
            WHERE md.tenant_id = ${tenantId} AND md.project_id = ${projectId}
            AND DATE(md.delivery_date) BETWEEN ${startDate} AND ${endDate}
            ORDER BY md.delivery_date DESC
          `;
        } else {
          query = sql`
            SELECT md.*, ftp.name_ar as supplier_name_display,
                   u.name_ar as unit_name, u.code as unit_code
            FROM material_deliveries md
            LEFT JOIN partners ftp ON md.supplier_id = ftp.id
            LEFT JOIN units u ON md.unit_id = u.id
            WHERE md.tenant_id = ${tenantId} AND md.project_id = ${projectId}
            ORDER BY md.delivery_date DESC
          `;
        }
      } else {
        query = sql`
          SELECT md.*, ftp.name_ar as supplier_name_display,
                 u.name_ar as unit_name, u.code as unit_code
          FROM material_deliveries md
          LEFT JOIN partners ftp ON md.supplier_id = ftp.id
          LEFT JOIN units u ON md.unit_id = u.id
          WHERE md.tenant_id = ${tenantId}
          ORDER BY md.delivery_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getMaterialDeliveries error:', error);
      return [];
    }
  },

  createMaterialDelivery: async (data, tenantId) => {
    return createRecord('material_deliveries', data, tenantId);
  },

  updateMaterialDelivery: async (id, data, tenantId) => {
    return updateRecord('material_deliveries', id, data, tenantId);
  },

  deleteMaterialDelivery: async (id, tenantId) => {
    return deleteRecord('material_deliveries', id, tenantId);
  },

  // Client Price Lists
  getClientPriceLists: async (tenantId, clientId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (clientId) {
        query = sql`
          SELECT cpl.*, u.name_ar as unit_name, u.code as unit_code
          FROM client_price_lists cpl
          LEFT JOIN units u ON cpl.unit_id = u.id
          WHERE cpl.tenant_id = ${tenantId} AND cpl.client_id = ${clientId} AND cpl.is_active = true
          ORDER BY cpl.product_name
        `;
      } else {
        query = sql`
          SELECT cpl.*, u.name_ar as unit_name, u.code as unit_code
          FROM client_price_lists cpl
          LEFT JOIN units u ON cpl.unit_id = u.id
          WHERE cpl.tenant_id = ${tenantId} AND cpl.is_active = true
          ORDER BY cpl.client_id, cpl.product_name
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getClientPriceLists error:', error);
      return [];
    }
  },

  createClientPriceList: async (data, tenantId) => {
    return createRecord('client_price_lists', data, tenantId);
  },

  updateClientPriceList: async (id, data, tenantId) => {
    return updateRecord('client_price_lists', id, data, tenantId);
  },

  deleteClientPriceList: async (id, tenantId) => {
    return deleteRecord('client_price_lists', id, tenantId);
  },

  // Project Payments
  getProjectPayments: async (tenantId, projectId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (projectId) {
        query = sql`
          SELECT * FROM project_payments 
          WHERE tenant_id = ${tenantId} AND project_id = ${projectId}
          ORDER BY payment_date DESC
        `;
      } else {
        query = sql`
          SELECT * FROM project_payments 
          WHERE tenant_id = ${tenantId}
          ORDER BY payment_date DESC
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getProjectPayments error:', error);
      return [];
    }
  },

  createProjectPayment: async (data, tenantId) => {
    return createRecord('project_payments', data, tenantId);
  },

  updateProjectPayment: async (id, data, tenantId) => {
    return updateRecord('project_payments', id, data, tenantId);
  },

  deleteProjectPayment: async (id, tenantId) => {
    return deleteRecord('project_payments', id, tenantId);
  },

  // Project Summary Views
  getActiveProjectsSummary: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM active_projects_summary
        WHERE tenant_id = ${tenantId}
        ORDER BY start_date DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getActiveProjectsSummary error:', error);
      return [];
    }
  },

  getProjectItemsSummary: async (tenantId, projectId) => {
    if (!tenantId || !projectId) return null;
    try {
      const result = await sql`
        SELECT * FROM project_items_summary
        WHERE tenant_id = ${tenantId} AND project_id = ${projectId}
        LIMIT 1
      `;
      return result[0] || null;
    } catch (error) {
      console.error('getProjectItemsSummary error:', error);
      return null;
    }
  },

  getMaterialDeliveriesSummary: async (tenantId, projectId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (projectId) {
        query = sql`
          SELECT * FROM material_deliveries_summary
          WHERE tenant_id = ${tenantId} AND project_id = ${projectId}
        `;
      } else {
        query = sql`
          SELECT * FROM material_deliveries_summary
          WHERE tenant_id = ${tenantId}
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getMaterialDeliveriesSummary error:', error);
      return [];
    }
  },

  // Multiple Store Types Management
  getTenantStoreTypes: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM get_tenant_store_types(${tenantId})
      `;
      return result || [];
    } catch (error) {
      console.error('getTenantStoreTypes error:', error);
      return [];
    }
  },

  addStoreTypeToTenant: async (tenantId, storeTypeId, isPrimary = false, priority = 0) => {
    try {
      const result = await sql`
        SELECT add_store_type_to_tenant(${tenantId}, ${storeTypeId}, ${isPrimary}, ${priority}) as success
      `;
      return result[0]?.success || false;
    } catch (error) {
      console.error('addStoreTypeToTenant error:', error);
      throw error;
    }
  },

  removeStoreTypeFromTenant: async (tenantId, storeTypeId) => {
    try {
      await sql`
        DELETE FROM tenant_store_types
        WHERE tenant_id = ${tenantId} AND store_type_id = ${storeTypeId}
      `;
      return true;
    } catch (error) {
      console.error('removeStoreTypeFromTenant error:', error);
      throw error;
    }
  },

  // Notification Settings Management
  getTenantNotificationSettings: async (tenantId) => {
    if (!tenantId) return [];
    try {
      const result = await sql`
        SELECT * FROM get_tenant_notification_settings(${tenantId})
      `;
      return result || [];
    } catch (error) {
      console.error('getTenantNotificationSettings error:', error);
      return [];
    }
  },

  updateNotificationSetting: async (tenantId, notificationType, settings, userId) => {
    try {
      await sql`
        INSERT INTO notification_settings (tenant_id, notification_type, enabled, show_in_app, show_push, show_sound, priority)
        VALUES (${tenantId}, ${notificationType}, ${settings.enabled}, ${settings.show_in_app}, ${settings.show_push}, ${settings.show_sound}, ${settings.priority || 'normal'})
        ON CONFLICT (tenant_id, notification_type) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          show_in_app = EXCLUDED.show_in_app,
          show_push = EXCLUDED.show_push,
          show_sound = EXCLUDED.show_sound,
          priority = EXCLUDED.priority,
          updated_at = NOW()
      `;
      return true;
    } catch (error) {
      console.error('updateNotificationSetting error:', error);
      throw error;
    }
  },

  // Push Notifications Management
  savePushSubscription: async (tenantId, userId, subscription) => {
    try {
      await sql`
        INSERT INTO push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth, user_agent, is_active)
        VALUES (${tenantId}, ${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${navigator.userAgent || ''}, true)
        ON CONFLICT (tenant_id, user_id, endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          is_active = true,
          updated_at = NOW()
      `;
      return true;
    } catch (error) {
      console.error('savePushSubscription error:', error);
      throw error;
    }
  },

  getPushSubscriptions: async (tenantId, userId = null) => {
    if (!tenantId) return [];
    try {
      let query;
      if (userId) {
        query = sql`
          SELECT * FROM push_subscriptions
          WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND is_active = true
        `;
      } else {
        query = sql`
          SELECT * FROM push_subscriptions
          WHERE tenant_id = ${tenantId} AND is_active = true
        `;
      }
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getPushSubscriptions error:', error);
      return [];
    }
  },

  removePushSubscription: async (tenantId, userId, endpoint) => {
    try {
      await sql`
        UPDATE push_subscriptions
        SET is_active = false, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND endpoint = ${endpoint}
      `;
      return true;
    } catch (error) {
      console.error('removePushSubscription error:', error);
      throw error;
    }
  },

  canSendPushNotification: async (tenantId, notificationType) => {
    try {
      const result = await sql`
        SELECT can_send_push_notification(${tenantId}, ${notificationType}) as can_send
      `;
      return result[0]?.can_send || false;
    } catch (error) {
      console.error('canSendPushNotification error:', error);
      return false;
    }
  },

  // Tenant Section Settings
  getTenantSectionSettings: async (tenantId) => {
    try {
      // التحقق من وجود الجدول أولاً
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tenant_section_settings'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        return []; // الجدول غير موجود، إرجاع قائمة فارغة
      }

      const result = await sql`
        SELECT section_code, is_visible, display_order
        FROM tenant_section_settings
        WHERE tenant_id = ${tenantId} AND is_visible = true
        ORDER BY display_order
      `;
      return result || [];
    } catch (error) {
      console.error('getTenantSectionSettings error:', error);
      return []; // في حالة الخطأ، إرجاع قائمة فارغة
    }
  },

  updateTenantSectionSettings: async (tenantId, settings) => {
    try {
      // حذف الإعدادات القديمة
      await sql`DELETE FROM tenant_section_settings WHERE tenant_id = ${tenantId}`;
      
      // إضافة الإعدادات الجديدة
      if (settings && settings.length > 0) {
        for (const setting of settings) {
          await sql`
            INSERT INTO tenant_section_settings (tenant_id, section_code, is_visible, display_order)
            VALUES (${tenantId}, ${setting.section_code}, ${setting.is_visible || true}, ${setting.display_order || 0})
            ON CONFLICT (tenant_id, section_code) 
            DO UPDATE SET is_visible = ${setting.is_visible || true}, display_order = ${setting.display_order || 0}
          `;
        }
      }
      return true;
    } catch (error) {
      console.error('updateTenantSectionSettings error:', error);
      throw error;
    }
  },

  // Update user last seen
  updateUserLastSeen: async (userId) => {
    try {
      await sql`UPDATE users SET last_seen = NOW() WHERE id = ${userId}`;
      return true;
    } catch (error) {
      console.error('updateUserLastSeen error:', error);
      return false;
    }
  },

  // Get active users
  getActiveUsers: async (tenantId, minutesThreshold = 5) => {
    try {
      const result = await sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          u.last_seen,
          u.last_login,
          u.avatar_url,
          CASE 
            WHEN u.last_seen IS NOT NULL AND u.last_seen > NOW() - (${minutesThreshold} || ' minutes')::INTERVAL THEN true
            WHEN u.last_seen IS NULL AND u.last_login IS NOT NULL AND u.last_login > NOW() - (${minutesThreshold} || ' minutes')::INTERVAL THEN true
            ELSE false
          END as is_online
        FROM users u
        WHERE u.tenant_id = ${tenantId}
          AND u.is_active = true
          AND (
            (u.last_seen IS NOT NULL AND u.last_seen > NOW() - (${minutesThreshold} || ' minutes')::INTERVAL)
            OR (u.last_seen IS NULL AND u.last_login IS NOT NULL AND u.last_login > NOW() - (${minutesThreshold} || ' minutes')::INTERVAL)
          )
        ORDER BY 
          CASE 
            WHEN u.last_seen IS NOT NULL THEN u.last_seen
            ELSE u.last_login
          END DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getActiveUsers error:', error);
      return [];
    }
  },

  // Get Financial Box - حساب الأرصدة من الفواتير
  getFinancialBox: async (tenantId) => {
    if (!tenantId) {
      return {
        try_balance: 0,
        usd_balance: 0,
        syp_balance: 0,
        sar_balance: 0,
        eur_balance: 0
      };
    }

    try {
      // حساب الأرصدة من الفواتير: الوارد يضيف والصادر ينقص
      const invoicesInResult = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TRY' THEN amount ELSE 0 END), 0) as try_in,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as usd_in,
          COALESCE(SUM(CASE WHEN currency = 'SYP' THEN amount ELSE 0 END), 0) as syp_in,
          COALESCE(SUM(CASE WHEN currency = 'SAR' THEN amount ELSE 0 END), 0) as sar_in,
          COALESCE(SUM(CASE WHEN currency = 'EUR' THEN amount ELSE 0 END), 0) as eur_in
        FROM invoices_in
        WHERE tenant_id = ${tenantId}
      `;

      const invoicesOutResult = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TRY' THEN amount ELSE 0 END), 0) as try_out,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as usd_out,
          COALESCE(SUM(CASE WHEN currency = 'SYP' THEN amount ELSE 0 END), 0) as syp_out,
          COALESCE(SUM(CASE WHEN currency = 'SAR' THEN amount ELSE 0 END), 0) as sar_out,
          COALESCE(SUM(CASE WHEN currency = 'EUR' THEN amount ELSE 0 END), 0) as eur_out
        FROM invoices_out
        WHERE tenant_id = ${tenantId}
      `;

      const inData = invoicesInResult[0] || {};
      const outData = invoicesOutResult[0] || {};

      // الوارد يضيف والصادر ينقص
      return {
        try_balance: parseFloat(inData.try_in || 0) - parseFloat(outData.try_out || 0),
        usd_balance: parseFloat(inData.usd_in || 0) - parseFloat(outData.usd_out || 0),
        syp_balance: parseFloat(inData.syp_in || 0) - parseFloat(outData.syp_out || 0),
        sar_balance: parseFloat(inData.sar_in || 0) - parseFloat(outData.sar_out || 0),
        eur_balance: parseFloat(inData.eur_in || 0) - parseFloat(outData.eur_out || 0)
      };
    } catch (error) {
      console.error('getFinancialBox error:', error);
      return {
        try_balance: 0,
        usd_balance: 0,
        syp_balance: 0,
        sar_balance: 0,
        eur_balance: 0
      };
    }
  },

  // ============================================
  // نظام صالة الإنترنت - Internet Cafe System
  // ============================================

  // أنواع الاشتراكات
  getSubscriptionTypes: (tenantId) => getByTenant('subscription_types', tenantId, { orderBy: { column: 'name', ascending: true } }),
  
  createSubscriptionType: async (data, tenantId) => {
    try {
      return await createRecord('subscription_types', data, tenantId);
    } catch (error) {
      console.error('createSubscriptionType error:', error);
      throw error;
    }
  },
  
  updateSubscriptionType: (id, data, tenantId) => updateRecord('subscription_types', id, data, tenantId),
  
  deleteSubscriptionType: (id, tenantId) => deleteRecord('subscription_types', id, tenantId),

  // المشتركين
  getSubscribers: (tenantId) => getByTenant('internet_cafe_subscribers', tenantId, { orderBy: { column: 'created_at', ascending: false } }),
  
  getSubscriber: async (id, tenantId) => {
    try {
      const result = await sql`SELECT * FROM internet_cafe_subscribers WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getSubscriber error:', error);
      return null;
    }
  },
  
  createSubscriber: async (data, tenantId) => {
    try {
      // توليد رقم مشترك فريد
      if (!data.subscriber_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM internet_cafe_subscribers WHERE tenant_id = ${tenantId}`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        data.subscriber_number = `SUB-${String(count).padStart(6, '0')}`;
      }
      return await createRecord('internet_cafe_subscribers', data, tenantId);
    } catch (error) {
      console.error('createSubscriber error:', error);
      throw error;
    }
  },
  
  updateSubscriber: (id, data, tenantId) => updateRecord('internet_cafe_subscribers', id, data, tenantId),
  
  deleteSubscriber: (id, tenantId) => deleteRecord('internet_cafe_subscribers', id, tenantId),

  // تجديد الاشتراك
  renewSubscription: async (subscriberId, additionalDays = 30, startFromToday = true, tenantId) => {
    try {
      const result = await sql`
        SELECT renew_subscription(${subscriberId}::UUID, ${additionalDays}, ${startFromToday}) as renewed
      `;
      if (result[0]?.renewed) {
        return await neonService.getSubscriber(subscriberId, tenantId);
      }
      throw new Error('Failed to renew subscription');
    } catch (error) {
      console.error('renewSubscription error:', error);
      throw error;
    }
  },

  // الجلسات
  getSessions: (tenantId) => getByTenant('internet_sessions', tenantId, { orderBy: { column: 'start_time', ascending: false } }),
  
  getSession: async (id, tenantId) => {
    try {
      const result = await sql`SELECT * FROM internet_sessions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getSession error:', error);
      return null;
    }
  },
  
  createSession: async (data, tenantId) => {
    try {
      // توليد رقم جلسة فريد
      if (!data.session_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM internet_sessions WHERE tenant_id = ${tenantId} AND DATE(created_at) = CURRENT_DATE`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        data.session_number = `SES-${today}-${String(count).padStart(4, '0')}`;
      }
      return await createRecord('internet_sessions', data, tenantId);
    } catch (error) {
      console.error('createSession error:', error);
      throw error;
    }
  },
  
  updateSession: (id, data, tenantId) => updateRecord('internet_sessions', id, data, tenantId),
  
  endSession: async (id, endTime, totalAmount, tenantId) => {
    try {
      const result = await sql`
        UPDATE internet_sessions
        SET 
          end_time = ${endTime},
          total_amount = ${totalAmount},
          duration_minutes = EXTRACT(EPOCH FROM (${endTime}::TIMESTAMPTZ - start_time)) / 60,
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0] || null;
    } catch (error) {
      console.error('endSession error:', error);
      throw error;
    }
  },
  
  deleteSession: (id, tenantId) => deleteRecord('internet_sessions', id, tenantId),

  // الأجهزة
  getDevices: (tenantId) => getByTenant('internet_cafe_devices', tenantId, { orderBy: { column: 'device_number', ascending: true } }),
  
  createDevice: async (data, tenantId) => {
    try {
      // توليد رقم جهاز فريد
      if (!data.device_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM internet_cafe_devices WHERE tenant_id = ${tenantId}`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        data.device_number = `DEV-${String(count).padStart(3, '0')}`;
      }
      return await createRecord('internet_cafe_devices', data, tenantId);
    } catch (error) {
      console.error('createDevice error:', error);
      throw error;
    }
  },
  
  updateDevice: (id, data, tenantId) => updateRecord('internet_cafe_devices', id, data, tenantId),
  
  deleteDevice: (id, tenantId) => deleteRecord('internet_cafe_devices', id, tenantId),

  // حركات الدائن/المدين
  getCreditDebitTransactions: (tenantId) => getByTenant('credit_debit_transactions', tenantId, { orderBy: { column: 'created_at', ascending: false } }),
  
  createCreditDebitTransaction: async (data, tenantId) => {
    try {
      return await createRecord('credit_debit_transactions', data, tenantId);
    } catch (error) {
      console.error('createCreditDebitTransaction error:', error);
      throw error;
    }
  },
  
  updateCreditDebitTransaction: (id, data, tenantId) => updateRecord('credit_debit_transactions', id, data, tenantId),
  
  markTransactionPaid: async (id, paidDate, tenantId) => {
    try {
      const result = await sql`
        UPDATE credit_debit_transactions
        SET is_paid = true, paid_date = ${paidDate}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0] || null;
    } catch (error) {
      console.error('markTransactionPaid error:', error);
      throw error;
    }
  },

  // التقارير - صالة الإنترنت
  getInternetCafeDailyReport: async (tenantId, date = null) => {
    try {
      // التحقق من وجود الجدول أولاً
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'internet_sessions'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        return {
          total_sessions: 0,
          total_minutes: 0,
          total_data_gb: 0,
          total_revenue: 0,
          avg_revenue_per_session: 0,
          active_subscribers: 0,
          active_devices: 0
        };
      }
      
      const reportDate = date || new Date().toISOString().split('T')[0];
      const result = await sql`
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration_minutes) as total_minutes,
          SUM(data_consumption_gb) as total_data_gb,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_revenue_per_session,
          COUNT(DISTINCT subscriber_id) FILTER (WHERE subscriber_id IS NOT NULL) as active_subscribers,
          COUNT(DISTINCT device_id) as active_devices
        FROM internet_sessions
        WHERE tenant_id = ${tenantId} AND DATE(start_time) = ${reportDate}
      `;
      return result[0] || {
        total_sessions: 0,
        total_minutes: 0,
        total_data_gb: 0,
        total_revenue: 0,
        avg_revenue_per_session: 0,
        active_subscribers: 0,
        active_devices: 0
      };
    } catch (error) {
      console.error('getInternetCafeDailyReport error:', error);
      return {
        total_sessions: 0,
        total_minutes: 0,
        total_data_gb: 0,
        total_revenue: 0,
        avg_revenue_per_session: 0,
        active_subscribers: 0,
        active_devices: 0
      };
    }
  },

  getDebtsReport: async (tenantId) => {
    if (!tenantId) return [];
    try {
      // التحقق من وجود view أولاً
      const viewExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = 'debts_report_view'
        ) as exists
      `;
      
      if (viewExists[0]?.exists) {
        const result = await sql`
          SELECT * FROM debts_report_view WHERE tenant_id = ${tenantId}::UUID
        `;
        return result || [];
      }
      
      // Fallback: حساب يدوي
      const result = await sql`
        SELECT 
          d.tenant_id,
          d.id as debt_id,
          d.entity_type,
          d.entity_id,
          CASE 
            WHEN d.entity_type = 'customer' THEN p.name
            WHEN d.entity_type = 'supplier' THEN p.name
            WHEN d.entity_type = 'employee' THEN e.name
            ELSE 'غير محدد'
          END as entity_name,
          d.amount as original_amount,
          d.amount - COALESCE(SUM(pay.amount), 0) as remaining_amount,
          COALESCE(SUM(pay.amount), 0) as paid_amount,
          d.status,
          d.created_at,
          d.due_date,
          CASE 
            WHEN d.amount - COALESCE(SUM(pay.amount), 0) <= 0 THEN 'paid'
            WHEN d.due_date < CURRENT_DATE AND d.amount - COALESCE(SUM(pay.amount), 0) > 0 THEN 'overdue'
            ELSE 'pending'
          END as payment_status
        FROM debts d
        LEFT JOIN payments pay ON pay.debt_id = d.id
        LEFT JOIN partners p ON (d.entity_type IN ('customer', 'supplier') AND p.id = d.entity_id)
        LEFT JOIN employees e ON (d.entity_type = 'employee' AND e.id = d.entity_id)
        WHERE d.tenant_id = ${tenantId}::UUID
        GROUP BY d.id, d.tenant_id, d.entity_type, d.entity_id, d.amount, d.status, d.created_at, d.due_date, p.name, e.name
      `;
      return result || [];
    } catch (error) {
      console.error('getDebtsReport error:', error);
      return [];
    }
  },

  // تحديث الصندوق المالي مع الديون
  getFinancialBoxWithDebts: async (tenantId) => {
    try {
      const financialBox = await neonService.getFinancialBox(tenantId);
      
      // التحقق من وجود الجدول أولاً
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'credit_debit_transactions'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        return {
          ...financialBox,
          debts_owed: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 },
          debts_due: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 }
        };
      }
      
      // حساب الديون المطلوبة من العملاء (دائن - لنا)
      const debtsOwedResult = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TRY' THEN amount ELSE 0 END), 0) as try_debts,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as usd_debts,
          COALESCE(SUM(CASE WHEN currency = 'SYP' THEN amount ELSE 0 END), 0) as syp_debts,
          COALESCE(SUM(CASE WHEN currency = 'SAR' THEN amount ELSE 0 END), 0) as sar_debts,
          COALESCE(SUM(CASE WHEN currency = 'EUR' THEN amount ELSE 0 END), 0) as eur_debts
        FROM credit_debit_transactions
        WHERE tenant_id = ${tenantId} 
          AND transaction_type = 'credit' 
          AND is_paid = false
      `;
      
      // حساب الديون المستحقة علينا (مدين - علينا)
      const debtsDueResult = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN currency = 'TRY' THEN amount ELSE 0 END), 0) as try_debts,
          COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as usd_debts,
          COALESCE(SUM(CASE WHEN currency = 'SYP' THEN amount ELSE 0 END), 0) as syp_debts,
          COALESCE(SUM(CASE WHEN currency = 'SAR' THEN amount ELSE 0 END), 0) as sar_debts,
          COALESCE(SUM(CASE WHEN currency = 'EUR' THEN amount ELSE 0 END), 0) as eur_debts
        FROM credit_debit_transactions
        WHERE tenant_id = ${tenantId} 
          AND transaction_type = 'debit' 
          AND is_paid = false
      `;
      
      const debtsOwed = debtsOwedResult[0] || {};
      const debtsDue = debtsDueResult[0] || {};
      
      return {
        ...financialBox,
        debts_owed: {
          try: parseFloat(debtsOwed.try_debts || 0),
          usd: parseFloat(debtsOwed.usd_debts || 0),
          syp: parseFloat(debtsOwed.syp_debts || 0),
          sar: parseFloat(debtsOwed.sar_debts || 0),
          eur: parseFloat(debtsOwed.eur_debts || 0)
        },
        debts_due: {
          try: parseFloat(debtsDue.try_debts || 0),
          usd: parseFloat(debtsDue.usd_debts || 0),
          syp: parseFloat(debtsDue.syp_debts || 0),
          sar: parseFloat(debtsDue.sar_debts || 0),
          eur: parseFloat(debtsDue.eur_debts || 0)
        }
      };
    } catch (error) {
      console.error('getFinancialBoxWithDebts error:', error);
      const financialBox = await neonService.getFinancialBox(tenantId);
      return {
        ...financialBox,
        debts_owed: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 },
        debts_due: { try: 0, usd: 0, syp: 0, sar: 0, eur: 0 }
      };
    }
  },

  // ============================================
  // نظام متجر إكسسوارات الجوال - Mobile Accessories Store
  // ============================================

  // المنتجات
  getProducts: (tenantId) => getByTenant('products', tenantId, { orderBy: { column: 'name', ascending: true } }),
  
  getProduct: async (id, tenantId) => {
    try {
      const result = await sql`SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getProduct error:', error);
      return null;
    }
  },
  
  createProduct: async (data, tenantId) => {
    try {
      return await createRecord('products', data, tenantId);
    } catch (error) {
      console.error('createProduct error:', error);
      throw error;
    }
  },
  
  updateProduct: (id, data, tenantId) => updateRecord('products', id, data, tenantId),
  
  deleteProduct: (id, tenantId) => deleteRecord('products', id, tenantId),

  // فواتير المبيعات
  getSalesInvoices: (tenantId) => getByTenant('sales_invoices', tenantId, { orderBy: { column: 'date', ascending: false } }),
  
  getSalesInvoice: async (id, tenantId) => {
    try {
      const result = await sql`SELECT * FROM sales_invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('getSalesInvoice error:', error);
      return null;
    }
  },
  
  createSalesInvoice: async (data, items = [], tenantId) => {
    try {
      // توليد رقم فاتورة
      if (!data.invoice_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM sales_invoices WHERE tenant_id = ${tenantId} AND DATE(created_at) = CURRENT_DATE`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        data.invoice_number = `SAL-${today}-${String(count).padStart(4, '0')}`;
      }
      
      const invoice = await createRecord('sales_invoices', data, tenantId);
      
      // حفظ العناصر
      if (items && items.length > 0 && invoice?.id) {
        for (const item of items) {
          await sql`
            INSERT INTO sales_invoice_items (invoice_id, product_id, inventory_item_id, sku, name, quantity, unit_price, tax_rate, tax_amount, discount_rate, discount_amount, total_price, currency)
            VALUES (${invoice.id}, ${item.product_id || null}, ${item.inventory_item_id || null}, ${item.sku || ''}, ${item.name || ''}, ${item.quantity}, ${item.unit_price || 0}, ${item.tax_rate || 0}, ${item.tax_amount || 0}, ${item.discount_rate || 0}, ${item.discount_amount || 0}, ${item.total_price || 0}, ${item.currency || 'TRY'})
          `;
        }
      }
      
      return invoice;
    } catch (error) {
      console.error('createSalesInvoice error:', error);
      throw error;
    }
  },
  
  updateSalesInvoice: (id, data, tenantId) => updateRecord('sales_invoices', id, data, tenantId),
  
  deleteSalesInvoice: (id, tenantId) => deleteRecord('sales_invoices', id, tenantId),

  // فواتير المشتريات
  getPurchaseInvoices: (tenantId) => getByTenant('purchase_invoices', tenantId, { orderBy: { column: 'date', ascending: false } }),
  
  createPurchaseInvoice: async (data, items = [], tenantId) => {
    try {
      // توليد رقم فاتورة
      if (!data.invoice_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM purchase_invoices WHERE tenant_id = ${tenantId} AND DATE(created_at) = CURRENT_DATE`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        data.invoice_number = `PUR-${today}-${String(count).padStart(4, '0')}`;
      }
      
      const invoice = await createRecord('purchase_invoices', data, tenantId);
      
      // حفظ العناصر
      if (items && items.length > 0 && invoice?.id) {
        for (const item of items) {
          await sql`
            INSERT INTO purchase_invoice_items (invoice_id, product_id, sku, name, quantity, unit_cost, total_cost, currency, notes)
            VALUES (${invoice.id}, ${item.product_id || null}, ${item.sku || ''}, ${item.name || ''}, ${item.quantity}, ${item.unit_cost || 0}, ${item.total_cost || 0}, ${item.currency || 'TRY'}, ${item.notes || ''})
          `;
        }
      }
      
      return invoice;
    } catch (error) {
      console.error('createPurchaseInvoice error:', error);
      throw error;
    }
  },
  
  updatePurchaseInvoice: (id, data, tenantId) => updateRecord('purchase_invoices', id, data, tenantId),
  
  deletePurchaseInvoice: (id, tenantId) => deleteRecord('purchase_invoices', id, tenantId),

  // الحزم
  getProductBundles: (tenantId) => getByTenant('product_bundles', tenantId, { orderBy: { column: 'name', ascending: true } }),
  
  createProductBundle: async (data, items = [], tenantId) => {
    try {
      const bundle = await createRecord('product_bundles', data, tenantId);
      
      // حفظ عناصر الحزمة
      if (items && items.length > 0 && bundle?.id) {
        for (const item of items) {
          await sql`
            INSERT INTO bundle_items (bundle_id, product_id, quantity)
            VALUES (${bundle.id}, ${item.product_id}, ${item.quantity || 1})
          `;
        }
      }
      
      return bundle;
    } catch (error) {
      console.error('createProductBundle error:', error);
      throw error;
    }
  },
  
  updateProductBundle: (id, data, tenantId) => updateRecord('product_bundles', id, data, tenantId),
  
  deleteProductBundle: (id, tenantId) => deleteRecord('product_bundles', id, tenantId),

  // حركات المستودع
  getInventoryMovements: (tenantId) => getByTenant('inventory_movements', tenantId, { orderBy: { column: 'date', ascending: false } }),
  
  createInventoryMovement: async (data, items = [], tenantId) => {
    try {
      // توليد رقم حركة
      if (!data.movement_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM inventory_movements WHERE tenant_id = ${tenantId} AND DATE(created_at) = CURRENT_DATE`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        data.movement_number = `MOV-${today}-${String(count).padStart(4, '0')}`;
      }
      
      const movement = await createRecord('inventory_movements', data, tenantId);
      
      // حفظ العناصر
      if (items && items.length > 0 && movement?.id) {
        for (const item of items) {
          await sql`
            INSERT INTO inventory_movement_items (movement_id, product_id, inventory_item_id, sku, name, quantity, unit_price, total_price, currency, notes)
            VALUES (${movement.id}, ${item.product_id || null}, ${item.inventory_item_id || null}, ${item.sku || ''}, ${item.name || ''}, ${item.quantity}, ${item.unit_price || 0}, ${item.total_price || 0}, ${item.currency || 'TRY'}, ${item.notes || ''})
          `;
        }
      }
      
      return movement;
    } catch (error) {
      console.error('createInventoryMovement error:', error);
      throw error;
    }
  },

  // المرتجعات
  getReturns: (tenantId) => getByTenant('returns', tenantId, { orderBy: { column: 'date', ascending: false } }),
  
  createReturn: async (data, items = [], tenantId) => {
    try {
      // توليد رقم مرتجع
      if (!data.return_number) {
        const countResult = await sql`SELECT COUNT(*) as count FROM returns WHERE tenant_id = ${tenantId} AND DATE(created_at) = CURRENT_DATE`;
        const count = parseInt(countResult[0]?.count || 0) + 1;
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        data.return_number = `RET-${today}-${String(count).padStart(4, '0')}`;
      }
      
      const returnRecord = await createRecord('returns', data, tenantId);
      
      // حفظ العناصر
      if (items && items.length > 0 && returnRecord?.id) {
        for (const item of items) {
          await sql`
            INSERT INTO return_items (return_id, product_id, quantity, unit_price, total_price, condition, notes)
            VALUES (${returnRecord.id}, ${item.product_id || null}, ${item.quantity}, ${item.unit_price || 0}, ${item.total_price || 0}, ${item.condition || 'new'}, ${item.notes || ''})
          `;
        }
      }
      
      return returnRecord;
    } catch (error) {
      console.error('createReturn error:', error);
      throw error;
    }
  },

  // التقارير - Top Sellers
  getTopSellingProducts: async (tenantId, limit = 10) => {
    try {
      const result = await sql`
        SELECT * FROM top_selling_products_view
        WHERE tenant_id = ${tenantId}
        ORDER BY total_revenue DESC
        LIMIT ${limit}
      `;
      return result || [];
    } catch (error) {
      console.error('getTopSellingProducts error:', error);
      return [];
    }
  },

  // التقارير - أعمار المخزون
  getInventoryAge: async (tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM inventory_age_view
        WHERE tenant_id = ${tenantId}
        ORDER BY days_in_stock DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getInventoryAge error:', error);
      return [];
    }
  },

  // Function لإنشاء جلسة إنترنت من حزمة
  createSessionFromBundle: async (bundleId, subscriberId, deviceId, tenantId, userId) => {
    try {
      const result = await sql`
        SELECT create_internet_session_from_bundle(
          ${bundleId}::UUID,
          ${subscriberId}::UUID,
          ${deviceId}::UUID,
          ${tenantId}::UUID,
          ${userId}::UUID
        ) as session_id
      `;
      return result[0]?.session_id || null;
    } catch (error) {
      console.error('createSessionFromBundle error:', error);
      throw error;
    }
  },

  // التحقق من صلاحية المستخدم والوصول
  checkUserAccess: async (userId) => {
    if (!userId) {
      return { allowed: false, reason: 'user_not_found' };
    }
    
    try {
      // استخدام التحقق اليدوي فقط لتجنب الأخطاء
      // لا نحاول استدعاء الدالة من قاعدة البيانات
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
      const user = userResult[0];
      
      if (!user) {
        return { allowed: false, reason: 'user_not_found' };
      }
      
      if (user.is_super_admin) {
        return { allowed: true, reason: 'super_admin' };
      }
      
      if (!user.is_active) {
        return { allowed: false, reason: 'user_inactive' };
      }
      
      if (user.tenant_id) {
        const tenantResult = await sql`SELECT * FROM tenants WHERE id = ${user.tenant_id} LIMIT 1`;
        const tenant = tenantResult[0];
        
        if (tenant) {
          if (tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) < new Date()) {
            return { 
              allowed: false, 
              reason: 'subscription_expired',
              expires_at: tenant.subscription_expires_at,
              suspended: tenant.data_suspended || false
            };
          }
          
          if (tenant.data_suspended) {
            return { 
              allowed: false, 
              reason: 'data_suspended',
              suspension_date: tenant.suspension_date
            };
          }
        }
      }
      
      return { allowed: true, reason: 'valid' };
    } catch (error) {
      console.error('checkUserAccess error:', error);
      // في حالة الخطأ، نسمح بالوصول لتجنب حجب المستخدمين
      return { allowed: true, reason: 'error_fallback' };
    }
  },

  // ========== نظام المراسلة ==========
  
  // إرسال رسالة
  sendMessage: async (tenantId, senderId, receiverId, messageText) => {
    try {
      const result = await sql`
        INSERT INTO messages (tenant_id, sender_id, receiver_id, message_text)
        VALUES (${tenantId}, ${senderId}, ${receiverId}, ${messageText})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
  },

  // الحصول على المحادثات
  getUserConversations: async (userId, tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM get_user_conversations(${userId}::UUID, ${tenantId}::UUID)
      `;
      return result || [];
    } catch (error) {
      console.error('getUserConversations error:', error);
      // Fallback: استعلام يدوي
      try {
        const conversations = await sql`
          SELECT DISTINCT
            CASE 
              WHEN sender_id = ${userId} THEN receiver_id
              ELSE sender_id
            END as other_user_id,
            u.name as other_user_name,
            u.email as other_user_email,
            (u.role = 'Store Owner' OR u.role = 'store_owner')::BOOLEAN as is_store_owner
          FROM messages m
          JOIN users u ON u.id = CASE 
            WHEN m.sender_id = ${userId} THEN m.receiver_id
            ELSE m.sender_id
          END
          WHERE m.tenant_id = ${tenantId}
          AND (m.sender_id = ${userId} OR m.receiver_id = ${userId})
          ORDER BY other_user_name
        `;
        return conversations || [];
      } catch (fallbackError) {
        console.error('getUserConversations fallback error:', fallbackError);
        return [];
      }
    }
  },

  // الحصول على رسائل محادثة معينة
  getConversationMessages: async (userId, otherUserId, tenantId, limit = 50, offset = 0) => {
    try {
      const result = await sql`
        SELECT * FROM get_conversation_messages(
          ${userId}::UUID, 
          ${otherUserId}::UUID, 
          ${tenantId}::UUID,
          ${limit}::INTEGER,
          ${offset}::INTEGER
        )
        ORDER BY created_at ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getConversationMessages error:', error);
      // Fallback: استعلام يدوي
      try {
        const messages = await sql`
          SELECT 
            id,
            sender_id,
            receiver_id,
            message_text,
            is_read,
            created_at,
            (sender_id = ${userId})::BOOLEAN as is_sender
          FROM messages
          WHERE tenant_id = ${tenantId}
          AND (
            (sender_id = ${userId} AND receiver_id = ${otherUserId}) OR
            (sender_id = ${otherUserId} AND receiver_id = ${userId})
          )
          ORDER BY created_at ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        return messages || [];
      } catch (fallbackError) {
        console.error('getConversationMessages fallback error:', fallbackError);
        return [];
      }
    }
  },

  // تحديد الرسائل كمقروءة
  markMessagesAsRead: async (userId, otherUserId, tenantId) => {
    try {
      const result = await sql`
        SELECT mark_messages_as_read(
          ${userId}::UUID,
          ${otherUserId}::UUID,
          ${tenantId}::UUID
        ) as updated_count
      `;
      return result[0]?.updated_count || 0;
    } catch (error) {
      console.error('markMessagesAsRead error:', error);
      // Fallback: تحديث يدوي
      try {
        const result = await sql`
          UPDATE messages
          SET is_read = true, read_at = NOW()
          WHERE tenant_id = ${tenantId}
          AND receiver_id = ${userId}
          AND sender_id = ${otherUserId}
          AND is_read = false
          RETURNING id
        `;
        return result.length;
      } catch (fallbackError) {
        console.error('markMessagesAsRead fallback error:', fallbackError);
        return 0;
      }
    }
  },

  // الحصول على عدد الرسائل غير المقروءة
  getUnreadMessageCount: async (userId, tenantId) => {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM messages
        WHERE tenant_id = ${tenantId}
        AND receiver_id = ${userId}
        AND is_read = false
      `;
      return parseInt(result[0]?.count || 0);
    } catch (error) {
      console.error('getUnreadMessageCount error:', error);
      return 0;
    }
  },

  // حذف الرسائل القديمة (أكثر من 15 يوم)
  deleteOldMessages: async () => {
    try {
      // محاولة استخدام الدالة إذا كانت موجودة
      const funcExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'auto_delete_old_messages'
        ) as exists
      `;
      
      if (funcExists[0]?.exists) {
        const result = await sql`
          SELECT * FROM auto_delete_old_messages() as deleted_count
        `;
        return result[0]?.deleted_count || 0;
      }
      
      // Fallback: حذف يدوي
      const result = await sql`
        DELETE FROM messages
        WHERE created_at < NOW() - INTERVAL '15 days'
        RETURNING id
      `;
      return result.length;
    } catch (error) {
      console.error('deleteOldMessages error:', error);
      // Fallback: حذف يدوي
      try {
        const result = await sql`
          DELETE FROM messages
          WHERE created_at < NOW() - INTERVAL '15 days'
          RETURNING id
        `;
        return result.length;
      } catch (fallbackError) {
        console.error('deleteOldMessages fallback error:', fallbackError);
        return 0;
      }
    }
  },

  // الحصول على جميع المستخدمين في المتجر للمحادثة
  getTenantUsersForMessaging: async (tenantId, currentUserId) => {
    try {
      // محاولة استخدام الدالة إذا كانت موجودة
      const funcExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'get_tenant_users_for_messaging'
        ) as exists
      `;
      
      if (funcExists[0]?.exists) {
        const result = await sql`
          SELECT * FROM get_tenant_users_for_messaging(${tenantId}::UUID, ${currentUserId}::UUID)
        `;
        return result || [];
      }
      
      // Fallback: استعلام يدوي
      const result = await sql`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          (u.role = 'Store Owner' OR u.role = 'store_owner')::BOOLEAN as is_store_owner,
          EXISTS(
            SELECT 1 FROM messages m
            WHERE m.tenant_id = ${tenantId}
            AND ((m.sender_id = ${currentUserId} AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ${currentUserId}))
          ) as has_conversation,
          (
            SELECT m.message_text
            FROM messages m
            WHERE m.tenant_id = ${tenantId}
            AND ((m.sender_id = ${currentUserId} AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ${currentUserId}))
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_text,
          (
            SELECT m.created_at
            FROM messages m
            WHERE m.tenant_id = ${tenantId}
            AND ((m.sender_id = ${currentUserId} AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ${currentUserId}))
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_time,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.tenant_id = ${tenantId}
            AND m.sender_id = u.id
            AND m.receiver_id = ${currentUserId}
            AND m.is_read = false
          )::BIGINT as unread_count
        FROM users u
        WHERE u.tenant_id = ${tenantId}
        AND u.id != ${currentUserId}
        AND u.is_active = true
        ORDER BY 
          has_conversation DESC,
          last_message_time DESC NULLS LAST,
          u.name
      `;
      return result || [];
    } catch (error) {
      console.error('getTenantUsersForMessaging error:', error);
      return [];
    }
  },

  // معالجة المتاجر المنتهية الصلاحية (للاستدعاء من Admin Panel)
  processExpiredTenants: async () => {
    try {
      const result = await sql`
        SELECT * FROM process_expired_tenants() as result
      `;
      return result[0]?.result || { processed_count: 0, suspended_count: 0, deleted_count: 0 };
    } catch (error) {
      console.error('processExpiredTenants error:', error);
      return { processed_count: 0, suspended_count: 0, deleted_count: 0 };
    }
  },

  // ========== نظام اليومية المحاسبية ==========
  
  // إنشاء قيد يومية
  createJournalEntry: async (data, tenantId) => {
    try {
      const result = await sql`
        INSERT INTO journal_entries (tenant_id, entry_date, entry_number, description, reference_type, reference_id, total_amount, currency, created_by)
        VALUES (${tenantId}, ${data.entry_date}, ${data.entry_number}, ${data.description}, ${data.reference_type || null}, ${data.reference_id || null}, ${data.total_amount || 0}, ${data.currency || 'TRY'}, ${data.created_by})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createJournalEntry error:', error);
      throw error;
    }
  },

  // إنشاء قيد في اليومية
  createJournalLine: async (data, tenantId) => {
    try {
      const result = await sql`
        INSERT INTO journal_lines (journal_entry_id, tenant_id, account_type, account_name, account_id, debit_amount, credit_amount, currency, description)
        VALUES (${data.journal_entry_id}, ${tenantId}, ${data.account_type}, ${data.account_name}, ${data.account_id || null}, ${data.debit_amount || 0}, ${data.credit_amount || 0}, ${data.currency || 'TRY'}, ${data.description || null})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createJournalLine error:', error);
      throw error;
    }
  },

  // الحصول على قيود اليومية
  getJournalEntries: async (tenantId, startDate, endDate) => {
    try {
      let query = sql`
        SELECT je.*, 
               COUNT(jl.id) as lines_count,
               u.name as created_by_name
        FROM journal_entries je
        LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
        LEFT JOIN users u ON u.id = je.created_by
        WHERE je.tenant_id = ${tenantId}
      `;
      
      if (startDate) {
        query = sql`${query} AND je.entry_date >= ${startDate}`;
      }
      if (endDate) {
        query = sql`${query} AND je.entry_date <= ${endDate}`;
      }
      
      query = sql`${query} GROUP BY je.id, u.name ORDER BY je.entry_date DESC, je.created_at DESC`;
      
      const result = await query;
      return result || [];
    } catch (error) {
      console.error('getJournalEntries error:', error);
      return [];
    }
  },

  // الحصول على قيود قيد معين
  getJournalLines: async (entryId, tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM journal_lines
        WHERE journal_entry_id = ${entryId} AND tenant_id = ${tenantId}
        ORDER BY debit_amount DESC, credit_amount DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getJournalLines error:', error);
      return [];
    }
  },

  // عدد القيود للسنة
  getJournalEntryCount: async (tenantId, year) => {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM journal_entries
        WHERE tenant_id = ${tenantId} AND EXTRACT(YEAR FROM entry_date) = ${year}
      `;
      return parseInt(result[0]?.count || 0);
    } catch (error) {
      console.error('getJournalEntryCount error:', error);
      return 0;
    }
  },

  // ========== إدارة الذمم ==========

  // الحصول على رصيد شريك
  getAccountBalance: async (partnerId, accountType, currency, tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM account_balances
        WHERE partner_id = ${partnerId} 
          AND account_type = ${accountType} 
          AND currency = ${currency}
          AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      return result[0] || null;
    } catch (error) {
      console.error('getAccountBalance error:', error);
      return null;
    }
  },

  // إنشاء معاملة ذمم
  createAccountTransaction: async (data, tenantId) => {
    try {
      const result = await sql`
        INSERT INTO account_transactions (tenant_id, partner_id, transaction_type, reference_type, reference_id, amount, currency, balance_before, balance_after, description, created_by)
        VALUES (${tenantId}, ${data.partner_id}, ${data.transaction_type}, ${data.reference_type || null}, ${data.reference_id || null}, ${data.amount}, ${data.currency || 'TRY'}, ${data.balance_before || 0}, ${data.balance_after || 0}, ${data.description || null}, ${data.created_by})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createAccountTransaction error:', error);
      throw error;
    }
  },

  // الحصول على معاملات شريك
  getPartnerTransactions: async (partnerId, tenantId, limit = 100) => {
    try {
      const result = await sql`
        SELECT * FROM account_transactions
        WHERE partner_id = ${partnerId} AND tenant_id = ${tenantId}
        ORDER BY transaction_date DESC
        LIMIT ${limit}
      `;
      return result || [];
    } catch (error) {
      console.error('getPartnerTransactions error:', error);
      return [];
    }
  },

  // ========== إدارة المخزون ==========

  // الحصول على منتج مخزون
  getInventoryItem: async (itemId, tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM inventory_items
        WHERE id = ${itemId} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      return result[0] || null;
    } catch (error) {
      console.error('getInventoryItem error:', error);
      return null;
    }
  },

  // إنشاء معاملة مخزون
  createInventoryTransaction: async (data, tenantId) => {
    try {
      const result = await sql`
        INSERT INTO inventory_transactions (tenant_id, inventory_item_id, transaction_type, reference_type, reference_id, quantity_change, quantity_before, quantity_after, unit_price, currency, description, created_by)
        VALUES (${tenantId}, ${data.inventory_item_id}, ${data.transaction_type}, ${data.reference_type || null}, ${data.reference_id || null}, ${data.quantity_change}, ${data.quantity_before || 0}, ${data.quantity_after || 0}, ${data.unit_price || 0}, ${data.currency || 'TRY'}, ${data.description || null}, ${data.created_by})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createInventoryTransaction error:', error);
      throw error;
    }
  },

  // الحصول على معاملات مخزون
  getInventoryTransactions: async (itemId, tenantId, limit = 100) => {
    try {
      const result = await sql`
        SELECT * FROM inventory_transactions
        WHERE inventory_item_id = ${itemId} AND tenant_id = ${tenantId}
        ORDER BY transaction_date DESC
        LIMIT ${limit}
      `;
      return result || [];
    } catch (error) {
      console.error('getInventoryTransactions error:', error);
      return [];
    }
  },

  // ========== ربط BOQ بالمخزون ==========

  // ربط عنصر مشروع بعنصر مخزون
  linkProjectItemToInventory: async (projectItemId, inventoryItemId, tenantId) => {
    try {
      const result = await sql`
        SELECT link_project_item_to_inventory(
          ${projectItemId}::UUID,
          ${inventoryItemId}::UUID,
          ${tenantId}::UUID
        ) as success
      `;
      return result[0]?.success || false;
    } catch (error) {
      console.error('linkProjectItemToInventory error:', error);
      throw error;
    }
  },

  // خصم المواد من المخزون عند استخدامها في المشروع
  deductInventoryFromBOQ: async (projectItemId, quantity, tenantId, userId) => {
    try {
      const result = await sql`
        SELECT deduct_inventory_from_boq(
          ${projectItemId}::UUID,
          ${quantity}::NUMERIC,
          ${tenantId}::UUID,
          ${userId}::UUID
        ) as result
      `;
      return result[0]?.result || { success: false, error: 'فشل العملية' };
    } catch (error) {
      console.error('deductInventoryFromBOQ error:', error);
      throw error;
    }
  },

  // إرجاع المواد إلى المخزون
  returnInventoryFromBOQ: async (projectItemId, quantity, tenantId, userId) => {
    try {
      const result = await sql`
        SELECT return_inventory_from_boq(
          ${projectItemId}::UUID,
          ${quantity}::NUMERIC,
          ${tenantId}::UUID,
          ${userId}::UUID
        ) as result
      `;
      return result[0]?.result || { success: false, error: 'فشل العملية' };
    } catch (error) {
      console.error('returnInventoryFromBOQ error:', error);
      throw error;
    }
  },

  // ========== خصومات الموظفين ==========

  // إنشاء خصم دوري
  createEmployeeDeduction: async (data, tenantId) => {
    try {
      const result = await sql`
        INSERT INTO employee_deductions (tenant_id, employee_id, deduction_type, description, total_amount, remaining_amount, monthly_deduction, currency, start_date, end_date, is_active)
        VALUES (${tenantId}, ${data.employee_id}, ${data.deduction_type}, ${data.description}, ${data.total_amount}, ${data.total_amount}, ${data.monthly_deduction}, ${data.currency || 'TRY'}, ${data.start_date}, ${data.end_date || null}, ${data.is_active !== false})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createEmployeeDeduction error:', error);
      throw error;
    }
  },

  // الحصول على خصومات موظف
  getEmployeeDeductions: async (employeeId, tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM employee_deductions
        WHERE employee_id = ${employeeId} AND tenant_id = ${tenantId}
        ORDER BY start_date DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getEmployeeDeductions error:', error);
      return [];
    }
  },

  // تحديث خصم دوري (بعد خصم شهري)
  updateEmployeeDeduction: async (deductionId, remainingAmount, tenantId) => {
    try {
      const result = await sql`
        UPDATE employee_deductions
        SET remaining_amount = ${remainingAmount},
            is_active = ${remainingAmount > 0},
            updated_at = NOW()
        WHERE id = ${deductionId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateEmployeeDeduction error:', error);
      throw error;
    }
  },

  // ========== التقارير المتقدمة ==========

  // تقرير المشاريع الشامل
  getProjectComprehensiveReport: async (tenantId, startDate = null, endDate = null, status = null) => {
    try {
      const result = await sql`
        SELECT * FROM get_project_comprehensive_report(
          ${tenantId}::UUID,
          ${startDate || null}::DATE,
          ${endDate || null}::DATE,
          ${status || null}::TEXT
        )
      `;
      return result || [];
    } catch (error) {
      console.error('getProjectComprehensiveReport error:', error);
      return [];
    }
  },

  // تقرير العملاء الشامل
  getCustomerComprehensiveReport: async (tenantId, startDate = null, endDate = null) => {
    try {
      const result = await sql`
        SELECT * FROM get_customer_comprehensive_report(
          ${tenantId}::UUID,
          ${startDate || null}::DATE,
          ${endDate || null}::DATE
        )
      `;
      return result || [];
    } catch (error) {
      console.error('getCustomerComprehensiveReport error:', error);
      return [];
    }
  },

  // تقرير الموردين الشامل
  getVendorComprehensiveReport: async (tenantId, startDate = null, endDate = null) => {
    try {
      const result = await sql`
        SELECT * FROM get_vendor_comprehensive_report(
          ${tenantId}::UUID,
          ${startDate || null}::DATE,
          ${endDate || null}::DATE
        )
      `;
      return result || [];
    } catch (error) {
      console.error('getVendorComprehensiveReport error:', error);
      return [];
    }
  },

  // تقرير المبيعات الشهري
  getMonthlySalesReport: async (tenantId, year, month = null) => {
    try {
      const result = await sql`
        SELECT * FROM get_monthly_sales_report(
          ${tenantId}::UUID,
          ${year}::INTEGER,
          ${month || null}::INTEGER
        )
      `;
      return result || [];
    } catch (error) {
      console.error('getMonthlySalesReport error:', error);
      return [];
    }
  },

  // تقرير المشتريات الشهري
  getMonthlyPurchasesReport: async (tenantId, year, month = null) => {
    try {
      const result = await sql`
        SELECT * FROM get_monthly_purchases_report(
          ${tenantId}::UUID,
          ${year}::INTEGER,
          ${month || null}::INTEGER
        )
      `;
      return result || [];
    } catch (error) {
      console.error('getMonthlyPurchasesReport error:', error);
      return [];
    }
  },

  // تقرير المخزون الشامل
  getInventoryComprehensiveReport: async (tenantId) => {
    try {
      const result = await sql`
        SELECT * FROM get_inventory_comprehensive_report(${tenantId}::UUID)
      `;
      return result || [];
    } catch (error) {
      console.error('getInventoryComprehensiveReport error:', error);
      return [];
    }
  },

  // ========== نظام JWT + Refresh Tokens ==========

  // إنشاء Refresh Token
  createRefreshToken: async (userId, tenantId, tokenHash, deviceInfo = null, ipAddress = null, expiresInDays = 30) => {
    try {
      const result = await sql`
        SELECT create_refresh_token(
          ${userId}::UUID,
          ${tenantId || null}::UUID,
          ${tokenHash}::TEXT,
          ${deviceInfo || null}::TEXT,
          ${ipAddress || null}::TEXT,
          ${expiresInDays}::INTEGER
        ) as token_id
      `;
      return result[0]?.token_id || null;
    } catch (error) {
      console.error('createRefreshToken error:', error);
      throw error;
    }
  },

  // التحقق من Refresh Token
  verifyRefreshToken: async (tokenHash) => {
    try {
      const result = await sql`
        SELECT * FROM verify_refresh_token(${tokenHash}::TEXT)
      `;
      return result[0] || null;
    } catch (error) {
      console.error('verifyRefreshToken error:', error);
      return null;
    }
  },

  // إلغاء Refresh Token
  revokeRefreshToken: async (tokenHash) => {
    try {
      const result = await sql`
        SELECT revoke_refresh_token(${tokenHash}::TEXT) as success
      `;
      return result[0]?.success || false;
    } catch (error) {
      console.error('revokeRefreshToken error:', error);
      return false;
    }
  },

  // إلغاء جميع Refresh Tokens لمستخدم
  revokeAllUserTokens: async (userId) => {
    try {
      const result = await sql`
        SELECT revoke_all_user_tokens(${userId}::UUID) as count
      `;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('revokeAllUserTokens error:', error);
      return 0;
    }
  },

  // تسجيل محاولة تسجيل دخول فاشلة
  logFailedLogin: async (email, ipAddress = null, userAgent = null) => {
    try {
      await sql`
        SELECT log_failed_login(
          ${email}::TEXT,
          ${ipAddress || null}::TEXT,
          ${userAgent || null}::TEXT
        )
      `;
      return true;
    } catch (error) {
      console.error('logFailedLogin error:', error);
      return false;
    }
  },

  // التحقق من حظر الحساب
  isAccountBlocked: async (email) => {
    try {
      const result = await sql`
        SELECT is_account_blocked(${email}::TEXT) as blocked
      `;
      return result[0]?.blocked || false;
    } catch (error) {
      console.error('isAccountBlocked error:', error);
      return false;
    }
  },

  // ========== نظام تنبيهات المخزون المتقدم ==========

  // الحصول على جميع التنبيهات
  getLowStockAlerts: async (tenantId) => {
    try {
      const result = await sql`
        SELECT la.*, ii.name, ii.quantity, ii.sku
        FROM inventory_low_stock_alerts la
        JOIN inventory_items ii ON la.inventory_item_id = ii.id
        WHERE la.tenant_id = ${tenantId}
        ORDER BY la.is_active DESC, la.created_at DESC
      `;
      return result || [];
    } catch (error) {
      console.error('getLowStockAlerts error:', error);
      return [];
    }
  },

  // إنشاء تنبيه مخزون
  createLowStockAlert: async (tenantId, data) => {
    try {
      const result = await sql`
        INSERT INTO inventory_low_stock_alerts (
          tenant_id, inventory_item_id, alert_threshold, is_active, notes, created_by
        ) VALUES (${tenantId}, ${data.inventory_item_id}, ${data.alert_threshold}, true, ${data.notes || null}, ${data.created_by || null})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createLowStockAlert error:', error);
      throw error;
    }
  },

  // تحديث تنبيه مخزون
  updateLowStockAlert: async (alertId, data, tenantId) => {
    try {
      const result = await sql`
        UPDATE inventory_low_stock_alerts
        SET alert_threshold = ${data.alert_threshold},
            is_active = ${data.is_active !== undefined ? data.is_active : true},
            notes = ${data.notes || null},
            updated_at = NOW()
        WHERE id = ${alertId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateLowStockAlert error:', error);
      throw error;
    }
  },

  // حذف تنبيه مخزون
  deleteLowStockAlert: async (alertId, tenantId) => {
    try {
      await sql`DELETE FROM inventory_low_stock_alerts WHERE id = ${alertId} AND tenant_id = ${tenantId}`;
      return true;
    } catch (error) {
      console.error('deleteLowStockAlert error:', error);
      throw error;
    }
  },

  // التحقق من التنبيهات المنخفضة
  checkLowStockAlerts: async (tenantId) => {
    try {
      const result = await sql`
        SELECT
            ila.id,
            ila.tenant_id,
            ila.inventory_item_id,
            ii.name,
            ii.quantity,
            ila.alert_threshold,
            CASE 
                WHEN ii.quantity <= ila.alert_threshold THEN 'ALERT'
                WHEN ii.quantity <= (ila.alert_threshold * 1.5) THEN 'WARNING'
                ELSE 'OK'
            END as status
        FROM inventory_low_stock_alerts ila
        JOIN inventory_items ii ON ila.inventory_item_id = ii.id
        WHERE ila.tenant_id = ${tenantId} AND ila.is_active = true
        ORDER BY ii.quantity ASC
      `;
      return result || [];
    } catch (error) {
      console.error('checkLowStockAlerts error:', error);
      return [];
    }
  },

  // ========== نظام إدارة عدادات الحروقات ==========

  // التحقق من دعم المتجر للحروقات
  checkStoreSupportsFuel: async (tenantId) => {
    try {
      const result = await sql`
        SELECT check_store_supports_fuel(${tenantId}::UUID) as supports_fuel
      `;
      return result[0]?.supports_fuel || false;
    } catch (error) {
      console.error('checkStoreSupportsFuel error:', error);
      // Fallback: التحقق المباشر من نوع المتجر
      try {
        const storeResult = await sql`
          SELECT st.code, st.features
          FROM tenants t
          JOIN store_types st ON t.store_type_id = st.id
          WHERE t.id = ${tenantId}
        `;
        if (storeResult && storeResult[0]) {
          const code = storeResult[0].code || '';
          const features = storeResult[0].features || {};
          return code.toLowerCase().includes('fuel') || 
                 features.fuel_management === true ||
                 code.toLowerCase().includes('station');
        }
      } catch (fallbackError) {
        console.error('checkStoreSupportsFuel fallback error:', fallbackError);
      }
      return false;
    }
  },

  // الحصول على جميع العدادات
  getFuelCounters: async (tenantId) => {
    try {
      // تحقق أولاً من دعم المتجر
      const supportsFuel = await neonService.checkStoreSupportsFuel(tenantId);
      if (!supportsFuel) {
        return [];
      }

      const result = await sql`
        SELECT *
        FROM fuel_counters
        WHERE tenant_id = ${tenantId}
        ORDER BY counter_number ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getFuelCounters error:', error);
      return [];
    }
  },

  // الحصول على عداد واحد
  getFuelCounter: async (counterId, tenantId) => {
    try {
      const result = await sql`
        SELECT *
        FROM fuel_counters
        WHERE id = ${counterId} AND tenant_id = ${tenantId}
      `;
      return result[0] || null;
    } catch (error) {
      console.error('getFuelCounter error:', error);
      return null;
    }
  },

  // إنشاء عداد حروقات
  createFuelCounter: async (tenantId, data) => {
    try {
      // تحقق من دعم المتجر
      const supportsFuel = await neonService.checkStoreSupportsFuel(tenantId);
      if (!supportsFuel) {
        throw new Error('هذا المتجر لا يدعم نظام الحروقات. يرجى اختيار متجر يدعم الحروقات.');
      }

      // التحقق من عدم تجاوز 6 عدادات
      const countersCount = await sql`
        SELECT COUNT(*) as count FROM fuel_counters WHERE tenant_id = ${tenantId}
      `;
      
      if (parseInt(countersCount[0]?.count || 0) >= 6) {
        throw new Error('لا يمكن إضافة أكثر من 6 عدادات لكل متجر');
      }

      // التحقق من عدم تكرار رقم العداد
      const existingCounter = await sql`
        SELECT id FROM fuel_counters 
        WHERE tenant_id = ${tenantId} AND counter_number = ${data.counter_number}
      `;
      
      if (existingCounter && existingCounter.length > 0) {
        throw new Error('رقم العداد موجود بالفعل. يرجى اختيار رقم مختلف.');
      }

      const result = await sql`
        INSERT INTO fuel_counters (
          tenant_id, counter_name, counter_number, selling_price_per_liter,
          current_reading, initial_reading, total_sold, is_active
        ) VALUES (
          ${tenantId}, ${data.counter_name}, ${data.counter_number},
          ${data.selling_price_per_liter || 0}, ${data.current_reading || 0},
          ${data.initial_reading || 0}, 0, true
        )
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('createFuelCounter error:', error);
      throw error;
    }
  },

  // تحديث عداد حروقات
  updateFuelCounter: async (counterId, data, tenantId) => {
    try {
      const result = await sql`
        UPDATE fuel_counters
        SET counter_name = ${data.counter_name || null},
            selling_price_per_liter = ${data.selling_price_per_liter !== undefined ? data.selling_price_per_liter : null},
            is_active = ${data.is_active !== undefined ? data.is_active : null},
            updated_at = NOW()
        WHERE id = ${counterId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateFuelCounter error:', error);
      throw error;
    }
  },

  // حذف عداد حروقات
  deleteFuelCounter: async (counterId, tenantId) => {
    try {
      await sql`DELETE FROM fuel_counters WHERE id = ${counterId} AND tenant_id = ${tenantId}`;
      return true;
    } catch (error) {
      console.error('deleteFuelCounter error:', error);
      throw error;
    }
  },

  // ========== نظام حركات عدادات الحروقات ==========

  // الحصول على حركات العداد
  getFuelCounterMovements: async (tenantId, counterId = null) => {
    try {
      let query = `
        SELECT fcm.*, fc.counter_name, fc.selling_price_per_liter
        FROM fuel_counter_movements fcm
        JOIN fuel_counters fc ON fcm.fuel_counter_id = fc.id
        WHERE fcm.tenant_id = ${tenantId}
      `;
      
      if (counterId) {
        query += ` AND fcm.fuel_counter_id = ${counterId}`;
      }
      
      query += ` ORDER BY fcm.recorded_at DESC`;
      
      const result = await sql(query);
      return result || [];
    } catch (error) {
      console.error('getFuelCounterMovements error:', error);
      return [];
    }
  },

  // تسجيل حركة عداد
  recordFuelCounterMovement: async (tenantId, data) => {
    try {
      const result = await sql`
        SELECT record_fuel_counter_movement(
          ${tenantId}::UUID,
          ${data.counter_id}::UUID,
          ${data.reading_after}::NUMERIC,
          ${data.price_per_liter}::NUMERIC,
          ${data.invoice_id || null}::UUID,
          ${data.notes || null}::TEXT
        ) as movement_id
      `;
      return result[0]?.movement_id || null;
    } catch (error) {
      console.error('recordFuelCounterMovement error:', error);
      throw error;
    }
  },

  // ========== نظام السجلات اليومية للحروقات ==========

  // الحصول على السجلات اليومية
  getFuelDailyLogs: async (tenantId, counterId = null, dateFrom = null, dateTo = null) => {
    try {
      let query = `
        SELECT fdl.*, fc.counter_name
        FROM fuel_daily_log fdl
        JOIN fuel_counters fc ON fdl.fuel_counter_id = fc.id
        WHERE fdl.tenant_id = ${tenantId}
      `;
      
      if (counterId) {
        query += ` AND fdl.fuel_counter_id = ${counterId}`;
      }
      
      if (dateFrom) {
        query += ` AND fdl.log_date >= '${dateFrom}'`;
      }
      
      if (dateTo) {
        query += ` AND fdl.log_date <= '${dateTo}'`;
      }
      
      query += ` ORDER BY fdl.log_date DESC, fdl.fuel_counter_id ASC`;
      
      const result = await sql(query);
      return result || [];
    } catch (error) {
      console.error('getFuelDailyLogs error:', error);
      return [];
    }
  },

  // إنشاء سجل يومي
  createFuelDailyLog: async (tenantId, counterId, logDate) => {
    try {
      const result = await sql`
        SELECT create_daily_fuel_log(
          ${tenantId}::UUID,
          ${counterId}::UUID,
          ${logDate}::DATE
        ) as log_id
      `;
      return result[0]?.log_id || null;
    } catch (error) {
      console.error('createFuelDailyLog error:', error);
      throw error;
    }
  },

  // ========== دالة حساب ملخص عدادات الحروقات ==========

  // الحصول على ملخص العدادات
  getFuelCountersSummary: async (tenantId) => {
    try {
      const result = await sql`
        SELECT 
          fc.id,
          fc.counter_name,
          fc.counter_number,
          fc.current_reading,
          fc.initial_reading,
          fc.total_sold,
          fc.selling_price_per_liter,
          COALESCE(SUM(fcm.quantity_sold), 0) as calculated_total_sold,
          fc.initial_reading - COALESCE(SUM(fcm.quantity_sold), 0) as remaining,
          COALESCE(SUM(fcm.total_amount), 0) as total_revenue,
          COUNT(DISTINCT DATE(fcm.recorded_at)) as days_active
        FROM fuel_counters fc
        LEFT JOIN fuel_counter_movements fcm ON fc.id = fcm.fuel_counter_id
        WHERE fc.tenant_id = ${tenantId}
        GROUP BY fc.id, fc.counter_name, fc.counter_number, 
                 fc.current_reading, fc.initial_reading, fc.total_sold,
                 fc.selling_price_per_liter
        ORDER BY fc.counter_number ASC
      `;
      return result || [];
    } catch (error) {
      console.error('getFuelCountersSummary error:', error);
      return [];
    }
  },

  // ========== دالة تحديث فئة وحقل التغييرات ==========

  // تحديث المنتج مع الفئة والتغييرات
  updateInventoryWithCategory: async (itemId, data, tenantId) => {
    try {
      const result = await sql`
        UPDATE inventory_items
        SET name = ${data.name || null},
            product_code = ${data.product_code || null},
            category = ${data.category || null},
            quantity = ${data.quantity !== undefined ? data.quantity : null},
            price = ${data.price !== undefined ? data.price : null},
            updated_at = NOW()
        WHERE id = ${itemId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateInventoryWithCategory error:', error);
      throw error;
    }
  },

  // تحديث الفاتورة الصادرة مع الفئة
  updateInvoiceOutWithCategory: async (invoiceId, data, tenantId) => {
    try {
      const result = await sql`
        UPDATE invoices_out
        SET category = ${data.category || null},
            updated_at = NOW()
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateInvoiceOutWithCategory error:', error);
      throw error;
    }
  },

  // تحديث الفاتورة الواردة مع الفئة
  updateInvoiceInWithCategory: async (invoiceId, data, tenantId) => {
    try {
      const result = await sql`
        UPDATE invoices_in
        SET category = ${data.category || null},
            updated_at = NOW()
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('updateInvoiceInWithCategory error:', error);
      throw error;
    }
  },

  // الحصول على إحصائيات المخزون المتقدمة
  getInventoryStatistics: async (tenantId) => {
    try {
      const result = await sql`
        SELECT
          COUNT(*) as total_items,
          SUM(quantity) as total_quantity,
          SUM(quantity * price) as total_value,
          AVG(quantity) as avg_quantity,
          MIN(quantity) as min_quantity,
          MAX(quantity) as max_quantity,
          COUNT(CASE WHEN quantity <= 0 THEN 1 END) as out_of_stock_count,
          COUNT(DISTINCT category) as categories_count
        FROM inventory_items
        WHERE tenant_id = ${tenantId}
      `;
      return result[0] || {};
    } catch (error) {
      console.error('getInventoryStatistics error:', error);
      return {};
    }
  },

  // الحصول على المنتجات حسب الفئة
  getInventoryByCategory: async (tenantId, category = null) => {
    try {
      let query = `
        SELECT category, COUNT(*) as item_count, SUM(quantity) as total_quantity,
               SUM(quantity * price) as total_value
        FROM inventory_items
        WHERE tenant_id = ${tenantId}
      `;
      
      if (category) {
        query += ` AND category = ${category}`;
      }
      
      query += ` GROUP BY category ORDER BY category ASC`;
      
      const result = await sql(query);
      return result || [];
    } catch (error) {
      console.error('getInventoryByCategory error:', error);
      return [];
    }
  },
};
