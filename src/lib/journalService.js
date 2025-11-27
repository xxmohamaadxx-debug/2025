/**
 * Journal Service - نظام اليومية المحاسبية
 * يدير التسجيل المزدوج (مدين/دائن) لجميع العمليات
 */

import { neonService } from './neonService';

/**
 * إنشاء قيد يومية محاسبية
 * @param {Object} entryData - بيانات القيد
 * @param {Array} lines - قائمة القيود (مدين/دائن)
 * @param {string} tenantId - معرف المستأجر
 */
export const createJournalEntry = async (entryData, lines, tenantId) => {
  try {
    // التحقق من توازن القيود (المدين = الدائن)
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('القيد غير متوازن: المدين يجب أن يساوي الدائن');
    }

    // إنشاء رقم القيد التلقائي
    const entryNumber = await generateEntryNumber(tenantId, entryData.entry_date);

    // إنشاء القيد
    const entry = await neonService.createJournalEntry({
      ...entryData,
      entry_number: entryNumber,
      total_amount: totalDebit,
    }, tenantId);

    // إنشاء القيود
    for (const line of lines) {
      await neonService.createJournalLine({
        ...line,
        journal_entry_id: entry.id,
        tenant_id: tenantId,
      }, tenantId);
    }

    // تسجيل في Audit Log
    await neonService.log(tenantId, entryData.created_by, 'CREATE_JOURNAL_ENTRY', {
      entry_id: entry.id,
      entry_number: entryNumber,
      total_amount: totalDebit,
    });

    return entry;
  } catch (error) {
    console.error('Create journal entry error:', error);
    throw error;
  }
};

/**
 * إنشاء قيد يومية تلقائي لفاتورة وارد
 */
export const createInvoiceInJournal = async (invoice, items, tenantId, userId) => {
  const lines = [];

  // مدين: المستودع (القيمة)
  const totalAmount = parseFloat(invoice.amount || 0);
  
  lines.push({
    account_type: 'inventory',
    account_name: 'مستودع',
    debit_amount: totalAmount,
    credit_amount: 0,
    currency: invoice.currency,
    description: `فاتورة وارد #${invoice.id}`,
  });

  // دائن: المورد (دين)
  if (invoice.partner_id) {
    lines.push({
      account_type: 'partner_payable',
      account_name: 'دين مورد',
      account_id: invoice.partner_id,
      debit_amount: 0,
      credit_amount: totalAmount,
      currency: invoice.currency,
      description: `فاتورة وارد #${invoice.id}`,
    });

    // تحديث رصيد المورد
    await updatePartnerBalance(invoice.partner_id, 'payable', totalAmount, invoice.currency, tenantId, userId, {
      reference_type: 'invoice_in',
      reference_id: invoice.id,
    });
  } else {
    // دائن: الصندوق (إذا كان دفع فوري)
    lines.push({
      account_type: 'cash',
      account_name: 'صندوق',
      debit_amount: 0,
      credit_amount: totalAmount,
      currency: invoice.currency,
      description: `فاتورة وارد #${invoice.id}`,
    });
  }

  // تحديث المخزون
  if (items && items.length > 0) {
    for (const item of items) {
      if (item.inventory_item_id) {
        await updateInventoryQuantity(
          item.inventory_item_id,
          'inbound',
          parseFloat(item.quantity || 0),
          tenantId,
          userId,
          {
            reference_type: 'invoice_in',
            reference_id: invoice.id,
          }
        );
      }
    }
  }

  // إنشاء القيد
  return await createJournalEntry({
    entry_date: invoice.date || new Date().toISOString().split('T')[0],
    description: `فاتورة وارد - ${invoice.description || ''}`,
    reference_type: 'invoice_in',
    reference_id: invoice.id,
    currency: invoice.currency,
    created_by: userId,
  }, lines, tenantId);
};

/**
 * إنشاء قيد يومية تلقائي لفاتورة صادر
 */
