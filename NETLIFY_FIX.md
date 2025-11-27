# إصلاح مشكلة نشر Netlify

## المشكلة
خطأ في نشر Netlify: "Deploy logs are currently unavailable"

## الحلول المطبقة

### 1. تحديث netlify.toml
- تغيير `npm install` إلى `npm ci` للبناء الأكثر استقراراً
- إضافة `CI = "false"` لتجنب مشاكل CI/CD
- تحسين إعدادات البناء

### 2. التحقق من Environment Variables

تأكد من إضافة المتغيرات التالية في Netlify Dashboard:

#### متغيرات مطلوبة:
```
VITE_NEON_DATABASE_URL=postgresql://...
```

#### كيف تضيفها:
1. اذهب إلى Netlify Dashboard
2. اختر موقعك
3. اذهب إلى Site settings > Environment variables
4. أضف المتغيرات المطلوبة

### 3. إعادة نشر الموقع

#### الطريقة 1: من Netlify Dashboard
1. اذهب إلى Deploys
2. اضغط على Trigger deploy > Deploy site
3. اختر Clear cache and deploy site

#### الطريقة 2: من Git
```bash
git commit --allow-empty -m "Trigger Netlify rebuild"
git push origin main
```

### 4. التحقق من Logs

إذا استمرت المشكلة:
1. اذهب إلى Deploys في Netlify
2. اضغط على آخر deployment
3. راجع Build logs للتحقق من الأخطاء

### 5. إعدادات Build Settings

في Netlify Dashboard:
- **Build command**: `npm ci --legacy-peer-deps && npm run build`
- **Publish directory**: `dist`
- **Node version**: `18`

### 6. حلول إضافية

#### إذا استمر الخطأ:

1. **Clear Build Cache**:
   - Deploys > Trigger deploy > Clear cache and deploy site

2. **تحقق من package.json**:
   - تأكد من أن جميع dependencies محدثة
   - تحقق من scripts في package.json

3. **تحقق من Memory Limit**:
   - إذا كان المشروع كبير، قد تحتاج لزيادة Memory في Netlify

4. **تحقق من Netlify Status**:
   - اذهب إلى https://status.netlify.com
   - تحقق من حالة الخدمة

## نصائح إضافية

- استخدم `npm ci` بدلاً من `npm install` للبناء
- تأكد من وجود ملف `.nvmrc` أو تحديد Node version في netlify.toml
- تحقق من حجم المشروع - Netlify لديه حدود حجم معينة
- تأكد من أن جميع ملفات الإعداد (vite.config.js, package.json) صحيحة

## الدعم

إذا استمرت المشكلة:
- راجع Build logs في Netlify
- تحقق من Netlify Community Forums
- راجع Netlify Documentation

