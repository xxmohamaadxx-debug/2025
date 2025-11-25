
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Download, Loader2 } from 'lucide-react';
import InvoiceDialog from '@/components/invoices/InvoiceDialog';
import InvoiceTable from '@/components/invoices/InvoiceTable';
import { toast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo';

const InvoicesOutPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      const data = await neonService.getInvoicesOut(user.tenant_id);
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

  const handleSave = async (invoiceData) => {
    if (!user?.tenant_id) {
      toast({ 
        title: "خطأ", 
        description: "لا يمكن حفظ البيانات. يجب أن تكون مرتبطاً بمتجر.",
        variant: "destructive" 
      });
      return;
    }

    try {
      if (selectedInvoice) {
        await neonService.updateInvoiceOut(selectedInvoice.id, invoiceData, user.tenant_id);
        toast({ title: "تم تحديث البيانات بنجاح" });
      } else {
        await neonService.createInvoiceOut({
          ...invoiceData,
          date: invoiceData.date || new Date().toISOString().split('T')[0],
        }, user.tenant_id);
        toast({ title: "تم إضافة البيانات بنجاح" });
      }
      setDialogOpen(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (error) {
      console.error('Invoice save error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: error.message || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    
    try {
      await neonService.deleteInvoiceOut(id, user.tenant_id);
      toast({ title: t('common.success') });
      loadInvoices();
    } catch (error) {
      toast({ title: t('common.error'), variant: "destructive" });
    }
  };

  const filteredInvoices = invoices.filter((inv) =>
    inv.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.amount?.toString().includes(searchTerm)
  );

  return (
    <>
      <Helmet>
        <title>{t('nav.invoicesOut')} - Ibrahim Accounting System</title>
        <meta name="description" content="Manage outgoing invoices and expense tracking" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Logo size="md" showText={false} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {t('nav.invoicesOut')}
            </h1>
          </div>
          <Button
            onClick={() => {
              setSelectedInvoice(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('common.add')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <Button variant="outline" onClick={() => toast({ title: '🚧 هذه الميزة غير متاحة حالياً' })}>
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </Button>
            <Button variant="outline" onClick={() => toast({ title: '🚧 هذه الميزة غير متاحة حالياً' })}>
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <InvoiceTable
              invoices={filteredInvoices}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={selectedInvoice}
        onSave={handleSave}
        type="out"
      />
    </>
  );
};

export default InvoicesOutPage;
