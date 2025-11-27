import React, { createContext, useContext, useState, useEffect } from 'react';
import { neonService } from '@/lib/neonService';
import { toast } from '@/components/ui/use-toast';
import { ROLES } from '@/lib/constants';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // تحميل المستخدم من localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (storedUserId && storedEmail) {
          await fetchProfile({ id: storedUserId, email: storedEmail });
        } else {
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, []);

  const fetchProfile = async (userData) => {
    try {
      if (!userData) {
        setUser(null);
        setTenant(null);
        setLoading(false);
        setInitialized(true);
        return;
      }

      // Check if admin user first
      const adminEmails = ['admin@ibrahim.com'];
      const isAdminEmail = adminEmails.includes(userData.email?.toLowerCase());
      
      if (isAdminEmail) {
        const adminUser = await neonService.getUserByEmail(userData.email);
        if (adminUser) {
          setUser({ 
            ...adminUser, 
            role: ROLES.SUPER_ADMIN, 
            isSuperAdmin: true,
            name: adminUser.name || 'المشرف العام'
          });
          setLoading(false);
          setInitialized(true);
          return;
        }
      }

      // Get User Profile (includes tenant info)
      let profileResult = null;
      try {
        profileResult = await neonService.getUserProfile(userData.id);
      } catch (profileError) {
        console.warn('Profile fetch error (will continue):', profileError);
      }
      
      if (!profileResult) {
        setUser({
          ...userData,
          name: userData.name || userData.email?.split('@')[0] || 'مستخدم'
        });
        setTenant(null);
        setLoading(false);
        setInitialized(true);
        return;
      }

      const profile = profileResult;
      const tenantInfo = profile.tenant || null;

      if (profile) {
        const adminEmails = ['admin@ibrahim.com'];
        const isSuperAdmin = adminEmails.includes(profile.email?.toLowerCase()) || profile.role === ROLES.SUPER_ADMIN;
        
        const userData = {
          ...profile,
          isSuperAdmin: isSuperAdmin,
          isStoreOwner: profile.role === ROLES.STORE_OWNER,
        };

        // Check Subscription Expiry
        if (tenantInfo && !userData.isSuperAdmin && tenantInfo.subscription_expires_at) {
          try {
            const expiresAt = new Date(tenantInfo.subscription_expires_at);
            const now = new Date();
            if (!isNaN(expiresAt.getTime())) {
              const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
              
              tenantInfo.daysRemaining = diffDays;
              tenantInfo.isExpired = diffDays <= 0;

              if (tenantInfo.isExpired) {
                toast({
                  title: "انتهت صلاحية الاشتراك",
                  description: "انتهت صلاحية اشتراك متجرك. يرجى التواصل مع المدير للتجديد.",
                  variant: "destructive",
                  duration: 10000
                });
              } else if (diffDays <= 7) {
                toast({
                  title: "قرب انتهاء الاشتراك",
                  description: `سينتهي اشتراكك خلال ${diffDays} يوم. يرجى التجديد قريباً.`,
                  variant: "warning"
                });
              }
            }
          } catch (expiryError) {
            console.warn('Subscription expiry check error:', expiryError);
          }
        }

        setUser(userData);
        setTenant(tenantInfo);
      } else {
        setUser({
          ...userData,
          name: userData.name || userData.email?.split('@')[0] || 'مستخدم'
        });
        setTenant(null);
      }
    } catch (error) {
      console.error("Auth setup error:", error);
      setUser(userData);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (email, password) => {
    try {
      const user = await neonService.verifyPassword(email, password);
      if (!user) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }

      // حفظ في localStorage
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', user.name);

      // تحديث last_seen
      await neonService.updateUserLastSeen?.(user.id);

      await fetchProfile(user);
      return { user };
    } catch (error) {
      console.error('Login error:', error);
      // Check for database connection errors and provide helpful message
      if (error.message && (error.message.includes('الاتصال') || error.message.includes('Connection') || error.message.includes('password authentication'))) {
        throw new Error('فشل الاتصال بقاعدة البيانات. يرجى التحقق من إعدادات قاعدة البيانات. راجع ملف NEON_CONNECTION_SETUP.md للمساعدة.');
      }
      throw error;
    }
  };

  const register = async ({ name, storeName, email, password }) => {
    try {
      // إنشاء Tenant أولاً
      const tenant = await neonService.createTenant(storeName, null);
      
      // إنشاء المستخدم
      const userData = await neonService.createUser({
        email,
        password,
        name,
        tenant_id: tenant.id,
        role: ROLES.STORE_OWNER,
        can_delete_data: true,
        can_edit_data: true,
        can_create_users: true,
      });

      // تحديث Tenant بالمالك
      await neonService.updateTenant(tenant.id, { owner_user_id: userData.id });

      // حفظ في localStorage
      localStorage.setItem('userId', userData.id);
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userName', userData.name);

      toast({ 
        title: 'تم إنشاء الحساب بنجاح!', 
        description: 'مرحباً بك في نظام إبراهيم للمحاسبة. جاري تسجيل الدخول...' 
      });
      
      await fetchProfile(userData);
      return { user: userData };
    } catch (error) {
      console.error('Registration error:', error);
      toast({ 
        title: 'فشل التسجيل', 
        description: error.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.', 
        variant: 'destructive' 
      });
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setUser(null);
    setTenant(null);
    window.location.href = '/login';
  };

  // Permission Helpers - ربط الصلاحيات بمدة صلاحية المتجر
  // إذا انتهت صلاحية المتجر، يتم تعطيل جميع الصلاحيات (ماعدا Super Admin)
  const isExpired = tenant?.isExpired && !user?.isSuperAdmin;
  const isSubscriptionValid = !isExpired && (user?.isSuperAdmin || (tenant && !tenant.isExpired));
  
  // صلاحيات المستخدم مرتبطة بصلاحية المتجر
  const canDelete = user?.isSuperAdmin || (isSubscriptionValid && ((user?.isStoreOwner && !tenant?.isExpired) || user?.can_delete_data));
  const canEdit = user?.isSuperAdmin || (isSubscriptionValid && ((user?.isStoreOwner && !tenant?.isExpired) || user?.can_edit_data));
  const canCreateUsers = user?.isSuperAdmin || (isSubscriptionValid && ((user?.isStoreOwner && !tenant?.isExpired) || user?.can_create_users));
  
  // صلاحيات إضافية مرتبطة بالاشتراك
  const canAccessData = user?.isSuperAdmin || isSubscriptionValid;
  const canModifyData = user?.isSuperAdmin || (isSubscriptionValid && (user?.isStoreOwner || user?.can_edit_data));

  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      tenant, 
      login, 
      register, 
      logout, 
      loading,
      permissions: { 
        canDelete, 
        canEdit, 
        canCreateUsers, 
        isExpired,
        canAccessData,
        canModifyData,
        isSubscriptionValid
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};