export const createInvoiceOutJournal = async (invoice, items, tenantId, userId) => {
  const lines = [];

  // مدين: العميل (دين)
  const totalAmount = parseFloat(invoice.amount || 0);
  
  if (invoice.partner_id) {
    lines.push({
      account_type: 'partner_receivable',
      account_name: 'دين عميل',
      account_id: invoice.partner_id,
      debit_amount: totalAmount,
      credit_amount: 0,
      currency: invoice.currency,
      description: `فاتورة صادر #${invoice.id}`,
    });

    // تحديث رصيد العميل
    await updatePartnerBalance(invoice.partner_id, 'receivable', totalAmount, invoice.currency, tenantId, userId, {
      reference_type: 'invoice_out',
      reference_id: invoice.id,
    });
  } else {
    // مدين: الصندوق (إذا كان دفع فوري)
    lines.push({
      account_type: 'cash',
      account_name: 'صندوق',
      debit_amount: totalAmount,
      credit_amount: 0,
      currency: invoice.currency,
      description: `فاتورة صادر #${invoice.id}`,
    });
  }

  // دائن: المستودع (القيمة)
  lines.push({
    account_type: 'inventory',
    account_name: 'مستودع',
    debit_amount: 0,
    credit_amount: totalAmount,
    currency: invoice.currency,
    description: `فاتورة صادر #${invoice.id}`,
  });

  // تحديث المخزون
  if (items && items.length > 0) {
    for (const item of items) {
      if (item.inventory_item_id) {
        const quantity = parseFloat(item.quantity || 0);
        
        // التحقق من توفر الكمية
        const inventoryItem = await neonService.getInventoryItem(item.inventory_item_id, tenantId);
        if (!inventoryItem || parseFloat(inventoryItem.quantity || 0) < quantity) {
          throw new Error(`المنتج ${item.item_name} غير متوفر بالكمية المطلوبة. المتوفر: ${inventoryItem?.quantity || 0}`);
        }

        await updateInventoryQuantity(
          item.inventory_item_id,
          'outbound',
          -quantity, // سالب للصادر
          tenantId,
          userId,
          {
            reference_type: 'invoice_out',
            reference_id: invoice.id,
          }
        );
      }
    }
  }

  // إنشاء القيد
  return await createJournalEntry({
    entry_date: invoice.date || new Date().toISOString().split('T')[0],
    description: `فاتورة صادر - ${invoice.description || ''}`,
    reference_type: 'invoice_out',
    reference_id: invoice.id,
    currency: invoice.currency,
    created_by: userId,
  }, lines, tenantId);
};

/**
 * تحديث رصيد الشريك (عميل/مورد)
 */
export const updatePartnerBalance = async (partnerId, accountType, amount, currency, tenantId, userId, reference = {}) => {
  try {
    // الحصول على الرصيد الحالي
    const currentBalance = await neonService.getAccountBalance(partnerId, accountType, currency, tenantId);
    const balanceBefore = parseFloat(currentBalance?.balance || 0);
    const balanceAfter = balanceBefore + parseFloat(amount);

    // إنشاء معاملة
    await neonService.createAccountTransaction({
      partner_id: partnerId,
      transaction_type: reference.reference_type === 'invoice_in' ? 'invoice' : 
                        reference.reference_type === 'invoice_out' ? 'invoice' : 
                        reference.reference_type === 'payment' ? 'payment' : 'other',
      reference_type: reference.reference_type,
      reference_id: reference.reference_id,
      amount: parseFloat(amount),
      currency: currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: reference.description || '',
      created_by: userId,
    }, tenantId);

    // تحديث الرصيد (سيتم تلقائياً عبر Trigger)
    return { balanceBefore, balanceAfter };
  } catch (error) {
    console.error('Update partner balance error:', error);
    throw error;
  }
};

/**
 * تحديث كمية المخزون
 */
export const updateInventoryQuantity = async (inventoryItemId, transactionType, quantityChange, tenantId, userId, reference = {}) => {
  try {
    // الحصول على الكمية الحالية
    const item = await neonService.getInventoryItem(inventoryItemId, tenantId);
    if (!item) {
      throw new Error('المنتج غير موجود');
    }

    const quantityBefore = parseFloat(item.quantity || 0);
    const quantityAfter = quantityBefore + parseFloat(quantityChange);

    // التحقق من عدم وجود كمية سالبة
    if (quantityAfter < 0 && transactionType === 'outbound') {
      throw new Error(`الكمية غير كافية. المتوفر: ${quantityBefore}`);
    }

    // إنشاء معاملة مخزون
    await neonService.createInventoryTransaction({
      inventory_item_id: inventoryItemId,
      transaction_type: transactionType,
      reference_type: reference.reference_type,
      reference_id: reference.reference_id,
      quantity_change: parseFloat(quantityChange),
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_price: parseFloat(item.price || 0),
      currency: item.currency,
      description: reference.description || '',
      created_by: userId,
    }, tenantId);

    // تحديث الكمية (سيتم تلقائياً عبر Trigger)
    return { quantityBefore, quantityAfter };
  } catch (error) {
    console.error('Update inventory quantity error:', error);
    throw error;
  }
};

