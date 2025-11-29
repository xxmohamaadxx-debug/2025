import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Store, Edit, Trash2, MessageCircle, Download, FileDown, Package, Users, ShoppingCart, FolderPlus, Clock, CheckCircle, Send, Fuel, Cpu, Warehouse, Building, Shield, Settings, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [trialPeriodDialogOpen, setTrialPeriodDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  // Pagination for support tickets
  const [ticketPage, setTicketPage] = useState(1);
  const ticketsPerPage = 10;
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Pagination for ticket messages
  const [messagePage, setMessagePage] = useState(1);
  const messagesPerPage = 12;
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Sections visibility management inside AdminPanel
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [sectionSettings, setSectionSettings] = useState([]);
  const [savingSections, setSavingSections] = useState(false);

  const availableSectionsAdmin = [
    { code: 'dashboard', title: 'لوحة التحكم', category: 'عام' },
    { code: 'invoices_in', title: 'فواتير المشتريات', category: 'عام' },
    { code: 'invoices_out', title: 'فواتير المبيعات', category: 'عام' },
    { code: 'inventory', title: 'المخزون', category: 'مخزون' },
    { code: 'inventory_categories', title: 'أقسام المخزون', category: 'مخزون' },
    { code: 'inventory_thresholds', title: 'حدود المخزون', category: 'مخزون' },
    { code: 'inventory_audit', title: 'تدقيق المخزون', category: 'مخزون' },
    { code: 'warehouse_transactions', title: 'الوارد والصادر', category: 'مخزون' },
    { code: 'customers', title: 'العملاء', category: 'عام' },
    { code: 'partners', title: 'الشركاء', category: 'عام' },
    { code: 'employees', title: 'الموظفون', category: 'عام' },
    { code: 'store_users', title: 'مستخدمي النظام', category: 'عام' },
    { code: 'reports', title: 'التقارير', category: 'عام' },
    { code: 'journal', title: 'اليومية', category: 'عام' },
    { code: 'internet_cafe_subscribers', title: 'مشتركو الإنترنت', category: 'إنترنت' },
    { code: 'internet_cafe_subscription_types', title: 'أنواع الاشتراكات', category: 'إنترنت' },
    { code: 'internet_cafe_sessions', title: 'جلسات الاستخدام', category: 'إنترنت' },
    { code: 'internet_cafe_devices', title: 'أجهزة الإنترنت', category: 'إنترنت' },
    { code: 'fuel_station', title: 'إدارة المحروقات', category: 'محروقات' },
    { code: 'fuel_counters', title: 'عدادات الوقود', category: 'محروقات' },
    { code: 'contractor_projects', title: 'مشاريع المقاولين', category: 'مقاولات' },
    { code: 'contractor_project_items', title: 'بنود الكميات', category: 'مقاولات' },
    { code: 'store_products', title: 'منتجات المتجر', category: 'متجر' },
    { code: 'store_pos', title: 'نقطة البيع', category: 'متجر' },
    { code: 'store_sales_invoices', title: 'فواتير المبيعات (متجر)', category: 'متجر' },
    { code: 'store_purchase_invoices', title: 'فواتير المشتريات (متجر)', category: 'متجر' },
    { code: 'store_bundles', title: 'حزم المنتجات', category: 'متجر' },
    { code: 'comprehensive_reports', title: 'تقارير شاملة', category: 'نظام' },
    { code: 'subscription', title: 'الاشتراك', category: 'نظام' },
    { code: 'notification_settings', title: 'الإشعارات', category: 'نظام' },
    { code: 'support', title: 'الدعم', category: 'نظام' },
    { code: 'messages', title: 'الرسائل', category: 'نظام' },
    { code: 'backup', title: 'النسخ الاحتياطي', category: 'نظام' },
    { code: 'settings', title: 'الإعدادات', category: 'نظام' }
  ];

  const loadSectionSettings = async (tenantId) => {
    if (!tenantId) return;
    try {
      const settings = await neonService.getTenantSectionSettings?.(tenantId);
      const map = {};
      (settings || []).forEach(s => { map[s.section_code] = s; });
      const normalized = availableSectionsAdmin.map((sec, idx) => ({
        section_code: sec.code,
        is_visible: map[sec.code]?.is_visible ?? true,
        display_order: map[sec.code]?.display_order ?? (idx + 1)
      }));
      setSectionSettings(normalized);
    } catch (err) {
      console.error('Load section settings error:', err);
      setSectionSettings(availableSectionsAdmin.map((sec, idx) => ({ section_code: sec.code, is_visible: true, display_order: idx + 1 })));
    }
  };

  const toggleSectionVisibility = (code) => {
    setSectionSettings(prev => prev.map(s => s.section_code === code ? { ...s, is_visible: !s.is_visible } : s));
  };

  const setAllSectionVisibility = (visible) => {
    setSectionSettings(prev => prev.map(s => ({ ...s, is_visible: visible })));
  };

  const saveSectionSettings = async () => {
    if (!selectedTenantId) return;
    setSavingSections(true);
    try {
      await neonService.updateTenantSectionSettings?.(selectedTenantId, sectionSettings);
      toast({ title: 'تم حفظ الأقسام الظاهرة', description: 'تم تحديث إعدادات الأقسام للمتجر بنجاح' });
    } catch (err) {
      toast({ title: 'فشل حفظ الأقسام', description: err.message || 'تعذر حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSavingSections(false);
    }
  };
  
  // New Store Form
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    plan: 'trial',
    customDays: '',
    isTrial: true,
    store_type_ids: [] // أنواع متعددة
  });

  // Edit Store Form
  const [editFormData, setEditFormData] = useState({
    name: '',
    subscription_plan: '',
    subscription_status: '',
    subscription_expires_at: '',
    store_type_ids: [] // أنواع متعددة
  });

  // Subscription Extension Form
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan: 'monthly',
    customDays: '',
    customExpiryDate: ''
  });

  // Trial Period Form
  const [trialPeriodFormData, setTrialPeriodFormData] = useState({
    trialDays: 15,
    customExpiryDate: ''
  });

  // Store Content Form
  const [contentFormData, setContentFormData] = useState({
    type: 'products', // products, categories, customers, employees, inventory
    content: '',
    count: 1
  });

  // Starter Kit options for seeding initial content on store creation
  const [starterKitOptions, setStarterKitOptions] = useState({
    seedProductsBasics: true,
    seedCustomersBasics: true,
    seedVendorsBasics: true
  });

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchStores();
      fetchStoreTypes();
      fetchSupportTickets();
    }
  }, [user]);

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>غير مصرح لك بالوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [t]);

  const fetchStoreTypes = async () => {
    try {
      const types = await neonService.getStoreTypes();
      setStoreTypes(types || []);
    } catch (error) {
      console.error("Fetch store types error:", error);
    }
  };

  const fetchSupportTickets = async () => {
    setLoadingTickets(true);
    try {
      const tickets = await neonService.getSupportTickets(null, null, true);
      setSupportTickets(tickets || []);
      setTicketPage(1);
    } catch (error) {
      console.error("Fetch support tickets error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل تذاكر الدعم",
        variant: "destructive"
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const openTicketMessages = async (ticket) => {
    setSelectedTicket(ticket);
    setMessageDialogOpen(true);
    setLoadingMessages(true);
    try {
      const msgs = await neonService.getSupportTicketMessages(ticket.id);
      setTicketMessages(msgs || []);
      setMessagePage(1);
    } catch (error) {
      console.error('Load messages error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحميل رسائل التذكرة',
        variant: 'destructive'
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendTicketReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const newMsg = await neonService.addSupportTicketMessage({
        ticket_id: selectedTicket.id,
        user_id: user?.id || null,
        message: replyText.trim(),
        is_from_admin: true
      });
      setTicketMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      // Optionally set status to in_progress
      if (selectedTicket.status === 'open') {
        await neonService.updateSupportTicketStatus(selectedTicket.id, 'in_progress', user?.id || null);
        fetchSupportTickets();
      }
      toast({ title: 'تم الإرسال', description: 'تم إرسال الرد بنجاح' });
    } catch (error) {
      console.error('Send reply error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إرسال الرد',
        variant: 'destructive'
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    
    try {
      await neonService.deleteSupportTicket(ticketId);
      toast({
        title: "تم بنجاح",
        description: "تم حذف التذكرة بنجاح"
      });
      fetchSupportTickets();
    } catch (error) {
      console.error('Delete ticket error:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حذف التذكرة",
        variant: "destructive"
      });
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await neonService.updateSupportTicket(ticketId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id
      });
      toast({
        title: "تم بنجاح",
        description: "تم حل التذكرة بنجاح"
      });
      fetchSupportTickets();
    } catch (error) {
      console.error('Resolve ticket error:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حل التذكرة",
        variant: "destructive"
      });
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
      
      // 3. تحديث Tenant ببيانات الاشتراك
      const updateData = {
        subscription_plan: subscriptionPlan,
        subscription_status: subscriptionStatus,
        subscription_expires_at: expiryDate.toISOString()
      };
      
      await neonService.updateTenant(newTenant.id, updateData);

      // 4. إضافة أنواع المتاجر (أنواع متعددة)
      if (formData.store_type_ids && formData.store_type_ids.length > 0) {
        for (let i = 0; i < formData.store_type_ids.length; i++) {
          const storeTypeId = formData.store_type_ids[i];
          await neonService.addStoreTypeToTenant(
            newTenant.id,
            storeTypeId,
            i === 0, // الأول هو الرئيسي
            i // الأولوية
          );
        }
      }

      // 5. تحديث المستخدم بـ tenant_id
      await neonService.updateUserAdmin(newUser.id, {
        tenant_id: newTenant.id
      });

      // 6. Seed default sidebar section visibility based on selected store types
      try {
        // Fetch back the tenant store types to determine codes
        const tenantTypes = await neonService.getTenantStoreTypes(newTenant.id);
        const typeCodes = (tenantTypes || []).map(t => (t.store_type_code || t.code || '').toLowerCase().trim()).filter(Boolean);

        // Define all available sections and map defaults
        const availableSections = [
          // عامة
          'dashboard','invoices_in','invoices_out','inventory','daily_transactions','customers','partners','employees','store_users','reports','journal',
          // صالات الإنترنت
          'internet_cafe_subscribers','internet_cafe_subscription_types','internet_cafe_sessions','internet_cafe_devices',
          // المحروقات
          'fuel_station','fuel_counters',
          // المخزون
          'inventory_categories','inventory_thresholds','inventory_audit',
          // المقاول
          'contractor_projects','contractor_project_items',
          // المتجر
          'store_products','store_pos','store_sales_invoices','store_purchase_invoices','store_bundles',
          // النظام
          'comprehensive_reports','subscription','notification_settings','support','messages','backup','settings'
        ];

        // تحديد أنواع المتاجر بدقة
        const isInternetCafe = typeCodes.some(c => c.includes('internet_cafe') && !c.includes('accessories'));
        const isMobileAccessories = typeCodes.some(c => c.includes('accessories') || c.includes('mobile'));
        const isInternetCafeAccessories = isInternetCafe && isMobileAccessories;
        const isFuel = typeCodes.some(c => c.includes('fuel') && !c.includes('general'));
        const isGeneralWithFuel = typeCodes.some(c => c.includes('general_with_fuel'));
        const isWarehouse = typeCodes.some(c => c.includes('warehouse'));
        const isContractor = typeCodes.some(c => c.includes('contractor'));
        const isGeneralStore = typeCodes.some(c => c.includes('store') || c.includes('retail')) && !isInternetCafe && !isFuel && !isContractor && !isWarehouse;

        const visibleSet = new Set([
          // Always visible core - موجودة في كل متجر
          'dashboard','daily_transactions','reports','journal','settings','backup','support','messages','notification_settings','subscription','comprehensive_reports'
        ]);

        // 1. صالة إنترنت
        if (isInternetCafe && !isMobileAccessories) {
          ['internet_cafe_subscribers','internet_cafe_subscription_types','internet_cafe_sessions','internet_cafe_devices'].forEach(c => visibleSet.add(c));
        }

        // 2. متجر إكسسوارات جوال
        if (isMobileAccessories && !isInternetCafe) {
          ['store_products','store_pos','store_sales_invoices','store_purchase_invoices','store_bundles','inventory','inventory_categories','inventory_thresholds','inventory_audit'].forEach(c => visibleSet.add(c));
        }

        // 3. مستودع
        if (isWarehouse) {
          ['inventory','inventory_categories','inventory_thresholds','inventory_audit','warehouse_transactions','invoices_in','invoices_out'].forEach(c => visibleSet.add(c));
        }

        // 4. متجر محروقات
        if (isFuel && !isGeneralWithFuel) {
          ['fuel_station','fuel_counters','inventory','inventory_categories','inventory_thresholds','inventory_audit','invoices_in','invoices_out','customers','partners'].forEach(c => visibleSet.add(c));
        }

        // 5. صالة إنترنت + إكسسوارات جوال
        if (isInternetCafeAccessories) {
          ['internet_cafe_subscribers','internet_cafe_subscription_types','internet_cafe_sessions','internet_cafe_devices','store_products','store_pos','store_sales_invoices','store_purchase_invoices','store_bundles','inventory','inventory_categories','inventory_thresholds','inventory_audit'].forEach(c => visibleSet.add(c));
        }

        // 6. متجر مقاولين ومواد بناء
        if (isContractor) {
          ['contractor_projects','contractor_project_items','invoices_in','invoices_out','inventory','inventory_categories','inventory_thresholds','inventory_audit','customers','partners'].forEach(c => visibleSet.add(c));
        }

        // 7. متجر عادي مع محروقات
        if (isGeneralWithFuel) {
          ['fuel_station','fuel_counters','invoices_in','invoices_out','inventory','inventory_categories','inventory_thresholds','inventory_audit','customers','partners','employees','store_users'].forEach(c => visibleSet.add(c));
        }

        // إضافة الأقسام الأساسية المشتركة
        if (!isWarehouse) {
          ['customers','partners','employees','store_users'].forEach(c => visibleSet.add(c));
        }
        if (!isWarehouse && !isInternetCafe) {
          ['invoices_in','invoices_out'].forEach(c => visibleSet.add(c));
        }

        const seededSettings = availableSections.map((code, idx) => ({
          section_code: code,
          is_visible: visibleSet.has(code),
          display_order: idx + 1,
        }));

        await neonService.updateTenantSectionSettings?.(newTenant.id, seededSettings);
      } catch (seedErr) {
        console.warn('Seeding section settings failed:', seedErr);
      }

      // 7. Optional: Seed starter kit content (safe operations only)
      try {
        // Seed basic customers
        if (starterKitOptions.seedCustomersBasics) {
          const customers = [
            { name: 'عميل افتراضي 1', phone: '700000001' },
            { name: 'عميل افتراضي 2', phone: '700000002' },
            { name: 'عميل افتراضي 3', phone: '700000003' }
          ];
          for (const c of customers) {
            await neonService.createPartner({
              tenant_id: newTenant.id,
              name: c.name,
              phone: c.phone,
              type: 'customer'
            });
          }
        }

        // Seed basic vendors
        if (starterKitOptions.seedVendorsBasics) {
          const vendors = [
            { name: 'مورد افتراضي 1', phone: '710000001' },
            { name: 'مورد افتراضي 2', phone: '710000002' }
          ];
          for (const v of vendors) {
            await neonService.createPartner({
              tenant_id: newTenant.id,
              name: v.name,
              phone: v.phone,
              type: 'vendor'
            });
          }
        }

        // Seed basic products
        if (starterKitOptions.seedProductsBasics) {
          const products = [
            { name: 'سلك USB-C', sku: 'USB-C-001', price: 5, category: 'إكسسوارات جوال' },
            { name: 'سماعات سلكية', sku: 'HP-002', price: 8, category: 'إكسسوارات جوال' },
            { name: 'قلم حبر', sku: 'ST-001', price: 1.5, category: 'أدوات مكتبية' }
          ];
          for (const p of products) {
            await neonService.createProduct({
              tenant_id: newTenant.id,
              name: p.name,
              sku: p.sku,
              price: p.price,
              category: p.category,
              stock_quantity: 20
            });
          }
        }
      } catch (seedContentErr) {
        console.warn('Starter kit seeding failed:', seedContentErr);
      }

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
        store_type_ids: []
      });
      setStarterKitOptions({
        seedProductsBasics: true,
        seedCustomersBasics: true,
        seedVendorsBasics: true
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

  // Build dynamic preview of sections based on selected store types - محسّن بدقة
  const getSelectedTypeSectionPreview = (selectedTypeIds) => {
    if (!selectedTypeIds || selectedTypeIds.length === 0) return null;
    const selectedTypes = storeTypes.filter(st => selectedTypeIds.includes(st.id));
    const nameTokens = selectedTypes.map(t => (t.name_ar || t.name || '').toLowerCase());
    const codes = selectedTypes.map(t => (t.store_type_code || t.code || '').toLowerCase().trim()).filter(Boolean);
    
    const meta = [
      { code: 'dashboard', label: 'لوحة التحكم', category: 'عام' },
      { code: 'invoices_in', label: 'فواتير الوارد', category: 'عام' },
      { code: 'invoices_out', label: 'فواتير الصادر', category: 'عام' },
      { code: 'inventory', label: 'المخزون', category: 'عام' },
      { code: 'daily_transactions', label: 'الحركة اليومية', category: 'عام' },
      { code: 'customers', label: 'العملاء والديون', category: 'عام' },
      { code: 'partners', label: 'الموردون والشركاء', category: 'عام' },
      { code: 'employees', label: 'الموظفون', category: 'عام' },
      { code: 'store_users', label: 'إدارة الفريق', category: 'عام' },
      { code: 'reports', label: 'التقارير', category: 'عام' },
      { code: 'journal', label: 'اليومية المحاسبية', category: 'عام' },
      { code: 'internet_cafe_subscribers', label: 'المشتركون', category: 'صالات الإنترنت' },
      { code: 'internet_cafe_subscription_types', label: 'أنواع الاشتراكات', category: 'صالات الإنترنت' },
      { code: 'internet_cafe_sessions', label: 'الجلسات', category: 'صالات الإنترنت' },
      { code: 'internet_cafe_devices', label: 'الأجهزة', category: 'صالات الإنترنت' },
      { code: 'fuel_station', label: 'محطات المحروقات', category: 'المحروقات' },
      { code: 'fuel_counters', label: 'إدارة العدادات', category: 'المحروقات' },
      { code: 'inventory_categories', label: 'الأقسام والفئات', category: 'المخزون' },
      { code: 'inventory_thresholds', label: 'تنبيهات المخزون', category: 'المخزون' },
      { code: 'inventory_audit', label: 'سجل التغييرات', category: 'المخزون' },
      { code: 'contractor_projects', label: 'المشاريع', category: 'المقاول' },
      { code: 'contractor_project_items', label: 'بنود الكميات (BOQ)', category: 'المقاول' },
      { code: 'store_products', label: 'المنتجات', category: 'المتجر' },
      { code: 'store_pos', label: 'نقاط البيع POS', category: 'المتجر' },
      { code: 'store_sales_invoices', label: 'فواتير المبيعات', category: 'المتجر' },
      { code: 'store_purchase_invoices', label: 'فواتير المشتريات', category: 'المتجر' },
      { code: 'store_bundles', label: 'الحزم', category: 'المتجر' },
      { code: 'comprehensive_reports', label: 'التقارير الشاملة', category: 'النظام' },
      { code: 'subscription', label: 'الاشتراك', category: 'النظام' },
      { code: 'notification_settings', label: 'إعدادات الإشعارات', category: 'النظام' },
      { code: 'support', label: 'الدعم والمساعدة', category: 'النظام' },
      { code: 'messages', label: 'المراسلة', category: 'النظام' },
      { code: 'backup', label: 'النسخ الاحتياطي', category: 'النظام' },
      { code: 'settings', label: 'الإعدادات', category: 'النظام' },
    ];

    // تحديد أنواع المتاجر بدقة
    const isInternetCafe = codes.some(c => c.includes('internet_cafe') && !c.includes('accessories')) || nameTokens.some(n => (n.includes('انترنت') || n.includes('صالة')) && !n.includes('اكسسوارات'));
    const isMobileAccessories = codes.some(c => c.includes('accessories') || c.includes('mobile')) || nameTokens.some(n => n.includes('اكسسوارات') || n.includes('جوال'));
    const isInternetCafeAccessories = isInternetCafe && isMobileAccessories;
    const isFuelOnly = codes.some(c => c.includes('fuel') && !c.includes('general')) || nameTokens.some(n => n.includes('محروقات') && !n.includes('عادي'));
    const isGeneralWithFuel = codes.some(c => c.includes('general_with_fuel')) || nameTokens.some(n => n.includes('عادي') && n.includes('محروقات'));
    const isWarehouseOnly = codes.some(c => c.includes('warehouse')) || nameTokens.some(n => n.includes('مستودع'));
    const isContractorOnly = codes.some(c => c.includes('contractor')) || nameTokens.some(n => n.includes('مقاول') || n.includes('مواد بناء'));

    const core = ['dashboard','reports','journal','settings','backup','messages','support','notification_settings','subscription','comprehensive_reports','daily_transactions'];
    const set = new Set(core);
    
    // 1. صالة إنترنت
    if (isInternetCafe && !isMobileAccessories) {
      ['internet_cafe_subscribers','internet_cafe_subscription_types','internet_cafe_sessions','internet_cafe_devices'].forEach(c => set.add(c));
    }
    
    // 2. متجر إكسسوارات جوال
    if (isMobileAccessories && !isInternetCafe) {
      ['store_products','store_pos','store_sales_invoices','store_purchase_invoices','store_bundles','inventory','inventory_categories','inventory_thresholds','inventory_audit','invoices_in','invoices_out'].forEach(c => set.add(c));
    }
    
    // 3. مستودع
    if (isWarehouseOnly) {
      ['inventory','inventory_categories','inventory_thresholds','inventory_audit','warehouse_transactions','invoices_in','invoices_out'].forEach(c => set.add(c));
    }
    
    // 4. متجر محروقات
    if (isFuelOnly && !isGeneralWithFuel) {
      ['fuel_station','fuel_counters','inventory','inventory_categories','inventory_thresholds','inventory_audit','invoices_in','invoices_out','customers','partners'].forEach(c => set.add(c));
    }
    
    // 5. صالة إنترنت + إكسسوارات جوال
    if (isInternetCafeAccessories) {
      ['internet_cafe_subscribers','internet_cafe_subscription_types','internet_cafe_sessions','internet_cafe_devices','store_products','store_pos','store_sales_invoices','store_purchase_invoices','store_bundles','inventory','inventory_categories','inventory_thresholds','inventory_audit'].forEach(c => set.add(c));
    }
    
    // 6. متجر مقاولين ومواد بناء
    if (isContractorOnly) {
      ['contractor_projects','contractor_project_items','invoices_in','invoices_out','inventory','inventory_categories','inventory_thresholds','inventory_audit','customers','partners'].forEach(c => set.add(c));
    }
    
    // 7. متجر عادي مع محروقات
    if (isGeneralWithFuel) {
      ['fuel_station','fuel_counters','invoices_in','invoices_out','inventory','inventory_categories','inventory_thresholds','inventory_audit','customers','partners','employees','store_users'].forEach(c => set.add(c));
    }
    
    // إضافة الأقسام الأساسية المشتركة
    if (!isWarehouseOnly) {
      ['customers','partners','employees','store_users'].forEach(c => set.add(c));
    }
    if (!isWarehouseOnly && !isInternetCafe) {
      ['invoices_in','invoices_out'].forEach(c => set.add(c));
    }

    const grouped = {};
    meta.forEach(m => {
      if (set.has(m.code)) {
        grouped[m.category] = grouped[m.category] || [];
        grouped[m.category].push(m.label);
      }
    });
    return grouped;
  };

  const handleEditStore = async (store) => {
    setSelectedStore(store);
    
    // تحميل أنواع المتاجر الحالية للمتجر
    let currentStoreTypes = [];
    try {
      const tenantTypes = await neonService.getTenantStoreTypes(store.id);
      currentStoreTypes = tenantTypes.map(t => t.store_type_id);
    } catch (error) {
      console.error('Load tenant store types error:', error);
    }
    
    setEditFormData({
      name: store.name || '',
      subscription_plan: store.subscription_plan || 'monthly',
      subscription_status: store.subscription_status || 'active',
      subscription_expires_at: store.subscription_expires_at ? formatDateForInput(store.subscription_expires_at) : '',
      store_type_ids: currentStoreTypes
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
        // التأكد من أن التاريخ بصيغة yyyy-MM-dd
        const dateStr = editFormData.subscription_expires_at;
        if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          updateData.subscription_expires_at = new Date(dateStr + 'T00:00:00').toISOString();
        } else {
          updateData.subscription_expires_at = new Date(dateStr).toISOString();
        }
      }

      await neonService.updateTenant(selectedStore.id, updateData);

      // تحديث أنواع المتاجر
      // 1. حذف الأنواع الحالية
      const currentTypes = await neonService.getTenantStoreTypes(selectedStore.id);
      for (const currentType of currentTypes) {
        await neonService.removeStoreTypeFromTenant(selectedStore.id, currentType.store_type_id);
      }
      
      // 2. إضافة الأنواع الجديدة
      if (editFormData.store_type_ids && editFormData.store_type_ids.length > 0) {
        for (let i = 0; i < editFormData.store_type_ids.length; i++) {
          const storeTypeId = editFormData.store_type_ids[i];
          await neonService.addStoreTypeToTenant(
            selectedStore.id,
            storeTypeId,
            i === 0, // الأول هو الرئيسي
            i // الأولوية
          );
        }
      }

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

  const handleEditTrialPeriod = (store) => {
    setSelectedStore(store);
    // حساب الأيام المتبقية من الفترة التجريبية
    const currentExpiry = store.subscription_expires_at ? new Date(store.subscription_expires_at) : new Date();
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((currentExpiry - now) / (1000 * 60 * 60 * 24)));
    
    setTrialPeriodFormData({
      trialDays: daysRemaining > 0 ? daysRemaining : 15,
      customExpiryDate: store.subscription_expires_at ? store.subscription_expires_at.split('T')[0] : ''
    });
    setTrialPeriodDialogOpen(true);
  };

  const handleUpdateTrialPeriod = async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      let expiryDate;
      
      if (trialPeriodFormData.customExpiryDate) {
        expiryDate = new Date(trialPeriodFormData.customExpiryDate);
      } else {
        // حساب من اليوم الحالي
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(trialPeriodFormData.trialDays));
      }

      await neonService.updateTenant(selectedStore.id, {
        subscription_expires_at: expiryDate.toISOString(),
        subscription_plan: 'trial',
        subscription_status: 'trial'
      });

      toast({ 
        title: "تم بنجاح", 
        description: `تم تحديث الفترة التجريبية للمتجر "${selectedStore.name}" إلى ${trialPeriodFormData.trialDays} يوم`,
        variant: "default"
      });

      setTrialPeriodDialogOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (error) {
      console.error('Update trial period error:', error);
      toast({ 
        title: "خطأ", 
        description: error.message || "حدث خطأ أثناء تحديث الفترة التجريبية",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
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

  const handleAddStoreContent = async () => {
    if (!selectedStore || !contentFormData.content) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      let parsedContent = [];
      
      // محاولة تحليل JSON
      try {
        parsedContent = JSON.parse(contentFormData.content);
        if (!Array.isArray(parsedContent)) {
          parsedContent = [parsedContent];
        }
      } catch (e) {
        // إذا لم يكن JSON، تحويله إلى قائمة
        const lines = contentFormData.content.split('\n').filter(line => line.trim());
        parsedContent = lines.slice(0, contentFormData.count).map((line, index) => {
          const parts = line.trim().split(/[,\t]/).map(p => p.trim());
          return {
            name: parts[0] || `عنصر ${index + 1}`,
            ...(parts[1] && { price: parseFloat(parts[1]) || 0 }),
            ...(parts[2] && { category: parts[2] }),
            ...(parts[3] && { description: parts[3] })
          };
        });
      }

      // تقييد العدد
      parsedContent = parsedContent.slice(0, contentFormData.count);

      // إضافة المحتوى حسب النوع
      let addedCount = 0;
      for (const item of parsedContent) {
        try {
          switch (contentFormData.type) {
            case 'products':
              // إضافة منتج (يتطلب جدول products)
              // await neonService.createProduct({ ...item, tenant_id: selectedStore.id });
              break;
            case 'categories':
              // إضافة فئة
              // await neonService.createCategory({ ...item, tenant_id: selectedStore.id });
              break;
            case 'customers':
              await neonService.createPartner({
                name: item.name || `عميل ${addedCount + 1}`,
                type: 'Customer',
                phone: item.phone || '',
                email: item.email || '',
                address: item.address || '',
                ...item
              }, selectedStore.id);
              addedCount++;
              break;
            case 'employees':
              await neonService.createEmployee({
                name: item.name || `موظف ${addedCount + 1}`,
                position: item.position || 'موظف',
                phone: item.phone || '',
                email: item.email || '',
                salary: item.salary || 0,
                status: 'Active',
                ...item
              }, selectedStore.id);
              addedCount++;
              break;
            case 'inventory':
              await neonService.createInventory({
                name: item.name || `صنف ${addedCount + 1}`,
                quantity: item.quantity || 0,
                unit_price: item.price || item.unit_price || 0,
                category: item.category || '',
                ...item
              }, selectedStore.id);
              addedCount++;
              break;
          }
        } catch (err) {
          console.error(`Error adding ${contentFormData.type} item:`, err);
        }
      }

      // تسجيل في سجل التغييرات
      await neonService.log(user.tenant_id || selectedStore.id, user.id, 'ADD_STORE_CONTENT', {
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        contentType: contentFormData.type,
        itemsCount: addedCount
      });

      toast({
        title: 'تم بنجاح',
        description: `تم إضافة ${addedCount} عنصر من نوع ${contentFormData.type} للمتجر "${selectedStore.name}"`,
        variant: 'default'
      });

      setContentDialogOpen(false);
      setContentFormData({ type: 'products', content: '', count: 1 });
    } catch (error) {
      console.error('Add store content error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إضافة المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('adminPanel.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('adminPanel.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button 
            onClick={() => {
              const allStoresData = stores.map(store => ({
                id: store.id,
                name: store.name,
                owner: store.owner_name,
                email: store.owner_email,
                plan: store.subscription_plan,
                status: store.subscription_status,
                expires_at: store.subscription_expires_at
              }));
              const blob = new Blob([JSON.stringify(allStoresData, null, 2)], { type: 'application/json' });
              const fileName = `all_stores_${new Date().toISOString().split('T')[0]}.json`;
              saveAs(blob, fileName);
              toast({ title: 'تم تصدير قائمة المتاجر', description: `تم تصدير ${stores.length} متجر` });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-medium rounded-lg"
          >
            <Download className="h-4 w-4" />
            تصدير قائمة المتاجر
          </Button>
          <Button 
            onClick={() => setDialogOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-medium rounded-lg"
          >
            <Plus className="h-4 w-4" />
            {t('adminPanel.createNewStore') || 'إنشاء متجر جديد'}
          </Button>
        </div>
      </div>
      {/* Admin sub-navigation: centralized admin links with icons */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <Link 
          to="/admin-settings" 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-medium"
        >
          <Shield className="h-4 w-4" />
          {t('adminPanel.adminSettings') || 'إعدادات المدير'}
        </Link>
        <Link 
          to="/rbac" 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-medium"
        >
          <Shield className="h-4 w-4" />
          {t('rbac.title') || 'إدارة الأدوار والصلاحيات (RBAC)'}
        </Link>
        <Link 
          to="/store-types" 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-medium"
        >
          <Store className="h-4 w-4" />
          {t('adminPanel.storeTypes') || 'أنواع المتاجر'}
        </Link>
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

          {/* إدارة الأقسام الظاهرة للمتاجر - محسّنة */}
          <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/20 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                  <FolderPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">إدارة الأقسام الظاهرة للمتاجر</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تخصيص الأقسام المرئية في الشريط الجانبي لكل متجر</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  onClick={() => setAllSectionVisibility(true)}
                  disabled={!selectedTenantId}
                >
                  <CheckCircle className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  onClick={() => setAllSectionVisibility(false)}
                  disabled={!selectedTenantId}
                >
                  <X className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                  إلغاء التحديد
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-1 space-y-3">
                <label className="block text-sm font-semibold mb-2 rtl:text-right text-gray-700 dark:text-gray-300">اختر المتجر</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => { setSelectedTenantId(e.target.value); loadSectionSettings(e.target.value); }}
                  className="w-full px-4 py-3 border-2 border-purple-200 dark:border-purple-700 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
                >
                  <option value="">— اختر المتجر —</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <Shield className="h-3 w-3 inline ml-1 rtl:mr-1 rtl:ml-0" />
                    عزل البيانات مضمون: كل متجر لديه إعداداته وقواعد بياناته الخاصة.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {availableSectionsAdmin.map(sec => {
                      const current = sectionSettings.find(s => s.section_code === sec.code);
                      const checked = current ? current.is_visible : true;
                      return (
                        <div
                          key={sec.code}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            checked 
                              ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                          }`}
                          onClick={() => toggleSectionVisibility(sec.code)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Switch checked={checked} onCheckedChange={() => toggleSectionVisibility(sec.code)} />
                            <div className="flex flex-col gap-1 flex-1">
                              <span className={`text-sm font-medium ${checked ? 'text-purple-900 dark:text-purple-100' : 'text-gray-800 dark:text-gray-200'}`}>
                                {sec.title}
                              </span>
                              <span className="text-[10px] px-2 py-[2px] rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 w-fit">
                                {sec.category}
                              </span>
                            </div>
                          </div>
                          {checked && (
                            <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveSectionSettings} disabled={savingSections || !selectedTenantId} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                {savingSections ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ الأقسام'
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Store Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('adminPanel.createNewStore')}</DialogTitle>
                <DialogDescription>
                  قم بإنشاء متجر جديد وإعداد حساب مديره
                </DialogDescription>
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
                    <label className="block text-sm font-medium mb-2 rtl:text-right">أنواع المتاجر (يمكن اختيار أكثر من نوع)</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                        {storeTypes.length === 0 ? (
                            <p className="text-sm text-gray-500">لا توجد أنواع متاجر متاحة</p>
                        ) : (
                            storeTypes.map(type => {
                                const name = (type.name_ar || type.name || '').toLowerCase();
                                const isInternet = name.includes('انترنت') || name.includes('صالة') || name.includes('internet');
                                const isFuel = name.includes('محروقات') || name.includes('fuel');
                                const isWarehouse = name.includes('مستودع') || name.includes('warehouse');
                                const isContractor = name.includes('مقاول') || name.includes('مواد بناء') || name.includes('contractor');
                                const IconComp = isInternet ? Cpu : isFuel ? Fuel : isWarehouse ? Warehouse : isContractor ? Building : Store;
                                return (
                                <label key={type.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.store_type_ids?.includes(type.id) || false}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData({
                                                    ...formData,
                                                    store_type_ids: [...(formData.store_type_ids || []), type.id]
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    store_type_ids: formData.store_type_ids?.filter(id => id !== type.id) || []
                                                });
                                            }
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <IconComp className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{type.name_ar || type.name}</span>
                                    {type.description_ar && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">- {type.description_ar}</span>
                                    )}
                                </label>
                                );
                            })
                        )}
                    </div>
                    {formData.store_type_ids && formData.store_type_ids.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            تم اختيار {formData.store_type_ids.length} نوع متجر
                        </p>
                    )}
                    {/* Preview selected type sections */}
                    {formData.store_type_ids && formData.store_type_ids.length > 0 && (
                      <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">سيُعرض في الشريط الجانبي:</span>
                        </div>
                        {(() => {
                          const grouped = getSelectedTypeSectionPreview(formData.store_type_ids);
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.keys(grouped || {}).map(cat => (
                                <div key={cat} className="bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{cat}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {(grouped?.[cat] || []).map(lbl => (
                                      <span key={lbl} className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                        {lbl}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                </div>

                {/* Starter Kit: محتوى افتراضي سريع للانطلاق */}
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderPlus className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Starter Kit – إنشاء محتوى افتراضي</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">اختر الحزم التي ترغب بإضافتها تلقائياً بعد إنشاء المتجر (بيانات معزولة لكل متجر).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <Package className="h-4 w-4 text-indigo-600" />
                      <input
                        type="checkbox"
                        checked={starterKitOptions.seedProductsBasics}
                        onChange={(e) => setStarterKitOptions(prev => ({ ...prev, seedProductsBasics: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">منتجات أساسية (عينات)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <Users className="h-4 w-4 text-green-600" />
                      <input
                        type="checkbox"
                        checked={starterKitOptions.seedCustomersBasics}
                        onChange={(e) => setStarterKitOptions(prev => ({ ...prev, seedCustomersBasics: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">عملاء افتراضيون</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <ShoppingCart className="h-4 w-4 text-amber-600" />
                      <input
                        type="checkbox"
                        checked={starterKitOptions.seedVendorsBasics}
                        onChange={(e) => setStarterKitOptions(prev => ({ ...prev, seedVendorsBasics: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">موردون افتراضيون</span>
                    </label>
                  </div>
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
                        store_type_ids: []
                      });
                      setStarterKitOptions({
                        seedProductsBasics: true,
                        seedCustomersBasics: true,
                        seedVendorsBasics: true
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
                <DialogDescription>
                  قم بتعديل بيانات المتجر ونوعه واشتراكه
                </DialogDescription>
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
                    <label className="block text-sm font-medium mb-2 rtl:text-right">أنواع المتاجر (يمكن اختيار أكثر من نوع)</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                        {storeTypes.length === 0 ? (
                            <p className="text-sm text-gray-500">لا توجد أنواع متاجر متاحة</p>
                        ) : (
                            storeTypes.map(type => {
                                const name = (type.name_ar || type.name || '').toLowerCase();
                                const isInternet = name.includes('انترنت') || name.includes('صالة') || name.includes('internet');
                                const isFuel = name.includes('محروقات') || name.includes('fuel');
                                const isWarehouse = name.includes('مستودع') || name.includes('warehouse');
                                const isContractor = name.includes('مقاول') || name.includes('مواد بناء') || name.includes('contractor');
                                const IconComp = isInternet ? Cpu : isFuel ? Fuel : isWarehouse ? Warehouse : isContractor ? Building : Store;
                                return (
                                <label key={type.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editFormData.store_type_ids?.includes(type.id) || false}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setEditFormData({
                                                    ...editFormData,
                                                    store_type_ids: [...(editFormData.store_type_ids || []), type.id]
                                                });
                                            } else {
                                                setEditFormData({
                                                    ...editFormData,
                                                    store_type_ids: editFormData.store_type_ids?.filter(id => id !== type.id) || []
                                                });
                                            }
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <IconComp className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{type.name_ar || type.name}</span>
                                    {type.description_ar && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">- {type.description_ar}</span>
                                    )}
                                </label>
                                );
                            })
                        )}
                    </div>
                    {editFormData.store_type_ids && editFormData.store_type_ids.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            تم اختيار {editFormData.store_type_ids.length} نوع متجر
                        </p>
                    )}
                    {/* Preview selected type sections for edit */}
                    {editFormData.store_type_ids && editFormData.store_type_ids.length > 0 && (
                      <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">سيُعرض في الشريط الجانبي:</span>
                        </div>
                        {(() => {
                          const grouped = getSelectedTypeSectionPreview(editFormData.store_type_ids);
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.keys(grouped || {}).map(cat => (
                                <div key={cat} className="bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{cat}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {(grouped?.[cat] || []).map(lbl => (
                                      <span key={lbl} className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                        {lbl}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
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
                <DialogDescription>
                  قم بتمديد اشتراك المتجر المحدد
                </DialogDescription>
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

      {/* Edit Trial Period Dialog */}
      <Dialog open={trialPeriodDialogOpen} onOpenChange={setTrialPeriodDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  ⏰ تعديل الفترة التجريبية
                </DialogTitle>
                <DialogDescription>
                  قم بتعديل الفترة التجريبية للمتجر "{selectedStore?.name}"
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <label className="block text-sm font-medium mb-2 rtl:text-right">
                      عدد الأيام التجريبية
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={trialPeriodFormData.trialDays}
                        onChange={(e) => setTrialPeriodFormData({ 
                          ...trialPeriodFormData, 
                          trialDays: parseInt(e.target.value) || 15 
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                        placeholder="15"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 rtl:text-right">
                      سيتم حساب تاريخ الانتهاء من اليوم الحالي
                    </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300 rtl:text-right">
                      <strong>تاريخ الانتهاء المتوقع:</strong>{' '}
                      {trialPeriodFormData.trialDays > 0 
                        ? formatDateAR(new Date(Date.now() + trialPeriodFormData.trialDays * 24 * 60 * 60 * 1000).toISOString())
                        : '-'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 rtl:text-right">
                      أو حدد تاريخ انتهاء محدد
                    </label>
                    <input
                        type="date"
                        value={trialPeriodFormData.customExpiryDate}
                        onChange={(e) => setTrialPeriodFormData({ 
                          ...trialPeriodFormData, 
                          customExpiryDate: e.target.value 
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 rtl:text-right">
                      إذا حددت تاريخاً محدداً، سيتم تجاهل عدد الأيام
                    </p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={() => setTrialPeriodDialogOpen(false)}
                        variant="outline"
                        className="flex-1"
                    >
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleUpdateTrialPeriod}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                                جاري التحديث...
                            </>
                        ) : (
                            <>
                                <Clock className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                                حفظ التغييرات
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Support Tickets Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">تذاكر طلب الدعم</h2>
          </div>
          <Button
            onClick={fetchSupportTickets}
            variant="outline"
            size="sm"
            disabled={loadingTickets}
          >
            {loadingTickets ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'تحديث'
            )}
          </Button>
        </div>

        {loadingTickets ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : supportTickets.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            لا توجد تذاكر دعم حالياً
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Pagination controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                إجمالي: {supportTickets.length} — الصفحة {ticketPage} من {Math.max(1, Math.ceil(supportTickets.length / ticketsPerPage))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                  disabled={ticketPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTicketPage(p => Math.min(Math.ceil(supportTickets.length / ticketsPerPage), p + 1))}
                  disabled={ticketPage >= Math.ceil(supportTickets.length / ticketsPerPage)}
                >
                  التالي
                </Button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المتجر</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الموضوع</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الأولوية</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {supportTickets
                  .slice((ticketPage - 1) * ticketsPerPage, ticketPage * ticketsPerPage)
                  .map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {ticket.tenant_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {ticket.user_name || ticket.user_email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {ticket.subject}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        ticket.status === 'closed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {ticket.status === 'resolved' ? 'محلول' :
                         ticket.status === 'in_progress' ? 'قيد المعالجة' :
                         ticket.status === 'closed' ? 'مغلق' : 'مفتوح'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {ticket.priority === 'urgent' ? 'عاجل' :
                       ticket.priority === 'high' ? 'عالية' :
                       ticket.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateAR(ticket.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openTicketMessages(ticket)}
                          className="text-blue-600 hover:text-blue-700"
                          title="عرض الرسائل والرد"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        {ticket.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResolveTicket(ticket.id)}
                            className="text-green-600 hover:text-green-700"
                            title="حل التذكرة"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="text-red-600 hover:text-red-700"
                          title="حذف التذكرة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Messages Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>رسائل التذكرة</DialogTitle>
            <DialogDescription>
              {selectedTicket ? `${selectedTicket.tenant_name || ''} - ${selectedTicket.subject || ''}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : ticketMessages.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">لا توجد رسائل بعد</p>
            ) : (
              <div className="space-y-3">
                {/* Pagination controls for messages */}
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    إجمالي: {ticketMessages.length} — الصفحة {messagePage} من {Math.max(1, Math.ceil(ticketMessages.length / messagesPerPage))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessagePage(p => Math.max(1, p - 1))}
                      disabled={messagePage === 1}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessagePage(p => Math.min(Math.ceil(ticketMessages.length / messagesPerPage), p + 1))}
                      disabled={messagePage >= Math.ceil(ticketMessages.length / messagesPerPage)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
                {ticketMessages
                  .slice((messagePage - 1) * messagesPerPage, messagePage * messagesPerPage)
                  .map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border ${msg.is_from_admin ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {msg.is_from_admin ? 'المدير' : (msg.user_name || msg.user_email || 'مستخدم')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateAR(msg.created_at)}
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1 rtl:text-right">اكتب ردك</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اكتب رسالة للرد على التذكرة..."
              />
              <div className="flex justify-end mt-2">
                <Button
                  onClick={sendTicketReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      إرسال الرد
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
