import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import FuelCountersDialog from '@/components/fuel/FuelCountersDialog';
import FuelCounterMovementsTable from '@/components/fuel/FuelCounterMovementsTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

const FuelCountersManagementPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [counters, setCounters] = useState([]);
  const [movements, setMovements] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [summary, setSummary] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'movements', 'daily'
  const [storeSupport, setStoreSupport] = useState(true);

  useEffect(() => {
    if (user?.tenant_id) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // تحقق أولاً من دعم المتجر
      const supports = await neonService.checkStoreSupportsFuel(user.tenant_id);
      setStoreSupport(supports);
      
      if (!supports) {
        toast({ 
          title: "تنبيه", 
          description: "هذا المتجر لا يدعم نظام إدارة المحروقات",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      const countersData = await neonService.getFuelCounters(user.tenant_id);
      const summaryData = await neonService.getFuelCountersSummary(user.tenant_id);
      const movementsData = await neonService.getFuelCounterMovements(user.tenant_id);
      
      setCounters(countersData || []);
      setSummary(summaryData || []);
      setMovements(movementsData || []);
    } catch (e) {
      console.error('Load fuel data error:', e);
      toast({ 
        title: 'خطأ في تحميل البيانات', 
        description: e.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCounter = async (data) => {
    try {
      if (selectedCounter) {
        await neonService.updateFuelCounter(selectedCounter.id, data, user.tenant_id);
        toast({ title: "تم تحديث العداد بنجاح" });
      } else {
        await neonService.createFuelCounter(user.tenant_id, data);
        toast({ title: "تم إضافة العداد بنجاح" });
      }
      setDialogOpen(false);
      setSelectedCounter(null);
      loadData();
    } catch (e) {
      console.error('Save counter error:', e);
      toast({ 
        title: "خطأ في حفظ البيانات", 
        description: e.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCounter = async (id) => {
    if (!window.confirm('هل تريد حذف هذا العداد؟')) return;
    
    try {
      await neonService.deleteFuelCounter(id, user.tenant_id);
      toast({ title: "تم حذف العداد بنجاح" });
      loadData();
    } catch (e) {
      console.error('Delete counter error:', e);
      toast({ 
        title: "خطأ في حذف العداد", 
        description: e.message,
        variant: "destructive" 
      });
    }
  };

  const handleRecordMovement = async (data) => {
    try {
      await neonService.recordFuelCounterMovement(user.tenant_id, data);
      toast({ title: "تم تسجيل الحركة بنجاح" });
      setMovementDialogOpen(false);
      setSelectedCounter(null);
      loadData();
    } catch (e) {
      console.error('Record movement error:', e);
      toast({ 
        title: "خطأ في تسجيل الحركة", 
        description: e.message,
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>إدارة عدادات الحروقات - {t('common.systemName')}</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">إدارة عدادات المحروقات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة وتتبع عدادات المحروقات ومراقبة المبيعات</p>
        </div>
        {storeSupport && (
          <Button 
            onClick={() => { 
              setSelectedCounter(null); 
              setDialogOpen(true); 
            }}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 ml-2" /> إضافة عداد جديد
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: 'نظرة عامة' },
          { id: 'movements', label: 'الحركات' },
          { id: 'daily', label: 'السجلات اليومية' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === tab.id
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {!storeSupport && (
            <GlassCard className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 font-medium">
                ⚠️ هذا المتجر لا يدعم نظام إدارة المحروقات. يرجى اختيار متجر يدعم المحروقات.
              </p>
            </GlassCard>
          )}

          {/* Summary Cards */}
          {storeSupport && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((counter, idx) => (
                <motion.div
                  key={counter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">
                          {counter.counter_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          عداد #{counter.counter_number}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCounter(counter);
                            setMovementDialogOpen(true);
                          }}
                          className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900 rounded-lg transition"
                        >
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCounter(counter);
                            setDialogOpen(true);
                          }}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCounter(counter.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">القراءة الحالية</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            {parseFloat(counter.current_reading).toFixed(2)} L
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">سعر البيع</p>
                          <p className="text-lg font-bold text-green-600">
                            {parseFloat(counter.selling_price_per_liter).toFixed(3)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المباع والإيرادات</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">إجمالي المباع</p>
                            <p className="font-bold text-gray-800 dark:text-gray-100">
                              {parseFloat(counter.calculated_total_sold).toFixed(2)} L
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">الإيرادات</p>
                            <p className="font-bold text-green-600">
                              {parseFloat(counter.total_revenue).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {counter.remaining !== undefined && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">المتبقي المحسوب</p>
                          <p className="font-bold text-orange-700 dark:text-orange-300">
                            {parseFloat(counter.remaining).toFixed(2)} L
                          </p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {summary.length === 0 && storeSupport && (
            <GlassCard className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">لم يتم إضافة أي عدادات بعد</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <FuelCounterMovementsTable movements={movements} counters={counters} />
      )}

      {/* Daily Logs Tab */}
      {activeTab === 'daily' && (
        <GlassCard className="p-6">
          <p className="text-gray-600 dark:text-gray-400">جاري تطوير قسم السجلات اليومية</p>
        </GlassCard>
      )}

      {/* Dialog for adding/editing counters */}
      <FuelCountersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveCounter}
        initialData={selectedCounter}
      />

      {/* Dialog for recording movements */}
      {movementDialogOpen && selectedCounter && (
        <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تسجيل حركة - {selectedCounter.counter_name}</DialogTitle>
              <DialogDescription>
                تسجيل حركة بيع أو تعديل لعداد المحروقات
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  القراءة الحالية: {parseFloat(selectedCounter.current_reading).toFixed(2)} L
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  القراءة الجديدة (لتر)
                </label>
                <input
                  type="number"
                  id="reading"
                  step="0.01"
                  defaultValue={parseFloat(selectedCounter.current_reading).toFixed(2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
                  placeholder="أدخل القراءة الجديدة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  id="notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
                  placeholder="أضف ملاحظات للحركة"
                  rows="3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setMovementDialogOpen(false);
                  setSelectedCounter(null);
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  const reading = document.getElementById('reading').value;
                  const notes = document.getElementById('notes').value;

                  if (!reading) {
                    toast({ 
                      title: "خطأ", 
                      description: "يرجى إدخال القراءة الجديدة",
                      variant: "destructive" 
                    });
                    return;
                  }

                  handleRecordMovement({
                    counter_id: selectedCounter.id,
                    reading_after: parseFloat(reading),
                    price_per_liter: selectedCounter.selling_price_per_liter,
                    notes: notes || null
                  });
                }}
                className="bg-gradient-to-r from-orange-500 to-pink-500"
              >
                تسجيل الحركة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FuelCountersManagementPage;
