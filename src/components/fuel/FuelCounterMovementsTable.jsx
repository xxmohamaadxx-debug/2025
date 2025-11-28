import React from 'react';
import { formatDateAR, formatTimeAR } from '@/lib/dateUtils';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const FuelCounterMovementsTable = ({ movements, counters }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (!movements || movements.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">لا توجد حركات مسجلة</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {movements.map(movement => (
        <GlassCard key={movement.id} className="overflow-hidden">
          <div
            onClick={() => toggleRow(movement.id)}
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <ChevronDown
                    className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform ${
                      expandedRows.has(movement.id) ? 'rotate-180' : ''
                    }`}
                  />
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">
                      {movement.counter_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDateAR(movement.recorded_at)} - {formatTimeAR(movement.recorded_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">الكمية المباعة</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {parseFloat(movement.quantity_sold).toFixed(2)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">المبلغ</p>
                  <p className="font-bold text-green-600">
                    {parseFloat(movement.total_amount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                    {movement.movement_type === 'sale' && 'بيع'}
                    {movement.movement_type === 'adjustment' && 'تعديل'}
                    {movement.movement_type === 'initial_read' && 'قراءة أولية'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          {expandedRows.has(movement.id) && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">القراءة قبل</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {parseFloat(movement.reading_before).toFixed(2)} L
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">القراءة بعد</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {parseFloat(movement.reading_after).toFixed(2)} L
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">السعر للتر</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {parseFloat(movement.price_per_liter).toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">نوع العملية</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {movement.movement_type === 'sale' && 'بيع'}
                    {movement.movement_type === 'adjustment' && 'تعديل'}
                    {movement.movement_type === 'initial_read' && 'قراءة أولية'}
                  </p>
                </div>
              </div>

              {movement.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ملاحظات</p>
                  <p className="text-gray-800 dark:text-gray-100">{movement.notes}</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
};

export default FuelCounterMovementsTable;
