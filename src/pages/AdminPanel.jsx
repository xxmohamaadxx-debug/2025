import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Store, Calendar, AlertTriangle, Phone, MessageCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SUBSCRIPTION_PLANS, CONTACT_INFO, ROLES } from '@/lib/constants';
import Logo from '@/components/Logo';
import { formatDateAR } from '@/lib/dateUtils';

const AdminPanel = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // New Store Form
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    plan: 'trial', // Default to trial
    isTrial: true
  });

  useEffect(() => {
    if (user?.isSuperAdmin) fetchStores();
  }, [user]);

  const fetchStores = async () => {
    try {
      const tenants = await neonService.getAllTenants();
      setStores(tenants || []);
    } catch (error) {
      console.error("Fetch stores error:", error);
      toast({ 
        title: t('adminPanel.errors.loadFailed'), 
        description: error.message || t('adminPanel.errors.loadError'),
        variant: "destructive" 
      });
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    
    // التحقق من البيانات
    if (!formData.storeName || !formData.ownerName || !formData.email || !formData.password) {
      toast({ 
        title: "خطأ", 
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // 1. إنشاء المستخدم (مدير المتجر) أولاً
      const newUser = await neonService.createUser({
        email: formData.email,
        password: formData.password,
        name: formData.ownerName,
        role: ROLES.STORE_OWNER,
        tenant_id: null, // سيتم تحديثه بعد إنشاء المتجر
        can_delete_data: true,
        can_edit_data: true,
        can_create_users: true,
        created_by: user?.id || null
      });

      // 2. إنشاء المتجر (Tenant)
      let expiryDate = new Date();
      let subscriptionPlan = formData.plan;
      let subscriptionStatus = 'active';
      
      if (formData.isTrial || formData.plan === 'trial') {
        // حساب تجريبي 15 يوم
        expiryDate.setDate(expiryDate.getDate() + 15);
        subscriptionPlan = 'trial';
        subscriptionStatus = 'trial';
      } else {
        const planMap = {
          'monthly': SUBSCRIPTION_PLANS.MONTHLY,
          '6months': SUBSCRIPTION_PLANS.SIX_MONTHS,
          'yearly': SUBSCRIPTION_PLANS.YEARLY
        };
        const plan = planMap[formData.plan] || SUBSCRIPTION_PLANS.MONTHLY;
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays);
      }

      const newTenant = await neonService.createTenant(formData.storeName, newUser.id);
      
      // 3. تحديث Tenant ببيانات الاشتراك
      await neonService.updateTenant(newTenant.id, {
        subscription_plan: subscriptionPlan,
        subscription_status: subscriptionStatus,
        subscription_expires_at: expiryDate.toISOString()
      });

      // 4. تحديث المستخدم بـ tenant_id
      await neonService.updateUserAdmin(newUser.id, {
        tenant_id: newTenant.id
      });

      toast({ 
        title: "تم بنجاح", 
        description: `تم إنشاء المتجر "${formData.storeName}" وحساب المدير بنجاح`,
        variant: "default"
      });

      // إعادة تعيين النموذج
      setFormData({
        storeName: '',
        ownerName: '',
        email: '',
        password: '',
        plan: 'trial',
        isTrial: true
      });
      
      setDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error('Create store error:', error);
      toast({ 
        title: "خطأ في إنشاء المتجر", 
        description: error.message || "حدث خطأ أثناء إنشاء المتجر. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtendSubscription = async (storeId, currentExpiry, planId) => {
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    const current = new Date(currentExpiry || Date.now());
    const newExpiry = new Date(current.setDate(current.getDate() + plan.durationDays));
    
    try {
      await neonService.updateTenant(storeId, { 
        subscription_expires_at: newExpiry.toISOString(),
        subscription_plan: planId,
        subscription_status: 'active'
      });

      toast({ title: t('adminPanel.success.subscriptionExtended') });
      fetchStores();
    } catch (error) {
      toast({ title: t('adminPanel.errors.updateFailed'), variant: "destructive" });
    }
  };

  if (!user?.isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">{t('adminPanel.errors.accessDenied')}</div>;
  }

  return (
    <div className="space-y-6">
      <Helmet><title>{t('adminPanel.title')} - {t('common.systemName')}</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <Logo size="md" showText={true} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('adminPanel.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('adminPanel.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4" /> {t('adminPanel.createNewStore')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900/30">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('adminPanel.totalStores')}</h3>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stores.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-900/30">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('adminPanel.activeSubscriptions')}</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {stores.filter(s => s.subscription_status === 'active').length}
                </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('adminPanel.expired')}</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                    {stores.filter(s => s.subscription_status === 'expired' || !s.subscription_status).length}
                </p>
            </div>
          </div>

          {stores.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('adminPanel.noStores')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('adminPanel.storeName')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('adminPanel.owner')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('adminPanel.plan')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('adminPanel.expiresAt')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('adminPanel.status')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {stores.map(store => (
                            <tr key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{store.name}</td>
                                <td className="p-4 text-sm">
                                    {store.owner_name ? (
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{store.owner_name}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">{store.owner_email}</div>
                                        </div>
                                    ) : <span className="text-gray-400">{t('adminPanel.unknown')}</span>}
                                </td>
                                <td className="p-4 text-sm text-gray-700 dark:text-gray-300 capitalize">
                                  {store.subscription_plan === 'monthly' ? t('subscription.monthly') :
                                   store.subscription_plan === '6months' ? t('subscription.sixMonths') :
                                   store.subscription_plan === 'yearly' ? t('subscription.yearly') :
                                   store.subscription_plan || '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                                    {store.subscription_expires_at ? formatDateAR(store.subscription_expires_at) : '-'}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        store.subscription_status === 'active' 
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                    }`}>
                                        {store.subscription_status === 'active' ? t('status.active') : t('status.expired')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                                            onClick={() => handleExtendSubscription(store.id, store.subscription_expires_at, 'monthly')}
                                        >
                                            {t('adminPanel.extendMonth')}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                                            onClick={() => {
                                              const message = `مرحباً، بخصوص متجر "${store.name}" - أود التواصل حول الاشتراك.`;
                                              window.open(`${CONTACT_INFO.WHATSAPP_URL}?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                        >
                                            <MessageCircle className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('adminPanel.createNewStore')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStore} className="space-y-4 py-4">
                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">اسم المتجر *</label>
                    <input
                        type="text"
                        required
                        value={formData.storeName}
                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                        placeholder="اسم المتجر"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">اسم مدير المتجر *</label>
                    <input
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                        placeholder="اسم المدير"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">البريد الإلكتروني *</label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                        placeholder="email@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">كلمة المرور *</label>
                    <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                        placeholder="كلمة المرور (6 أحرف على الأقل)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">خطة الاشتراك</label>
                    <select
                        value={formData.plan}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          plan: e.target.value,
                          isTrial: e.target.value === 'trial'
                        })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="trial">حساب تجريبي (15 يوم) - مجاني</option>
                        <option value="monthly">شهري (30 يوم) - $5</option>
                        <option value="6months">6 أشهر (180 يوم) - $30</option>
                        <option value="yearly">سنوي (365 يوم) - $40</option>
                    </select>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button 
                        type="button"
                        onClick={() => {
                            setDialogOpen(false);
                            setFormData({
                                storeName: '',
                                ownerName: '',
                                email: '',
                                password: '',
                                plan: 'monthly'
                            });
                        }} 
                        variant="outline" 
                        className="flex-1"
                        disabled={loading}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        type="submit" 
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                                جاري الإنشاء...
                            </>
                        ) : (
                            'إنشاء المتجر'
                        )}
                    </Button>
                </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
