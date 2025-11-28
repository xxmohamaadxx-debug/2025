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
import DeductionsDialog from '@/components/payroll/DeductionsDialog';
import DeductionsDialog from '@/components/payroll/DeductionsDialog';

const PayrollPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [payrollData, employeesData, deductionsData] = await Promise.all([
        neonService.getPayroll(user.tenant_id).catch(() => []),
        neonService.getEmployees(user.tenant_id).catch(() => []),
        neonService.getDeductions?.(user.tenant_id).catch(() => [])
      ]);
      setPayrolls(payrollData || []);
      setEmployees(employeesData || []);
      setDeductions(deductionsData || []);
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
      
      // إنشاء سجل الراتب (is_paid = false افتراضياً)
      const payrollData = {
        ...data,
        net_salary: netSalary,
        month: data.month || new Date().getMonth() + 1,
        year: data.year || new Date().getFullYear(),
        is_paid: data.is_paid || false,
        created_by: user.id
      };
      
      await neonService.createPayroll(payrollData, user.tenant_id);
      
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

  const handlePaySalary = async (payrollId) => {
    if (!window.confirm('هل أنت متأكد من تسليم هذا الراتب؟ سيتم خصمه من الصندوق المالي.')) return;
    
    try {
      // تحديث الراتب ليكون مدفوعاً - سيتم خصمه تلقائياً من الصندوق عبر Trigger
      await neonService.updatePayroll(payrollId, {
        is_paid: true,
        paid_at: new Date().toISOString(),
        updated_by: user.id
      }, user.tenant_id);
      
      await neonService.log(user.tenant_id, user.id, 'PAY_SALARY', `تم تسليم راتب`);
      toast({ 
        title: 'تم تسليم الراتب بنجاح', 
        description: 'تم خصم المبلغ من الصندوق المالي'
      });
      loadData();
    } catch (error) {
      console.error('Pay salary error:', error);
      toast({ 
        title: 'خطأ في تسليم الراتب', 
        description: error.message || 'حدث خطأ أثناء تسليم الراتب',
        variant: 'destructive' 
      });
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {t('common.payroll')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> إنشاء راتب
            </Button>
            <Button 
              onClick={() => {
                if (employees.length === 0) {
                  toast({ 
                    title: 'تنبيه', 
                    description: 'لا يوجد موظفون. يرجى إضافة موظف أولاً.',
                    variant: 'destructive' 
                  });
                  return;
                }
                setSelectedEmployee(employees[0]);
                setDeductionDialogOpen(true);
              }} 
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400"
            >
              إدارة الخصومات
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <PayrollTable payrolls={payrolls} onDelete={handleDelete} onPay={handlePaySalary} />
        </div>

        <PayrollDialog 
            open={dialogOpen} 
            onOpenChange={setDialogOpen} 
            employees={employees}
            onSave={handleSave} 
        />
        
        <DeductionsDialog
          open={deductionDialogOpen}
          onOpenChange={setDeductionDialogOpen}
          employee={selectedEmployee}
          onSave={loadData}
        />
      </div>
    </>
  );
};

export default PayrollPage;
