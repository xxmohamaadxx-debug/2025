import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Store, Edit, Trash2, MessageCircle, Download, FileDown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SUBSCRIPTION_PLANS, CONTACT_INFO, ROLES } from '@/lib/constants';
import { formatDateAR, formatDateForInput } from '@/lib/dateUtils';
import { saveAs } from 'file-saver';

const AdminPanel = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stores, setStores] = useState([]);
  const [storeTypes, setStoreTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  
  // New Store Form
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    plan: 'trial',
    customDays: '',
    isTrial: true,
    store_type_id: ''
  });

  // Edit Store Form
  const [editFormData, setEditFormData] = useState({
    name: '',
    subscription_plan: '',
    subscription_status: '',
    subscription_expires_at: '',
    store_type_id: ''
  });

  // Subscription Extension Form
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan: 'monthly',
    customDays: '',
    customExpiryDate: ''
  });

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchStores();
      fetchStoreTypes();
    }
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

  const fetchStoreTypes = async () => {
    try {
      const types = await neonService.getStoreTypes();
      setStoreTypes(types || []);
    } catch (error) {
      console.error("Fetch store types error:", error);
    }
  };

  const calculateExpiryDate = (plan, customDays = '', currentExpiry = null) => {
    const baseDate = currentExpiry ? new Date(currentExpiry) : new Date();
    
    if (plan === 'custom' && customDays) {
      baseDate.setDate(baseDate.getDate() + parseInt(customDays));
      return baseDate;
    }
    
    if (plan === 'trial') {
      baseDate.setDate(baseDate.getDate() + 15);
      return baseDate;
    }
    
    const planMap = {
      'monthly': SUBSCRIPTION_PLANS.MONTHLY,
      '6months': SUBSCRIPTION_PLANS.SIX_MONTHS,
      'yearly': SUBSCRIPTION_PLANS.YEARLY
    };
    
    const selectedPlan = planMap[plan];
    if (selectedPlan) {
      baseDate.setDate(baseDate.getDate() + selectedPlan.durationDays);
      return baseDate;
    }
    
    return baseDate;
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    
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
        tenant_id: null,
        can_delete_data: true,
        can_edit_data: true,
        can_create_users: true,
        created_by: user?.id || null
      });

      // 2. حساب تاريخ الانتهاء
      let expiryDate = calculateExpiryDate(formData.plan, formData.customDays);
      let subscriptionPlan = formData.plan === 'custom' ? 'custom' : formData.plan;
      let subscriptionStatus = formData.plan === 'trial' ? 'trial' : 'active';

      const newTenant = await neonService.createTenant(formData.storeName, newUser.id);
      
      // 3. تحديث Tenant ببيانات الاشتراك ونوع المتجر
      const updateData = {
        subscription_plan: subscriptionPlan,
        subscription_status: subscriptionStatus,
        subscription_expires_at: expiryDate.toISOString()
      };
      
      if (formData.store_type_id) {
        updateData.store_type_id = formData.store_type_id;
      }
      
      await neonService.updateTenant(newTenant.id, updateData);

      // 4. تحديث المستخدم بـ tenant_id
      await neonService.updateUserAdmin(newUser.id, {
        tenant_id: newTenant.id
      });

      toast({ 
        title: "تم بنجاح", 
        description: `تم إنشاء المتجر "${formData.storeName}" وحساب المدير بنجاح`,
        variant: "default"
      });

      setFormData({
        storeName: '',
        ownerName: '',
        email: '',
        password: '',
        plan: 'trial',
        customDays: '',
        isTrial: true,
        store_type_id: ''
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

  const handleEditStore = (store) => {
    setSelectedStore(store);
    setEditFormData({
      name: store.name || '',
      subscription_plan: store.subscription_plan || 'monthly',
      subscription_status: store.subscription_status || 'active',
      subscription_expires_at: store.subscription_expires_at ? formatDateForInput(store.subscription_expires_at) : '',
      store_type_id: store.store_type_id || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateStore = async () => {
    if (!selectedStore || !editFormData.name) {
      toast({ 
        title: "خطأ", 
        description: "اسم المتجر مطلوب",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: editFormData.name,
        subscription_plan: editFormData.subscription_plan,
        subscription_status: editFormData.subscription_status
      };

      if (editFormData.subscription_expires_at) {
        updateData.subscription_expires_at = new Date(editFormData.subscription_expires_at).toISOString();
      }
      
      if (editFormData.store_type_id) {
        updateData.store_type_id = editFormData.store_type_id;
      }

      await neonService.updateTenant(selectedStore.id, updateData);

      toast({ 
        title: "تم بنجاح", 
        description: `تم تحديث بيانات المتجر "${editFormData.name}" بنجاح`,
        variant: "default"
      });

      setEditDialogOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (error) {
      console.error('Update store error:', error);
      toast({ 
        title: "خطأ في تحديث المتجر", 
        description: error.message || "حدث خطأ أثناء تحديث المتجر",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtendSubscription = (store) => {
    setSelectedStore(store);
    setSubscriptionFormData({
      plan: 'monthly',
      customDays: '',
      customExpiryDate: store.subscription_expires_at ? store.subscription_expires_at.split('T')[0] : ''
    });
    setSubscriptionDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      let expiryDate;
      
      if (subscriptionFormData.customExpiryDate) {
        expiryDate = new Date(subscriptionFormData.customExpiryDate);
      } else {
        expiryDate = calculateExpiryDate(
          subscriptionFormData.plan,
          subscriptionFormData.customDays,
          selectedStore.subscription_expires_at
        );
      }

      const subscriptionPlan = subscriptionFormData.plan === 'custom' ? 'custom' : subscriptionFormData.plan;

      await neonService.updateTenant(selectedStore.id, {
        subscription_expires_at: expiryDate.toISOString(),
        subscription_plan: subscriptionPlan,
        subscription_status: 'active'
      });

      toast({ 
        title: "تم بنجاح", 
        description: `تم تحديث الاشتراك للمتجر "${selectedStore.name}"`,
        variant: "default"
      });

      setSubscriptionDialogOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (error) {
      console.error('Update subscription error:', error);
      toast({ 
        title: "خطأ", 
        description: error.message || "حدث خطأ أثناء تحديث الاشتراك",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    // حذف مباشر دون تأكيد كما طلب المستخدم
    try {
      await neonService.deleteTenant(storeId);
      toast({ 
        title: 'تم حذف المتجر بنجاح', 
        description: `تم حذف "${storeName}" وجميع بياناته`,
        variant: 'default'
      });
      fetchStores();
    } catch (error) {
      console.error('Delete store error:', error);
      toast({ 
        title: 'خطأ في حذف المتجر', 
        description: error.message || 'حدث خطأ أثناء حذف المتجر',
        variant: 'destructive' 
      });
    }
  };

  const handleExportStoreData = async (store) => {
    try {
      setLoading(true);
      const exportData = await neonService.exportTenantData(store.id);
      
      if (exportData) {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const fileName = `store_data_${store.name}_${new Date().toISOString().split('T')[0]}.json`;
        saveAs(blob, fileName);
        toast({ 
          title: 'تم تصدير البيانات بنجاح', 
          description: `تم تصدير بيانات المتجر "${store.name}"`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Export store data error:', error);
      toast({ 
        title: 'خطأ في تصدير البيانات', 
        description: error.message || 'حدث خطأ أثناء تصدير بيانات المتجر',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('adminPanel.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('adminPanel.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              // تصدير جميع المتاجر
              const allStoresData = stores.map(store => ({
                id: store.id,
                name: store.name,
                owner: store.owner_name,
                plan: store.subscription_plan,
                status: store.subscription_status
              }));
              const blob = new Blob([JSON.stringify(allStoresData, null, 2)], { type: 'application/json' });
              const fileName = `all_stores_${new Date().toISOString().split('T')[0]}.json`;
              saveAs(blob, fileName);
              toast({ title: 'تم تصدير قائمة المتاجر' });
            }}
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            تصدير قائمة المتاجر
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl">
            <Plus className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4" /> {t('adminPanel.createNewStore')}
          </Button>
        </div>
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
                    {stores.filter(s => s.subscription_status === 'active' || s.subscription_status === 'trial').length}
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
                                   store.subscription_plan === '6months' ? '6 أشهر' :
                                   store.subscription_plan === 'yearly' ? t('subscription.yearly') :
                                   store.subscription_plan === 'trial' ? 'تجريبي' :
                                   store.subscription_plan || '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                                    {store.subscription_expires_at ? formatDateAR(store.subscription_expires_at) : '-'}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        (store.subscription_status === 'active' || store.subscription_status === 'trial')
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                    }`}>
                                        {store.subscription_status === 'active' || store.subscription_status === 'trial' ? t('status.active') : t('status.expired')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2 flex-wrap">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow"
                                            onClick={() => handleEditStore(store)}
                                            title="تعديل"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-cyan-600 border-cyan-200 hover:bg-cyan-50 dark:text-cyan-400 dark:border-cyan-800 dark:hover:bg-cyan-900/20 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow"
                                            onClick={() => handleExportStoreData(store)}
                                            title="تصدير بيانات المتجر"
                                            disabled={loading}
                                        >
                                            <FileDown className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow"
                                            onClick={() => handleExtendSubscription(store)}
                                        >
                                            {t('adminPanel.extendMonth')}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/20 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow"
                                            onClick={() => {
                                              const message = `مرحباً، بخصوص متجر "${store.name}" - أود التواصل حول الاشتراك.`;
                                              window.open(`${CONTACT_INFO.WHATSAPP_URL}?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                            title="تواصل"
                                        >
                                            <MessageCircle className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow"
                                            onClick={() => handleDeleteStore(store.id, store.name)}
                                            title="حذف"
                                        >
                                            <Trash2 className="h-3 w-3" />
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

      {/* Create Store Dialog */}
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
                        <option value="custom">مخصص (أيام محددة)</option>
                    </select>
                </div>

                {formData.plan === 'custom' && (
                    <div>
                        <label className="block text-sm font-medium mb-1 rtl:text-right">عدد الأيام المخصصة *</label>
                        <input
                            type="number"
                            required={formData.plan === 'custom'}
                            min="1"
                            value={formData.customDays}
                            onChange={(e) => setFormData({ ...formData, customDays: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                            placeholder="أدخل عدد الأيام"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المتجر</label>
                    <select
                        value={formData.store_type_id}
                        onChange={(e) => setFormData({ ...formData, store_type_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="">اختر نوع المتجر (اختياري)</option>
                        {storeTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name_ar}</option>
                        ))}
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
                                plan: 'trial',
                                customDays: '',
                                isTrial: true,
                                store_type_id: ''
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

      {/* Edit Store Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>تعديل بيانات المتجر</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">اسم المتجر *</label>
                    <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">خطة الاشتراك</label>
                    <select
                        value={editFormData.subscription_plan}
                        onChange={(e) => setEditFormData({ ...editFormData, subscription_plan: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="trial">تجريبي</option>
                        <option value="monthly">شهري</option>
                        <option value="6months">6 أشهر</option>
                        <option value="yearly">سنوي</option>
                        <option value="custom">مخصص</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">حالة الاشتراك</label>
                    <select
                        value={editFormData.subscription_status}
                        onChange={(e) => setEditFormData({ ...editFormData, subscription_status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="active">نشط</option>
                        <option value="trial">تجريبي</option>
                        <option value="expired">منتهي</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ الانتهاء</label>
                    <input
                        type="date"
                        value={editFormData.subscription_expires_at}
                        onChange={(e) => setEditFormData({ ...editFormData, subscription_expires_at: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المتجر</label>
                    <select
                        value={editFormData.store_type_id}
                        onChange={(e) => setEditFormData({ ...editFormData, store_type_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="">بدون نوع (عام)</option>
                        {storeTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name_ar}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button 
                        onClick={() => setEditDialogOpen(false)} 
                        variant="outline" 
                        className="flex-1"
                        disabled={loading}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        onClick={handleUpdateStore} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                                جاري التحديث...
                            </>
                        ) : (
                            'حفظ التغييرات'
                        )}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>تمديد الاشتراك</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <label className="block text-sm font-medium mb-1 rtl:text-right">خطة الاشتراك</label>
                    <select
                        value={subscriptionFormData.plan}
                        onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, plan: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                    >
                        <option value="monthly">شهري (30 يوم)</option>
                        <option value="6months">6 أشهر (180 يوم)</option>
                        <option value="yearly">سنوي (365 يوم)</option>
                        <option value="custom">مخصص</option>
                    </select>
                </div>

                {subscriptionFormData.plan === 'custom' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1 rtl:text-right">عدد الأيام المخصصة</label>
                            <input
                                type="number"
                                min="1"
                                value={subscriptionFormData.customDays}
                                onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, customDays: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                                placeholder="أدخل عدد الأيام"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 rtl:text-right">أو حدد تاريخ انتهاء محدد</label>
                            <input
                                type="date"
                                value={subscriptionFormData.customExpiryDate}
                                onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, customExpiryDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                    </>
                )}

                <div className="flex gap-2 pt-2">
                    <Button 
                        onClick={() => setSubscriptionDialogOpen(false)} 
                        variant="outline" 
                        className="flex-1"
                        disabled={loading}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        onClick={handleUpdateSubscription} 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                                جاري التحديث...
                            </>
                        ) : (
                            'تمديد الاشتراك'
                        )}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;