# تعليمات رفع التحديثات إلى GitHub

## ✅ تم إنجازه:

1. ✅ إضافة ApexCharts إلى `package.json`
   - `react-apexcharts: ^1.4.1`
   - `apexcharts: ^3.49.0`

2. ✅ إنشاء ملف SQL: `update_advanced_features.sql`

3. ✅ تحديث جميع الملفات المطلوبة

## 🚀 خطوات الرفع (قم بتنفيذها يدوياً):

```bash
# 1. تثبيت ApexCharts
npm install --legacy-peer-deps

# 2. إضافة جميع التغييرات
git add -A

# 3. Commit
git commit -m "feat: Complete advanced features - ApexCharts, ActiveUsersCard, AdvancedFinancialBox, enhanced Notifications, currency updates, image upload, section settings, SQL updates"

# 4. رفع إلى المستودعين
git push origin main
git push new-origin main
```

## 📋 الملفات المعدلة:

- `package.json` - إضافة ApexCharts
- `src/components/ActiveUsersCard.jsx` - جديد
- `src/components/AdvancedFinancialBox.jsx` - جديد  
- `src/components/Notifications.jsx` - محسّن
- `src/lib/currencyService.js` - دعم SAR, EUR
- `src/lib/neonService.js` - دوال جديدة
- `src/components/Sidebar.jsx` - إعدادات الأقسام
- `src/pages/DashboardPage.jsx` - دمج المكونات
- `update_advanced_features.sql` - جديد
- وملفات أخرى...

## 🔗 المستودعات:

- `origin`: https://github.com/xxmohamaadxx-debug/58.git
- `new-origin`: https://github.com/xxmohamaadxx-debug/2025.git

