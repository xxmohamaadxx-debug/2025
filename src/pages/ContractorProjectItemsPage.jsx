import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Edit, Trash2, FileText, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import ContractorProjectItemDialog from '@/components/contractor/ContractorProjectItemDialog';

const ContractorProjectItemsPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [itemsData, projectsData, unitsData, productsData] = await Promise.all([
        filterProjectId !== 'all'
          ? neonService.getProjectItems(user.tenant_id, filterProjectId)
          : neonService.getProjectItems(user.tenant_id),
        neonService.getContractorProjects(user.tenant_id),
        neonService.getUnits(user.tenant_id),
        neonService.getProducts(user.tenant_id)
      ]);
      setItems(itemsData || []);
      setProjects(projectsData || []);
      setUnits(unitsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Load data error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل البيانات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [filterProjectId]);

  const handleAdd = () => {
    setSelectedItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleSave = async (data) => {
    if (!user?.tenant_id) return;

    try {
      if (selectedItem) {
        await neonService.updateProjectItem(selectedItem.id, { ...data, updated_by: user.id }, user.tenant_id);
        toast({ title: 'تم تحديث بند الكميات بنجاح' });
      } else {
        await neonService.createProjectItem({ ...data, created_by: user.id }, user.tenant_id);
        toast({ title: 'تم إضافة بند الكميات بنجاح' });
      }
      setDialogOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (error) {
      console.error('Save item error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ بند الكميات',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند؟')) return;

    try {
      await neonService.deleteProjectItem(id, user.tenant_id);
      toast({ title: 'تم حذف البند بنجاح' });
      loadData();
    } catch (error) {
      console.error('Delete item error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف البند',
        variant: 'destructive'
      });
    }
  };

  const filteredItems = items.filter(item => {
    if (searchTerm && !item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.project_name || project?.project_code || '-';
  };

  const getUnitName = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.name_ar || unit?.code || '-';
  };

  return (
    <div className="space-y-6">
      <Helmet><title>بنود الكميات (BOQ) - {t('common.systemName')}</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            بنود الكميات (BOQ)
          </h1>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة بند
        </Button>
      </div>

      {/* الفلترة */}
      <div className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 space-y-4 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن بند..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">جميع المشاريع</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_code} - {project.project_name}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0"
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المشروع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">كود البند</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">اسم البند</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوصف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الكمية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الوحدة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">سعر الوحدة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجمالي</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    لا توجد بنود
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const currencyInfo = CURRENCIES[item.currency] || { symbol: item.currency || 'TRY' };
                  const total = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {getProjectName(item.project_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.item_code}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {item.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {parseFloat(item.quantity || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getUnitName(item.unit_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {currencyInfo.symbol} {parseFloat(item.unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {currencyInfo.symbol} {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                            title="حذف"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <ContractorProjectItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        projects={projects}
        units={units}
        products={products}
        onSave={handleSave}
      />
    </div>
  );
};

export default ContractorProjectItemsPage;

