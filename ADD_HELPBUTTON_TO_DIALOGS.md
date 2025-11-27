# إضافة HelpButton لجميع النماذج

## النماذج التي تم إضافة HelpButton لها:
1. ✅ `InventoryDialog.jsx` - موجود بالفعل
2. ✅ `UserDialog.jsx` - تم إضافته
3. ✅ `DailyExpenseDialog.jsx` - تم إضافته

## النماذج المتبقية التي تحتاج HelpButton:
1. `InvoiceDialog.jsx`
2. `PartnerDialog.jsx`
3. `EmployeeDialog.jsx`
4. `FuelTypeDialog.jsx`
5. `FuelTransactionDialog.jsx`
6. `ProductDialog.jsx`
7. `PurchaseInvoiceDialog.jsx`
8. `SessionDialog.jsx`
9. `DeviceDialog.jsx`
10. `SubscriptionTypeDialog.jsx`
11. `SubscriberDialog.jsx`
12. `ContractorProjectDialog.jsx`
13. `ContractorProjectItemDialog.jsx`
14. `CustomerDialog.jsx`
15. `PaymentDialog.jsx`
16. `PayrollDialog.jsx`
17. `StoreTypeDialog.jsx`
18. `InternetUsageDialog.jsx`

## طريقة الإضافة:
```jsx
import HelpButton from '@/components/ui/HelpButton';

// في DialogContent:
<DialogContent className="max-w-md relative">
  <HelpButton
    position="top-right"
    helpTextAr="النص بالعربية..."
    helpTextEn="Text in English..."
    helpTextTr="Türkçe metin..."
  />
  <DialogHeader>
    ...
  </DialogHeader>
  ...
</DialogContent>
```

## ملاحظات:
- HelpButton موجود في `src/components/ui/HelpButton.jsx`
- يجب إضافة `relative` إلى className في DialogContent
- النصوص يجب أن تكون واضحة ومفيدة للمستخدم

