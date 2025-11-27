import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Trash2, X, Check, Plus, Minus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import GlassCard from '@/components/ui/GlassCard';
import InteractiveButton from '@/components/ui/InteractiveButton';
import { motion } from 'framer-motion';

const POSPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isCredit, setIsCredit] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      loadProducts();
      loadCustomers();
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      const data = await neonService.getProducts(user.tenant_id);
      setProducts(data || []);
    } catch (error) {
      console.error('Load products error:', error);
      toast({ title: 'خطأ في تحميل المنتجات', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await neonService.getPartners(user.tenant_id);
      setPartners(data?.filter(p => p.type === 'Customer') || []);
    } catch (error) {
      console.error('Load customers error:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      const taxAmount = (product.selling_price || 0) * (product.tax_rate || 0) / 100;
      const totalPrice = (product.selling_price || 0) + taxAmount;
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.selling_price || 0,
        tax_rate: product.tax_rate || 0,
        tax_amount: taxAmount,
        discount_rate: 0,
        discount_amount: 0,
        total_price: totalPrice,
        currency: product.currency || 'TRY'
      }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item => {
        if (item.product_id === productId) {
          const totalPrice = newQuantity * item.unit_price;
          return { ...item, quantity: newQuantity, total_price: totalPrice };
        }
        return item;
      }));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'السلة فارغة', variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const totalAmount = calculateTotal();
      const invoiceData = {
        date: new Date().toISOString(),
        customer_id: selectedCustomer?.id || null,
        total_amount: totalAmount,
        final_amount: totalAmount,
        paid_amount: isCredit ? 0 : totalAmount,
        remaining_amount: isCredit ? totalAmount : 0,
        currency: cart[0]?.currency || 'TRY',
        payment_method: paymentMethod,
        is_credit: isCredit,
        credit_amount: isCredit ? totalAmount : 0,
        cashier_id: user.id
      };

      await neonService.createSalesInvoice(invoiceData, cart.map(item => ({
        product_id: item.product_id,
        sku: item.sku,
        name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount * item.quantity,
        discount_rate: item.discount_rate,
        discount_amount: item.discount_amount * item.quantity,
        total_price: item.total_price,
        currency: item.currency
      })), user.tenant_id);

      toast({ title: "تم إتمام البيع بنجاح" });
      clearCart();
      loadProducts();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({ 
        title: "خطأ في إتمام البيع", 
        description: error.message || "حدث خطأ أثناء إتمام البيع",
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.availability_status === 'available' &&
    (!searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>نقاط البيع - {t('common.systemName')}</title>
      </Helmet>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
        نقاط البيع (POS)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <input
              type="text"
              placeholder="ابحث عن منتج أو أدخل SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
              autoFocus
            />
          </GlassCard>

          <GlassCard>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addToCart(product)}
                    className="p-4 bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all text-right"
                  >
                    <div className="font-semibold text-sm mb-1 truncate">{product.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                    <div className="text-lg font-bold text-orange-600">
                      {product.selling_price} {product.currency}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Cart Sidebar */}
        <div className="space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">السلة</h2>
              {cart.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>السلة فارغة</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product_id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{item.product_name}</div>
                        <div className="text-xs text-gray-500">{item.sku}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-600 p-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-bold">
                        {item.total_price.toFixed(2)} {item.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold">الإجمالي:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {calculateTotal().toFixed(2)} {cart[0]?.currency || 'TRY'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = partners.find(p => p.id === e.target.value);
                      setSelectedCustomer(customer || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">اختياري - العميل</option>
                    {partners.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>

                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setIsCredit(e.target.value === 'credit');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="cash">نقد</option>
                    <option value="card">بطاقة</option>
                    <option value="transfer">تحويل</option>
                    <option value="credit">ذمة</option>
                  </select>

                  <InteractiveButton
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      <>
                        <Check className="h-5 w-5 ml-2" />
                        إتمام البيع
                      </>
                    )}
                  </InteractiveButton>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default POSPage;

