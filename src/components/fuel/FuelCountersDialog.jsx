import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

const FuelCountersDialog = ({ open, onOpenChange, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    counter_name: '',
    counter_number: 1,
    selling_price_per_liter: 0,
    current_reading: 0,
    initial_reading: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        counter_name: initialData.counter_name || '',
        counter_number: initialData.counter_number || 1,
        selling_price_per_liter: parseFloat(initialData.selling_price_per_liter) || 0,
        current_reading: parseFloat(initialData.current_reading) || 0,
        initial_reading: parseFloat(initialData.initial_reading) || 0
      });
    } else {
      setFormData({
        counter_name: '',
        counter_number: 1,
        selling_price_per_liter: 0,
        current_reading: 0,
        initial_reading: 0
      });
    }
  }, [initialData, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'counter_number' 
        ? parseInt(value) || 1 
        : name.includes('price') || name.includes('reading')
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSave = () => {
    if (!formData.counter_name.trim()) {
      toast({ 
        title: "خطأ", 
        description: "يرجى إدخال اسم العداد",
        variant: "destructive" 
      });
      return;
    }

    if (formData.counter_number < 1 || formData.counter_number > 6) {
      toast({ 
        title: "خطأ", 
        description: "رقم العداد يجب أن يكون بين 1 و 6",
        variant: "destructive" 
      });
      return;
    }

    if (formData.selling_price_per_liter < 0) {
      toast({ 
        title: "خطأ", 
        description: "سعر البيع لا يمكن أن يكون سالباً",
        variant: "destructive" 
      });
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'تعديل عداد المحروقات' : 'إضافة عداد محروقات جديد'}
          </DialogTitle>
          <DialogDescription>
            قم بإدخال معلومات عداد المحروقات. يمكن إضافة حتى 6 عدادات لكل متجر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* اسم العداد */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اسم العداد *
            </label>
            <input
              type="text"
              name="counter_name"
              value={formData.counter_name}
              onChange={handleInputChange}
              placeholder="مثال: البنزين 95، البنزين 98، الديزل"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">أدخل اسماً وصفياً للعداد</p>
          </div>

          {/* رقم العداد */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                رقم العداد (1-6) *
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    counter_number: Math.max(1, prev.counter_number - 1)
                  }))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  name="counter_number"
                  value={formData.counter_number}
                  onChange={handleInputChange}
                  min="1"
                  max="6"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-center focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    counter_number: Math.min(6, prev.counter_number + 1)
                  }))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* سعر البيع للتر */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                سعر البيع للتر *
              </label>
              <input
                type="number"
                name="selling_price_per_liter"
                value={formData.selling_price_per_liter}
                onChange={handleInputChange}
                step="0.001"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">سعر المحروقات للتر الواحد</p>
            </div>
          </div>

          {/* القراءة الأولية والحالية */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                القراءة الأولية
              </label>
              <input
                type="number"
                name="initial_reading"
                value={formData.initial_reading}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">القراءة الأولية للعداد (لتر)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                القراءة الحالية
              </label>
              <input
                type="number"
                name="current_reading"
                value={formData.current_reading}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">القراءة الحالية للعداد (لتر)</p>
            </div>
          </div>

          {/* ملخص المحسوب */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">ملخص المعلومات</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">المتبقي</p>
                <p className="font-bold text-blue-900 dark:text-blue-100">
                  {(formData.initial_reading - formData.current_reading).toFixed(2)} L
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">الإيراد المتوقع</p>
                <p className="font-bold text-blue-900 dark:text-blue-100">
                  {(formData.current_reading * formData.selling_price_per_liter).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">رقم العداد</p>
                <p className="font-bold text-blue-900 dark:text-blue-100">#{formData.counter_number}/6</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-orange-500 to-pink-500"
          >
            {initialData ? 'حفظ التحديثات' : 'إضافة العداد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FuelCountersDialog;
