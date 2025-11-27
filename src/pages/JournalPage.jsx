import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Download, Calendar, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR } from '@/lib/dateUtils';
import GlassCard from '@/components/ui/GlassCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const JournalPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [lines, setLines] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user?.tenant_id) loadEntries();
  }, [user, startDate, endDate]);

  const loadEntries = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      setEntries([]);
      return;
    }

    try {
      const data = await neonService.getJournalEntries(user.tenant_id, startDate, endDate);
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load journal entries error:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'حدث خطأ في تحميل البيانات',
        variant: "destructive"
      });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEntry = async (entry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
    try {
      const entryLines = await neonService.getJournalLines(entry.id, user.tenant_id);
      setLines(entryLines || []);
    } catch (error) {
      console.error('Load journal lines error:', error);
      toast({
        title: t('common.error'),
        description: 'حدث خطأ في تحميل قيود القيد',
        variant: "destructive"
      });
      setLines([]);
    }
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Helmet><title>اليومية المحاسبية</title></Helmet>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 rtl:text-right">
          اليومية المحاسبية
        </h1>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-sm font-medium mb-2 rtl:text-right">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 sm:flex-initial">
            <label className="block text-sm font-medium mb-2 rtl:text-right">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <Button
            onClick={loadEntries}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
          >
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            تصفية
          </Button>
        </div>
      </GlassCard>

      {/* Entries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد قيود محاسبية</p>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {entries.map(entry => (
                <GlassCard key={entry.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {entry.entry_number || 'بدون رقم'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {entry.entry_date ? formatDateAR(entry.entry_date) : '-'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewEntry(entry)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {entry.description}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">عدد القيود: {entry.lines_count || 0}</span>
                    <span className="font-semibold text-orange-500">
                      {parseFloat(entry.total_amount || 0).toLocaleString('ar-EG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} {entry.currency || 'TRY'}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <GlassCard className="overflow-x-auto">
                <table className="w-full text-sm rtl:text-right">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="p-4 text-sm font-semibold">رقم القيد</th>
                      <th className="p-4 text-sm font-semibold">التاريخ</th>
                      <th className="p-4 text-sm font-semibold">الوصف</th>
                      <th className="p-4 text-sm font-semibold">عدد القيود</th>
                      <th className="p-4 text-sm font-semibold">المبلغ</th>
                      <th className="p-4 text-sm font-semibold">العملة</th>
                      <th className="p-4 text-sm font-semibold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="p-4">{entry.entry_number || '-'}</td>
                        <td className="p-4">{entry.entry_date ? formatDateAR(entry.entry_date) : '-'}</td>
                        <td className="p-4">{entry.description || '-'}</td>
                        <td className="p-4">{entry.lines_count || 0}</td>
                        <td className="p-4 font-semibold">
                          {parseFloat(entry.total_amount || 0).toLocaleString('ar-EG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="p-4">{entry.currency || 'TRY'}</td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewEntry(entry)}
                          >
                            <Eye className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                            عرض
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          </>
        )}
      </div>

      {/* Entry Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل القيد: {selectedEntry?.entry_number || '-'}</DialogTitle>
            <DialogDescription>
              {selectedEntry?.description || ''} - {selectedEntry?.entry_date ? formatDateAR(selectedEntry.entry_date) : ''}
            </DialogDescription>
          </DialogHeader>

          {lines.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm rtl:text-right">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="p-3 text-sm font-semibold">نوع الحساب</th>
                      <th className="p-3 text-sm font-semibold">اسم الحساب</th>
                      <th className="p-3 text-sm font-semibold">مدين</th>
                      <th className="p-3 text-sm font-semibold">دائن</th>
                      <th className="p-3 text-sm font-semibold">الوصف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lines.map((line, index) => (
                      <tr key={line.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="p-3">{line.account_type || '-'}</td>
                        <td className="p-3">{line.account_name || '-'}</td>
                        <td className="p-3 font-semibold text-red-500">
                          {parseFloat(line.debit_amount || 0) > 0
                            ? parseFloat(line.debit_amount).toLocaleString('ar-EG', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })
                            : '-'}
                        </td>
                        <td className="p-3 font-semibold text-green-500">
                          {parseFloat(line.credit_amount || 0) > 0
                            ? parseFloat(line.credit_amount).toLocaleString('ar-EG', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })
                            : '-'}
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">{line.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2 dark:border-gray-700">
                      <td colSpan="2" className="p-3 text-right">المجموع:</td>
                      <td className="p-3 text-red-500">
                        {calculateTotals().totalDebit.toLocaleString('ar-EG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-3 text-green-500">
                        {calculateTotals().totalCredit.toLocaleString('ar-EG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          calculateTotals().isBalanced
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {calculateTotals().isBalanced ? 'متوازن' : 'غير متوازن'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا توجد قيود</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalPage;

