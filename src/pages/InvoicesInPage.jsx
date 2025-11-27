
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2, Search, Filter, Download, Printer, FileDown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import InvoiceDialog from '@/components/invoices/InvoiceDialog';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { exportInvoicePDF, printInvoice } from '@/lib/pdfUtils';
import { isOnline, storeOffline } from '@/lib/offlineService';
import GlassCard from '@/components/ui/GlassCard';
import journalService from '@/lib/journalService';

const InvoicesInPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('day'); // 'day', 'week', 'month', 'all'
  const [groupBy, setGroupBy] = useState('none'); // 'date', 'currency', 'category', 'none'

  useEffect(() => {
    if (user?.tenant_id) loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      setInvoices([]);
      return;
    }

    try {
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve([]), 8000)
      );
      
      const data = await Promise.race([
        neonService.getInvoicesIn(user.tenant_id).catch(() => []),
        timeoutPromise
      ]);
      
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load invoices error:', error);
      toast({ 
        title: t('common.error'), 
        description: error.message || 'حدث خطأ في تحميل البيانات',
        variant: "destructive" 
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedInvoice(null);
    setDialogOpen(true);
  };

  const handleEdit = async (invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
    // تحميل عناصر الفاتورة
    try {
      if (invoice?.id && user?.tenant_id) {
        const items = await neonService.getInvoiceItems(invoice.id, 'invoice_in', user.tenant_id);
        // سيتم تحميل العناصر في InvoiceDialog
      }
    } catch (error) {
      console.error('Load invoice items error:', error);
    }
  };

  const handleSave = async (data, items = []) => {
    if (!user?.tenant_id) {
      toast({ 
        title: "خطأ", 
        description: "لا يمكن حفظ البيانات. يجب أن تكون مرتبطاً بمتجر.",
        variant: "destructive" 
      });
      return;
    }

    try {
      const invoiceData = {
        ...data,
        date: data.date || new Date().toISOString().split('T')[0],
      };

      // التحقق من حالة الإنترنت
      if (!isOnline()) {
        // حفظ محلياً في Offline Mode
        await storeOffline('invoices_in', selectedInvoice ? 'update' : 'create', {
          ...invoiceData,
          items: items || []
        }, user.tenant_id, user.id);
        
        toast({ 
          title: "تم حفظ البيانات محلياً",
          description: "سيتم رفعها تلقائياً عند الاتصال بالإنترنت"
        });
        setDialogOpen(false);
        setSelectedInvoice(null);
        // تحميل من localStorage في وضع Offline
        return;
      }

      if (selectedInvoice) {
        await neonService.updateInvoiceIn(selectedInvoice.id, invoiceData, user.tenant_id);
        // تحديث عناصر الفاتورة
        if (items && items.length > 0) {
          await neonService.updateInvoiceItems(selectedInvoice.id, 'invoice_in', items, user.tenant_id);
        }
        toast({ title: "تم تحديث البيانات بنجاح" });
      } else {
        const newInvoice = await neonService.createInvoiceIn(invoiceData, user.tenant_id, items);
        
        // إنشاء قيد يومية تلقائي
        try {
          await journalService.createInvoiceInJournal(
            { ...invoiceData, id: newInvoice.id },
            items,
            user.tenant_id,
            user.id
          );
        } catch (journalError) {
          console.error('Journal entry creation error:', journalError);
          // لا نوقف العملية إذا فشل تسجيل اليومية
          toast({
            title: "تم إضافة الفاتورة",
            description: "تم إضافة الفاتورة لكن فشل تسجيل اليومية المحاسبية",
            variant: "default"
          });
        }
        
        toast({ title: "تم إضافة البيانات بنجاح" });
      }
      setDialogOpen(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (error) {
      console.error('Invoice save error:', error);
      
      // في حالة الخطأ، حاول الحفظ محلياً
      if (!isOnline()) {
        try {
          await storeOffline('invoices_in', selectedInvoice ? 'update' : 'create', {
            ...data,
            items: items || []
          }, user.tenant_id, user.id);
          toast({ 
            title: "تم حفظ البيانات محلياً",
            description: "سيتم رفعها تلقائياً عند الاتصال بالإنترنت"
          });
          setDialogOpen(false);
          setSelectedInvoice(null);
          return;
        } catch (offlineError) {
          console.error('Offline save error:', offlineError);
        }
      }
      
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: error.message || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>{t('common.invoicesIn')}</title></Helmet>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('common.invoicesIn')}</h1>
        </div>
        <Button onClick={handleCreate} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('common.add')}
        </Button>
      </div>

      {/* Filters and Search */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في الواردات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <select
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">جميع العملات</option>
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="SYP">SYP</option>
          </select>
          <input
            type="text"
            placeholder="التصنيف"
            value={filterCategory === 'all' ? '' : filterCategory}
            onChange={(e) => setFilterCategory(e.target.value || 'all')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          />
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="day">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="all">الكل</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="none">بدون تجميع</option>
            <option value="date">تجميع حسب التاريخ</option>
            <option value="currency">تجميع حسب العملة</option>
            <option value="category">تجميع حسب التصنيف</option>
          </select>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {loading ? <Loader2 className="animate-spin mx-auto" /> : (
          (() => {
            // Filter by period first
            const now = new Date();
            let startDate = null;
            
            if (filterPeriod === 'day') {
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (filterPeriod === 'week') {
              const dayOfWeek = now.getDay();
              const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
              startDate = new Date(now.setDate(diff));
              startDate.setHours(0, 0, 0, 0);
            } else if (filterPeriod === 'month') {
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            
            // Filter invoices
            let filteredInvoices = invoices.filter(inv => {
              // Period filter
              if (filterPeriod !== 'all' && startDate) {
                const invDate = new Date(inv.date || inv.created_at);
                if (invDate < startDate) return false;
              }
              
              const matchesSearch = !searchTerm || 
                inv.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.amount?.toString().includes(searchTerm);
              const matchesCurrency = filterCurrency === 'all' || inv.currency === filterCurrency;
              const matchesCategory = filterCategory === 'all' || inv.category === filterCategory;
              return matchesSearch && matchesCurrency && matchesCategory;
            });

            // Group invoices
            let groupedInvoices = {};
            if (groupBy !== 'none') {
              filteredInvoices.forEach(inv => {
                let key = '';
                if (groupBy === 'date') key = inv.date || 'بدون تاريخ';
                else if (groupBy === 'currency') key = inv.currency || 'بدون عملة';
                else if (groupBy === 'category') key = inv.category || 'بدون تصنيف';
                
                if (!groupedInvoices[key]) groupedInvoices[key] = [];
                groupedInvoices[key].push(inv);
              });
            }

            const displayInvoices = groupBy === 'none' ? filteredInvoices : Object.entries(groupedInvoices);

            if (displayInvoices.length === 0) {
              return <p className="text-center text-gray-500">{t('common.noData')}</p>;
            }

            return (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-4">
                  {groupBy === 'none' ? (
                    filteredInvoices.map(inv => (
                      <div key={inv.id} className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-4 rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                        style={{
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                        }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 pointer-events-none"
                          animate={{
                            background: [
                              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                              'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                            ],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <div className="relative z-10">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-500">{inv.date ? formatDateShort(inv.date) : '-'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white mb-2">{inv.description}</p>
                        {inv.partner_name && <p className="text-sm text-gray-500 mb-1">المورد: {inv.partner_name}</p>}
                        <div className="text-lg font-bold text-red-500 text-right">{inv.amount} {inv.currency}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(groupedInvoices).map(([key, group]) => (
                      <div key={key} className="space-y-2">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 p-2 bg-gray-100 dark:bg-gray-700 rounded">{key}</h3>
                        {group.map(inv => (
                          <div key={inv.id} className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl p-4 rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 mr-4 overflow-hidden"
                            style={{
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                            }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 pointer-events-none"
                              animate={{
                                background: [
                                  'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                                  'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                                  'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                                ],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />
                            <div className="relative z-10">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm text-gray-500">{inv.date ? formatDateShort(inv.date) : '-'}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white mb-2">{inv.description}</p>
                            {inv.partner_name && <p className="text-sm text-gray-500 mb-1">المورد: {inv.partner_name}</p>}
                            <div className="text-lg font-bold text-red-500 text-right">{inv.amount} {inv.currency}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 overflow-x-auto"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 pointer-events-none"
                    animate={{
                      background: [
                        'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                        'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                        'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <div className="relative z-10">
                  {groupBy === 'none' ? (
                    <table className="w-full text-left rtl:text-right">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="p-4 text-sm font-semibold">{t('common.date')}</th>
                          <th className="p-4 text-sm font-semibold">{t('common.description')}</th>
                          <th className="p-4 text-sm font-semibold">المورد</th>
                          <th className="p-4 text-sm font-semibold">{t('common.category')}</th>
                          <th className="p-4 text-sm font-semibold">{t('common.amount')}</th>
                          <th className="p-4 text-sm font-semibold">{t('common.currency')}</th>
                          <th className="p-4 text-sm font-semibold">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <td className="p-4 text-sm">{inv.date ? formatDateAR(inv.date) : '-'}</td>
                            <td className="p-4 text-sm">{inv.description || '-'}</td>
                            <td className="p-4 text-sm">{inv.partner_name || '-'}</td>
                            <td className="p-4 text-sm">{inv.category || '-'}</td>
                            <td className="p-4 text-sm font-bold text-red-500">{inv.amount || 0}</td>
                            <td className="p-4 text-sm">{inv.currency || 'TRY'}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleEdit(inv)}
                                  title="تعديل"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={async () => {
                                    try {
                                      const items = await neonService.getInvoiceItems(inv.id, 'invoice_in', user.tenant_id);
                                      await exportInvoicePDF(inv, 'in', tenant?.name, '/logo.png', inv.language || 'ar', items);
                                      toast({ title: 'تم تصدير PDF بنجاح' });
                                    } catch (error) {
                                      console.error('Export PDF error:', error);
                                      toast({ title: 'خطأ في التصدير', variant: "destructive" });
                                    }
                                  }}
                                  title="تصدير PDF"
                                >
                                  <FileDown className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={async () => {
                                    try {
                                      const items = await neonService.getInvoiceItems(inv.id, 'invoice_in', user.tenant_id);
                                      await printInvoice(inv, 'in', tenant?.name, '/logo.png', inv.language || 'ar', items);
                                    } catch (error) {
                                      console.error('Print error:', error);
                                      toast({ title: 'خطأ في الطباعة', variant: "destructive" });
                                    }
                                  }}
                                  title="طباعة"
                                >
                                  <Printer className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  if (window.confirm(t('common.confirmDelete'))) {
                                    try {
                                      await neonService.deleteInvoiceIn(inv.id, user.tenant_id);
                                      toast({ title: t('common.success') });
                                      loadInvoices();
                                    } catch (error) {
                                      toast({ title: t('common.error'), variant: "destructive" });
                                    }
                                  }
                                }}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    Object.entries(groupedInvoices).map(([key, group]) => (
                      <div key={key} className="mb-6">
                        <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                          {key}
                        </h3>
                        <table className="w-full text-left rtl:text-right">
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="p-4 text-sm font-semibold">{t('common.date')}</th>
                              <th className="p-4 text-sm font-semibold">{t('common.description')}</th>
                              <th className="p-4 text-sm font-semibold">المورد</th>
                              <th className="p-4 text-sm font-semibold">{t('common.category')}</th>
                              <th className="p-4 text-sm font-semibold">{t('common.amount')}</th>
                              <th className="p-4 text-sm font-semibold">{t('common.currency')}</th>
                              <th className="p-4 text-sm font-semibold">{t('common.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {group.map(inv => (
                              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <td className="p-4 text-sm">{inv.date ? formatDateAR(inv.date) : '-'}</td>
                                <td className="p-4 text-sm">{inv.description || '-'}</td>
                                <td className="p-4 text-sm">{inv.partner_name || '-'}</td>
                                <td className="p-4 text-sm">{inv.category || '-'}</td>
                                <td className="p-4 text-sm font-bold text-red-500">{inv.amount || 0}</td>
                                <td className="p-4 text-sm">{inv.currency || 'TRY'}</td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(inv)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={async () => {
                                        try {
                                          const items = await neonService.getInvoiceItems(inv.id, 'invoice_in', user.tenant_id);
                                          await exportInvoicePDF(inv, 'in', tenant?.name, '/logo.png', inv.language || 'ar', items);
                                          toast({ title: 'تم تصدير PDF بنجاح' });
                                        } catch (error) {
                                          console.error('Export PDF error:', error);
                                          toast({ title: 'خطأ في التصدير', variant: "destructive" });
                                        }
                                      }}
                                      title="تصدير PDF"
                                    >
                                      <FileDown className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={async () => {
                                        try {
                                          const items = await neonService.getInvoiceItems(inv.id, 'invoice_in', user.tenant_id);
                                          await printInvoice(inv, 'in', tenant?.name, '/logo.png', inv.language || 'ar', items);
                                        } catch (error) {
                                          console.error('Print error:', error);
                                          toast({ title: 'خطأ في الطباعة', variant: "destructive" });
                                        }
                                      }}
                                      title="طباعة"
                                    >
                                      <Printer className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={async () => {
                                      if (window.confirm(t('common.confirmDelete'))) {
                                        try {
                                          await neonService.deleteInvoiceIn(inv.id, user.tenant_id);
                                          toast({ title: t('common.success') });
                                          loadInvoices();
                                        } catch (error) {
                                          toast({ title: t('common.error'), variant: "destructive" });
                                        }
                                      }
                                    }}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                  </div>
                </div>
              </>
            );
          })()
        )}
      </div>
      <InvoiceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        invoice={selectedInvoice}
        onSave={handleSave}
        type="in"
      />
    </div>
  );
};

export default React.memo(InvoicesInPage);
