
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import PartnerDialog from '@/components/partners/PartnerDialog';
import PartnerTable from '@/components/partners/PartnerTable';

const PartnersPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      setPartners([]);
      return;
    }

    try {
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve([]), 8000)
      );
      
      const data = await Promise.race([
        neonService.getPartners(user.tenant_id).catch(() => []),
        timeoutPromise
      ]);
      
      setPartners(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Load partners error:', e);
      toast({ 
        title: t('common.error'), 
        description: e.message || 'حدث خطأ في تحميل البيانات',
        variant: "destructive" 
      });
      setPartners([]);
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
      if (selected) {
        await neonService.updatePartner(selected.id, data, user.tenant_id);
        toast({ title: "تم تحديث البيانات بنجاح" });
      } else {
        await neonService.createPartner(data, user.tenant_id);
        toast({ title: "تم إضافة البيانات بنجاح" });
      }
      setDialogOpen(false);
      setSelected(null);
      loadData();
    } catch (e) {
      console.error('Save partner error:', e);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: e.message || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm(t('partners.confirmDelete'))) return;
    try {
      await neonService.deletePartner(id, user.tenant_id);
      loadData();
    } catch(e) { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>{t('common.partners')} - {t('common.systemName')}</title></Helmet>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('common.partners')}</h1>
        </div>
        <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" /> {t('partners.addPartner')}
        </Button>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        {loading ? <Loader2 className="animate-spin mx-auto"/> : 
          <PartnerTable partners={partners} onEdit={(p) => { setSelected(p); setDialogOpen(true); }} onDelete={handleDelete} />
        }
      </div>
      <PartnerDialog open={dialogOpen} onOpenChange={setDialogOpen} partner={selected} onSave={handleSave} />
    </div>
  );
};
export default PartnersPage;
