
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import InventoryDialog from '@/components/inventory/InventoryDialog';
import InventoryTable from '@/components/inventory/InventoryTable';
import GlassCard from '@/components/ui/GlassCard';

const InventoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'day', 'week', 'month', 'all'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const data = await neonService.getInventory(user.tenant_id);
      setItems(data || []);
    } catch (e) {
      console.error('Load inventory error:', e);
      toast({ 
        title: t('inventory.loadError'), 
        description: e.message || t('common.error'),
        variant: "destructive" 
      });
      setItems([]);
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
      if (selectedItem) {
        await neonService.updateInventory(selectedItem.id, data, user.tenant_id);
        toast({ title: "تم تحديث البيانات بنجاح" });
      } else {
        await neonService.createInventory(data, user.tenant_id);
        toast({ title: "تم إضافة البيانات بنجاح" });
      }
      setDialogOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (e) {
      console.error('Save inventory error:', e);
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
      await neonService.deleteInventory(id, user.tenant_id);
      toast({ title: t('inventory.deleted') });
      loadData();
    } catch(e) {
      console.error('Delete inventory error:', e);
      toast({ title: t('inventory.deleteError'), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>{t('common.inventory')} - {t('common.systemName')}</title></Helmet>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('common.inventory')}</h1>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> {t('inventory.addItem')}
        </Button>
      </div>
      
      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="بحث في المستودع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            />
          </div>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <option value="all">الكل</option>
            <option value="day">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
          </select>
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? <Loader2 className="animate-spin mx-auto" /> : (() => {
          // Filter items
          let filteredItems = items.filter(item => {
            const matchesSearch = !searchTerm || 
              item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.code?.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Period filter (if items have created_at or date field)
            if (filterPeriod !== 'all' && item.created_at) {
              const now = new Date();
              let startDate = null;
              
              if (filterPeriod === 'day') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              } else if (filterPeriod === 'week') {
                const dayOfWeek = now.getDay();
                const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                startDate = new Date(now.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
              } else if (filterPeriod === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              }
              
              if (startDate) {
                const itemDate = new Date(item.created_at);
                if (itemDate < startDate) return false;
              }
            }
            
            return matchesSearch;
          });
          
          return <InventoryTable items={filteredItems} onEdit={(i) => { setSelectedItem(i); setDialogOpen(true); }} onDelete={handleDelete} />;
        })()}
      </GlassCard>

      <InventoryDialog open={dialogOpen} onOpenChange={setDialogOpen} item={selectedItem} onSave={handleSave} />
    </div>
  );
};

export default InventoryPage;
