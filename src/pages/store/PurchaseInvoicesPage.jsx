import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import { formatDateAR } from '@/lib/dateUtils';
import InteractiveButton from '@/components/ui/InteractiveButton';
import PurchaseInvoiceDialog from '@/components/store/PurchaseInvoiceDialog';

const PurchaseInvoicesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('today');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await neonService.getPurchaseInvoices(user.tenant_id);
      setInvoices(data || []);
    } catch (error) {
      console.error('Load purchase invoices error:', error);
      toast({ title: 'خطأ في تحميل البيانات', variant: "destructive" });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterDate === 'today') {
      const today = new Date().toISOString().split('T')[0];
      const invoiceDate = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '';
      return matchesSearch && invoiceDate === today;
    }
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>فواتير المشتريات - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          فواتير المشتريات
        </h1>
        <Button 
          onClick={() => { setSelectedInvoice(null); setDialogOpen(true); }}
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إضافة فاتورة شراء
        </Button>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="بحث في الفواتير..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          />
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">الكل</option>
            <option value="today">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
          </select>
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-semibold">رقم الفاتورة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">التاريخ</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المورد</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">المبلغ</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">تاريخ الاستحقاق</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      لا يوجد فواتير
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm font-medium">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-sm">{invoice.date ? formatDateAR(invoice.date) : '-'}</td>
                      <td className="py-3 px-4 text-sm">-</td>
                      <td className="py-3 px-4 text-sm font-semibold">{invoice.total_amount} {invoice.currency}</td>
                      <td className="py-3 px-4 text-sm">{invoice.due_date ? formatDateAR(invoice.due_date) : '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <InteractiveButton variant="outline" size="sm" className="text-blue-600">
                            <Edit className="h-4 w-4" />
                          </InteractiveButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <PurchaseInvoiceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        invoice={selectedInvoice}
        onSave={async (data, items) => {
          try {
            if (selectedInvoice) {
              await neonService.updatePurchaseInvoice(selectedInvoice.id, data, user.tenant_id);
            } else {
              await neonService.createPurchaseInvoice(data, items, user.tenant_id);
            }
            toast({ title: "تم حفظ الفاتورة بنجاح" });
            setDialogOpen(false);
            loadData();
          } catch (error) {
            toast({ title: "خطأ في الحفظ", variant: "destructive" });
          }
        }}
      />
    </div>
  );
};

export default PurchaseInvoicesPage;