/**
 * إنشاء رقم قيد تلقائي
 */
const generateEntryNumber = async (tenantId, date) => {
  try {
    const year = new Date(date).getFullYear();
    const count = await neonService.getJournalEntryCount(tenantId, year);
    return `JE-${year}-${String(count + 1).padStart(5, '0')}`;
  } catch (error) {
    console.error('Generate entry number error:', error);
    return `JE-${new Date().getFullYear()}-${Date.now()}`;
  }
};

/**
 * تسجيل دفعة عميل
 */
export const recordCustomerPayment = async (paymentData, tenantId, userId) => {
  const lines = [];

  // مدين: الصندوق
  lines.push({
    account_type: 'cash',
    account_name: 'صندوق',
    debit_amount: parseFloat(paymentData.amount),
    credit_amount: 0,
    currency: paymentData.currency,
    description: `دفعة عميل - ${paymentData.partner_name || ''}`,
  });

  // دائن: العميل
  if (paymentData.partner_id) {
    lines.push({
      account_type: 'partner_receivable',
      account_name: 'دين عميل',
      account_id: paymentData.partner_id,
      debit_amount: 0,
      credit_amount: parseFloat(paymentData.amount),
      currency: paymentData.currency,
      description: `دفعة عميل - ${paymentData.partner_name || ''}`,
    });

    // تحديث رصيد العميل
    await updatePartnerBalance(
      paymentData.partner_id,
      'receivable',
      -parseFloat(paymentData.amount), // سالب لأنها دفعة
      paymentData.currency,
      tenantId,
      userId,
      {
        reference_type: 'payment',
        reference_id: paymentData.id,
        description: `دفعة من ${paymentData.partner_name}`,
      }
    );
  }

  return await createJournalEntry({
    entry_date: paymentData.date || new Date().toISOString().split('T')[0],
    description: `دفعة عميل - ${paymentData.partner_name || ''}`,
    reference_type: 'payment',
    reference_id: paymentData.id,
    currency: paymentData.currency,
    created_by: userId,
  }, lines, tenantId);
};

/**
 * تسجيل دفعة مورد
 */
export const recordVendorPayment = async (paymentData, tenantId, userId) => {
  const lines = [];

  // مدين: المورد
  if (paymentData.partner_id) {
    lines.push({
      account_type: 'partner_payable',
      account_name: 'دين مورد',
      account_id: paymentData.partner_id,
      debit_amount: parseFloat(paymentData.amount),
      credit_amount: 0,
      currency: paymentData.currency,
      description: `دفعة مورد - ${paymentData.partner_name || ''}`,
    });

    // تحديث رصيد المورد
    await updatePartnerBalance(
      paymentData.partner_id,
      'payable',
      -parseFloat(paymentData.amount), // سالب لأنها دفعة
      paymentData.currency,
      tenantId,
      userId,
      {
        reference_type: 'payment',
        reference_id: paymentData.id,
        description: `دفعة لمورد ${paymentData.partner_name}`,
      }
    );
  }

  // دائن: الصندوق
  lines.push({
    account_type: 'cash',
    account_name: 'صندوق',
    debit_amount: 0,
    credit_amount: parseFloat(paymentData.amount),
    currency: paymentData.currency,
    description: `دفعة مورد - ${paymentData.partner_name || ''}`,
  });

  return await createJournalEntry({
    entry_date: paymentData.date || new Date().toISOString().split('T')[0],
    description: `دفعة مورد - ${paymentData.partner_name || ''}`,
    reference_type: 'payment',
    reference_id: paymentData.id,
    currency: paymentData.currency,
    created_by: userId,
  }, lines, tenantId);
};

export default {
  createJournalEntry,
  createInvoiceInJournal,
  createInvoiceOutJournal,
  updatePartnerBalance,
  updateInventoryQuantity,
  recordCustomerPayment,
  recordVendorPayment,
};

