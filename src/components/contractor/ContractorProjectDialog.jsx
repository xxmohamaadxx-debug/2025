import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES } from '@/lib/constants';
import HelpButton from '@/components/ui/HelpButton';

const ContractorProjectDialog = ({ open, onOpenChange, project, partners, onSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    estimated_cost: '',
    contract_value: '',
    currency: 'USD',
    status: 'planning',
    project_type: '',
    location: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    if (project && open) {
      setFormData({
        project_code: project.project_code || '',
        project_name: project.project_name || '',
        client_id: project.client_id || '',
        start_date: project.start_date ? project.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        estimated_cost: project.estimated_cost || '',
        contract_value: project.contract_value || '',
        currency: project.currency || 'TRY',
        status: project.status || 'planning',
        project_type: project.project_type || '',
        location: project.location || '',
        description: project.description || '',
        notes: project.notes || ''
      });
    } else if (open) {
      const today = new Date();
      setFormData({
        project_code: '',
        project_name: '',
        client_id: '',
        start_date: today.toISOString().split('T')[0],
        end_date: '',
        estimated_cost: '',
        contract_value: '',
        currency: 'USD',
        status: 'planning',
        project_type: '',
        location: '',
        description: '',
        notes: ''
      });
    }
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      estimated_cost: parseFloat(formData.estimated_cost || 0),
      contract_value: parseFloat(formData.contract_value || 0)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <HelpButton
          position="top-right"
          helpTextAr="هنا يمكنك إدخال أو تعديل مشروع مقاول. أدخل كود المشروع، الاسم، العميل، تاريخ البدء والانتهاء، التكلفة المقدرة، قيمة العقد، العملة، الحالة (تخطيط، قيد التنفيذ، مكتمل)، نوع المشروع، والموقع. يمكنك ربط المشروع بجدول الكميات (BOQ)."
          helpTextEn="Here you can add or edit a contractor project. Enter the project code, name, client, start and end dates, estimated cost, contract value, currency, status (planning, in progress, completed), project type, and location. You can link the project to a Bill of Quantities (BOQ)."
          helpTextTr="Burada bir müteahhit projesi ekleyebilir veya düzenleyebilirsiniz. Proje kodunu, adını, müşteriyi, başlangıç ve bitiş tarihlerini, tahmini maliyeti, sözleşme değerini, para birimini, durumu (planlama, devam ediyor, tamamlandı), proje türünü ve konumu girin. Projeyi bir Miktar Listesi (BOQ) ile bağlayabilirsiniz."
        />
        <DialogHeader>
          <DialogTitle>
            {project ? 'تعديل مشروع' : 'إضافة مشروع جديد'}
          </DialogTitle>
          <DialogDescription>
            {project ? 'قم بتعديل بيانات المشروع' : 'قم بإدخال بيانات مشروع جديد للمقاول'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">كود المشروع *</label>
              <input
                type="text"
                required
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="PROJ-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">اسم المشروع *</label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="مشروع بناء فيلا"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">العميل</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر العميل</option>
                {partners.filter(p => p.type === 'Customer').map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">نوع المشروع</label>
              <input
                type="text"
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="بناء، ترميم، صيانة..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ البداية *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">تاريخ النهاية</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">التكلفة التقديرية</label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">قيمة العقد *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">العملة *</label>
              <select
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="TRY">₺ ليرة تركية (TRY)</option>
                <option value="SYP">£S ليرة سورية (SYP)</option>
                <option value="SAR">﷼ ريال سعودي (SAR)</option>
                <option value="EUR">€ يورو (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 rtl:text-right">الحالة *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="planning">قيد التخطيط</option>
                <option value="active">نشط</option>
                <option value="on_hold">متوقف</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 rtl:text-right">موقع المشروع</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="عنوان المشروع"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="3"
              placeholder="وصف المشروع"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 rtl:text-right">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              rows="2"
              placeholder="ملاحظات إضافية"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractorProjectDialog;

