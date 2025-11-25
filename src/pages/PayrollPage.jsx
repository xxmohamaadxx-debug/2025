import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import PayrollDialog from '@/components/payroll/PayrollDialog';
import PayrollTable from '@/components/payroll/PayrollTable';
import Logo from '@/components/Logo';

const PayrollPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [payrollData, employeesData] = await Promise.all([
        neonService.getPayroll(user.tenant_id).catch(() => []),
        neonService.getEmployees(user.tenant_id).catch(() => [])
      ]);
      setPayrolls(payrollData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Load data error:', error);
      toast({ title: 'خطأ في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) {
      toast({ 
        title: "خطأ", 
        description: "لا يمكن حفظ البيانات. يجب أن تكون مرتبطاً بمتجر.",
        variant: "destructive" 
      });
      return;
    }

    try {
      const netSalary = (parseFloat(data.base_salary || 0) + parseFloat(data.bonuses || 0)) - parseFloat(data.deductions || 0);
      await neonService.createPayroll({
        ...data,
        net_salary: netSalary,
        month: data.month || new Date().getMonth() + 1,
        year: data.year || new Date().getFullYear()
      }, user.tenant_id);
      
      await neonService.log(user.tenant_id, user.id, 'GENERATE_PAYROLL', `تم إنشاء راتب لـ ${data.employee_name}`);
      toast({ title: 'تم إضافة البيانات بنجاح' });
      loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Save payroll error:', error);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: error.message || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل الراتب هذا؟')) return;
    
    try {
      await neonService.deletePayroll(id, user.tenant_id);
      toast({ title: 'تم حذف السجل' });
      loadData();
    } catch (error) {
      toast({ title: 'خطأ في الحذف', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('common.payroll')} - {t('common.systemName')}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Logo size="md" showText={false} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {t('common.payroll')}
            </h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إنشاء راتب
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <PayrollTable payrolls={payrolls} onDelete={handleDelete} />
        </div>

        <PayrollDialog 
            open={dialogOpen} 
            onOpenChange={setDialogOpen} 
            employees={employees}
            onSave={handleSave} 
        />
      </div>
    </>
  );
};

export default PayrollPage;
