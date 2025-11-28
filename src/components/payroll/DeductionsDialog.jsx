import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const DeductionsDialog = ({ open, onOpenChange, employee, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'loan',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        type: 'loan',
        amount: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: ''
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employee || !user?.tenant_id) return;

    try {
      setLoading(true);
      await neonService.createDeduction(user.tenant_id, {
        employee_id: employee.employee_id || employee.id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: 'active',
        notes: formData.notes
      });

      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة الخصم بنجاح'
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Create deduction error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إضافة الخصم',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة خصم - {employee.name}</DialogTitle>
          <DialogDescription>
            إضافة خصم جديد للموظف (قرض، غرامة، تأمين، ضريبة)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">نوع الخصم *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="loan">قرض</option>
              <option value="fine">غرامة</option>
              <option value="insurance">تأمين</option>
              <option value="tax">ضريبة</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">المبلغ *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">التكرار *</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="once">مرة واحدة</option>
              <option value="monthly">شهري</option>
              <option value="weekly">أسبوعي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ البدء *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>

          {formData.frequency !== 'once' && (
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ الانتهاء (اختياري)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeductionsDialog;

