
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
import Logo from '@/components/Logo';

const InventoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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
          <div className="hidden md:block">
            <Logo size="md" showText={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('common.inventory')}</h1>
        </div>
        <Button onClick={() => { setSelectedItem(null); setDialogOpen(true); }} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> {t('inventory.addItem')}
        </Button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {loading ? <Loader2 className="animate-spin mx-auto" /> : 
          <InventoryTable items={items} onEdit={(i) => { setSelectedItem(i); setDialogOpen(true); }} onDelete={handleDelete} />
        }
      </div>

      <InventoryDialog open={dialogOpen} onOpenChange={setDialogOpen} item={selectedItem} onSave={handleSave} />
    </div>
  );
};

export default InventoryPage;
