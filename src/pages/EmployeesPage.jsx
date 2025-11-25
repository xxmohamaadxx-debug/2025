
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Trash2, Edit2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import EmployeeDialog from '@/components/employees/EmployeeDialog';
import EmployeeTable from '@/components/employees/EmployeeTable';

const EmployeesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (user?.tenant_id) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const data = await neonService.getEmployees(user.tenant_id);
      setEmployees(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
      if (selected) {
        await neonService.updateEmployee(selected.id, data, user.tenant_id);
        toast({ title: "تم تحديث البيانات بنجاح" });
      } else {
        await neonService.createEmployee(data, user.tenant_id);
        toast({ title: "تم إضافة البيانات بنجاح" });
      }
      setDialogOpen(false);
      setSelected(null);
      loadData();
    } catch (e) {
      console.error('Save employee error:', e);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: e.message || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm(t('common.confirmDelete'))) return;
    try {
      await neonService.deleteEmployee(id, user.tenant_id);
      loadData();
    } catch(e) { toast({ title: t('common.error'), variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>{t('common.employees')}</title></Helmet>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('common.employees')}</h1>
        </div>
        <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('common.add')}
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {loading ? <Loader2 className="animate-spin mx-auto"/> : employees.map((emp) => (
          <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
             <div className="flex justify-between items-start mb-2">
                <div>
                   <h3 className="font-bold text-gray-900 dark:text-white">{emp.name}</h3>
                   <p className="text-sm text-gray-500">{emp.position || 'N/A'}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{emp.status}</span>
             </div>
             <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setSelected(emp); setDialogOpen(true); }}>
                  <Edit2 className="h-4 w-4 text-blue-500" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(emp.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
             </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-x-auto">
        {loading ? <Loader2 className="animate-spin mx-auto"/> : 
          <EmployeeTable employees={employees} onEdit={(e) => { setSelected(e); setDialogOpen(true); }} onDelete={handleDelete} />
        }
      </div>
      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={selected} onSave={handleSave} />
    </div>
  );
};
export default React.memo(EmployeesPage);
