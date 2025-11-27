import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, DollarSign, Wallet, TrendingDown, TrendingUp, Edit, Trash2, Eye, Search, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR, formatDateShort } from '@/lib/dateUtils';
import { CURRENCIES } from '@/lib/constants';
import CustomerDialog from '@/components/customers/CustomerDialog';
import PaymentDialog from '@/components/customers/PaymentDialog';

const CustomersPage = () => {
  const { user, tenant, permissions } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterDebt, setFilterDebt] = useState('all'); // 'all', 'has_debt', 'has_credit', 'zero'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenant_id) loadCustomers();
  }, [user]);

  const loadCustomers = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // الحصول على العملاء من customer_summary view
      const summary = await neonService.getCustomerSummary(user.tenant_id);
      setCustomers(summary || []);
    } catch (error) {
      console.error('Load customers error:', error);
      // Fallback: تحميل من partners
      const partners = await neonService.getPartners(user.tenant_id);
      const customersOnly = partners.filter(p => p.type === 'Customer');
      setCustomers(customersOnly || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setCustomerDialogOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDialogOpen(true);
  };

  const handleAddPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const handleSaveCustomer = async (data) => {
    if (!user?.tenant_id) return;
    
    // التحقق من الصلاحيات
    if (selectedCustomer && !permissions.canEdit) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لتعديل العملاء',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (selectedCustomer) {
        await neonService.updatePartner(selectedCustomer.id, { ...data, type: 'Customer' }, user.tenant_id);
        // تسجيل في Audit Log
        await neonService.log(user.tenant_id, user.id, 'UPDATE_CUSTOMER', {
          customer_id: selectedCustomer.id,
          customer_name: data.name || selectedCustomer.name,
          changes: data
        });
        toast({ title: 'تم تحديث العميل بنجاح' });
      } else {
        const newCustomer = await neonService.createPartner({ ...data, type: 'Customer' }, user.tenant_id);
        // تسجيل في Audit Log
        await neonService.log(user.tenant_id, user.id, 'CREATE_CUSTOMER', {
          customer_id: newCustomer.id,
          customer_name: data.name
        });
        toast({ title: 'تم إضافة العميل بنجاح' });
      }
      setCustomerDialogOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error) {
      console.error('Save customer error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حفظ العميل',
        variant: 'destructive'
      });
    }
  };

  const handleSavePayment = async (paymentData) => {
    if (!selectedCustomer || !user?.tenant_id) return;

    try {
      const transactionData = {
        partner_id: selectedCustomer.id,
        transaction_type: paymentData.type, // 'payment', 'receipt', 'debt', 'credit'
        amount: parseFloat(paymentData.amount),
        currency: paymentData.currency || selectedCustomer.currency || 'TRY',
        payment_method: paymentData.payment_method || 'cash',
        description: paymentData.description,
        transaction_date: paymentData.date || new Date().toISOString(),
        created_by: user.id,
        notes: paymentData.notes
      };

      const transaction = await neonService.createCustomerTransaction(transactionData, user.tenant_id);
      
      // تسجيل في Audit Log
      await neonService.log(user.tenant_id, user.id, 'CUSTOMER_TRANSACTION', {
        transaction_id: transaction.id,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        transaction_type: paymentData.type,
        amount: parseFloat(paymentData.amount),
        currency: transactionData.currency
      });
      
      toast({ title: 'تم تسجيل المعاملة بنجاح' });
      setPaymentDialogOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error) {
      console.error('Save payment error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تسجيل المعاملة',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!permissions.canDelete) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لحذف العملاء',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟`)) return;

    try {
      await neonService.deletePartner(customer.id, user.tenant_id);
      // تسجيل في Audit Log
      await neonService.log(user.tenant_id, user.id, 'DELETE_CUSTOMER', {
        customer_id: customer.id,
        customer_name: customer.name,
        deleted_at: new Date().toISOString()
      });
      toast({ title: 'تم حذف العميل بنجاح' });
      loadCustomers();
    } catch (error) {
      console.error('Delete customer error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف العميل',
        variant: 'destructive'
      });
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (searchTerm && !customer.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (filterDebt === 'has_debt' && (!customer.debt || parseFloat(customer.debt) <= 0)) return false;
    if (filterDebt === 'has_credit' && (!customer.balance || parseFloat(customer.balance) <= 0)) return false;
    if (filterDebt === 'zero' && parseFloat(customer.debt || 0) > 0 && parseFloat(customer.balance || 0) > 0) return false;
    
    return true;
  });

  const totalDebt = customers.reduce((sum, c) => sum + parseFloat(c.debt || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);

  return (
    <div className="space-y-6">
      <Helmet><title>العملاء والديون</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            العملاء والديون
          </h1>
        </div>
        <Button onClick={handleAddCustomer} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> إضافة عميل
        </Button>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الديون</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {totalDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الرصيد</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">عدد العملاء</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {customers.length}
              </p>
            </div>
            <Wallet className="h-10 w-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* الفلترة */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <select
            value={filterDebt}
            onChange={(e) => setFilterDebt(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">الكل</option>
            <option value="has_debt">لديه دين</option>
            <option value="has_credit">له رصيد</option>
            <option value="zero">صفر</option>
          </select>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الهاتف</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الدين</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الرصيد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجمالي المدفوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجمالي المستلم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    لا توجد عملاء
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const currencyInfo = CURRENCIES[customer.currency] || { symbol: customer.currency || 'TRY' };
                  const debt = parseFloat(customer.debt || 0);
                  const balance = parseFloat(customer.balance || 0);
                  const netBalance = balance - debt;

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {customer.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {debt > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {currencyInfo.symbol} {debt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {balance > 0 ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {currencyInfo.symbol} {balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {currencyInfo.symbol} {parseFloat(customer.total_paid || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {currencyInfo.symbol} {parseFloat(customer.total_received || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddPayment(customer)}
                            title="إضافة دفعة/معاملة"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          {permissions.canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCustomer(customer)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCustomer(customer)}
                              title="حذف"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCustomer(customer)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddPayment(customer)}
                            title="إضافة دفعة/معاملة"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <DollarSign className="h-4 w-4" />
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

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={selectedCustomer}
        onSave={handleSavePayment}
      />
    </div>
  );
};

export default CustomersPage;

