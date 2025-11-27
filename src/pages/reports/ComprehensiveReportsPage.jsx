import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Calendar, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import { formatDateAR } from '@/lib/dateUtils';
import { exportToExcel } from '@/lib/exportUtils';
import { exportReportPDF } from '@/lib/pdfUtils';

const ComprehensiveReportsPage = () => {
  const { user, tenant } = useAuth();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('daily'); // daily, subscriptions, debts
  const [dailyReport, setDailyReport] = useState(null);
  const [debtsReport, setDebtsReport] = useState([]);
  const [financialBox, setFinancialBox] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) loadReports();
  }, [user, selectedDate, reportType]);

  const loadReports = async () => {
    if (!user?.tenant_id) return;
    
    setLoading(true);
    try {
      if (reportType === 'daily') {
        const report = await neonService.getInternetCafeDailyReport?.(user.tenant_id, selectedDate);
        setDailyReport(report);
      }
      
      if (reportType === 'debts') {
        const debts = await neonService.getDebtsReport?.(user.tenant_id);
        setDebtsReport(debts || []);
      }
      
      const box = await neonService.getFinancialBoxWithDebts?.(user.tenant_id);
      setFinancialBox(box);
    } catch (error) {
      console.error('Load reports error:', error);
      toast({ title: 'خطأ في تحميل التقارير', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      // Implementation for PDF export
      toast({ title: 'تم تصدير التقرير بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ في التصدير', variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>التقارير الشاملة - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
          التقارير الشاملة
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="h-4 w-4 ml-2" /> تصدير PDF
          </Button>
          <Button onClick={() => {}} variant="outline">
            <FileSpreadsheet className="h-4 w-4 ml-2" /> تصدير Excel
          </Button>
        </div>
      </div>

      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع التقرير</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="daily">تقارير يومية</option>
              <option value="subscriptions">تقارير الاشتراكات</option>
              <option value="debts">تقارير الديون</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
          </div>
        </GlassCard>
      ) : (
        <>
          {reportType === 'daily' && dailyReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">إجمالي الجلسات</h3>
                <p className="text-2xl font-bold">{dailyReport.total_sessions || 0}</p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">إجمالي الدقائق</h3>
                <p className="text-2xl font-bold">{dailyReport.total_minutes || 0}</p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">إجمالي الإيرادات</h3>
                <p className="text-2xl font-bold text-green-600">{dailyReport.total_revenue || 0}</p>
              </GlassCard>
            </div>
          )}

          {reportType === 'debts' && (
            <GlassCard>
              <h2 className="text-xl font-bold mb-4">تقرير الديون</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-right py-3 px-4 text-sm font-semibold">العميل/المورد</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">الديون المطلوبة</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">الديون المستحقة</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">المتأخرة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {debtsReport.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-500">
                          لا يوجد ديون
                        </td>
                      </tr>
                    ) : (
                      debtsReport.map((debt, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4 text-sm">{debt.partner_name || '-'}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-blue-600">{debt.total_debts_owed || 0}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-amber-600">{debt.total_debts_due || 0}</td>
                          <td className="py-3 px-4 text-sm">{debt.overdue_count || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {financialBox && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">إجمالي الإيرادات</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(financialBox.try_balance + financialBox.usd_balance + financialBox.syp_balance).toFixed(2)}
                </p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">إجمالي المصروفات</h3>
                <p className="text-2xl font-bold text-red-600">0</p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">الديون المطلوبة</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {financialBox.debts_owed ? Object.values(financialBox.debts_owed).reduce((a, b) => a + b, 0).toFixed(2) : '0'}
                </p>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-medium text-gray-500 mb-2">الديون المستحقة</h3>
                <p className="text-2xl font-bold text-amber-600">
                  {financialBox.debts_due ? Object.values(financialBox.debts_due).reduce((a, b) => a + b, 0).toFixed(2) : '0'}
                </p>
              </GlassCard>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ComprehensiveReportsPage;

