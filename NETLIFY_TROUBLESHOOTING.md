# حل مشكلة "Deploy logs unavailable" في Netlify

## 🔍 تشخيص المشكلة

عندما يظهر "Deploy logs are currently unavailable"، هذا يعني أن:
1. Netlify يواجه مشكلة في معالجة البناء
2. البناء فشل قبل إنشاء Logs
3. مشكلة في الخدمة نفسها

## ✅ الحلول المباشرة

### الحل 1: استخدام Netlify CLI (الطريقة الأفضل)

```bash
# 1. تثبيت Netlify CLI
npm install -g netlify-cli

# 2. تسجيل الدخول
netlify login

# 3. الانتقال إلى مجلد المشروع
cd "C:\Users\SANAD\Desktop\6"

# 4. ربط الموقع (أول مرة فقط)
netlify link

# 5. البناء والنشر
netlify build
netlify deploy --prod
```

### الحل 2: اختبار البناء محلياً

```bash
# 1. تثبيت dependencies
npm ci --legacy-peer-deps

# 2. اختبار البناء
npm run build

# 3. إذا نجح البناء محلياً، المشكلة في Netlify settings
# 4. إذا فشل، المشكلة في الكود - راجع الأخطاء
```

### الحل 3: تحديث Build Settings يدوياً

في Netlify Dashboard:

1. **اذهب إلى:** Site settings > Build & deploy > Build settings

2. **Build command:**
   ```
   npm ci --legacy-peer-deps && npm run build
   ```

3. **Publish directory:**
   ```
   dist
   ```

4. **Node version:**
   ```
   18
   ```

5. **Base directory:**
   ```
   (اتركه فارغ)
   ```

### الحل 4: Clear Build Cache وإعادة النشر

1. **اذهب إلى:** Site settings > Build & deploy > Build settings
2. **اضغط:** "Clear build cache"
3. **اذهب إلى:** Deploys
4. **اضغط:** "Trigger deploy" > "Clear cache and deploy site"

### الحل 5: التحقق من Environment Variables

1. **اذهب إلى:** Site settings > Environment variables
2. **تأكد من وجود:**
   ```
   VITE_NEON_DATABASE_URL = postgresql://...
   ```
3. **إذا لم تكن موجودة، أضفها**

## 🔧 إصلاحات متقدمة

### إضافة ملف `.nvmrc`

تم إنشاء ملف `.nvmrc` مع قيمة `18` لضمان استخدام Node 18.

### تحسين `netlify.toml`

تم إضافة:
- `NPM_CONFIG_LOGLEVEL = "error"` لتقليل Logs
- `NETLIFY_NODE_VERSION = "18"` لضمان الإصدار الصحيح

### إصلاح مشاكل محتملة في البناء

#### 1. مشكلة في Memory
```toml
NODE_OPTIONS = "--max-old-space-size=4096"
```

#### 2. مشكلة في Peer Dependencies
```toml
NPM_FLAGS = "--legacy-peer-deps"
```

#### 3. مشكلة في CI/CD
```toml
CI = "false"
```

## 📋 خطوات التحقق المتسلسلة

### الخطوة 1: اختبار محلي
```bash
npm ci --legacy-peer-deps
npm run build
```
**إذا نجح:** المشكلة في Netlify settings
**إذا فشل:** راجع الأخطاء وأصلحها

### الخطوة 2: فحص ملفات الإعداد
- ✅ `netlify.toml` موجود وصحيح
- ✅ `.nvmrc` موجود ويحتوي على `18`
- ✅ `package.json` scripts صحيحة
- ✅ `vite.config.js` موجود

### الخطوة 3: استخدام Netlify CLI
```bash
netlify build --debug
```
سيظهر لك Logs مفصلة حتى لو فشل

### الخطوة 4: التحقق من Build Logs عبر API

```bash
# احصل على Site ID من Netlify Dashboard
# Site settings > General > Site details > Site ID

# استخدم Netlify API
curl "https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

## 🚨 حلول سريعة

### إذا لم تظهر Logs:

1. **انتظر 10-15 دقيقة** (أحياناً Logs تتأخر)

2. **تحقق من Netlify Status:**
   - https://status.netlify.com
   - إذا كانت هناك مشاكل في الخدمة، انتظر

3. **جرب نشر من فرع آخر:**
   - أنشئ فرع جديد: `git checkout -b deploy-test`
   - ادفع: `git push origin deploy-test`
   - في Netlify، غير Branch إلى `deploy-test`

4. **استخدم Netlify CLI للبناء والنشر:**
   ```bash
   netlify build --debug > build.log 2>&1
   netlify deploy --prod --debug > deploy.log 2>&1
   ```

## 📝 ملفات تم إضافتها/تحديثها

- ✅ `.nvmrc` - تحديد إصدار Node
- ✅ `netlify.toml` - تحسينات إضافية
- ✅ `NETLIFY_TROUBLESHOOTING.md` - هذا الملف

## 🎯 الخطوة التالية الموصى بها

1. **جرب البناء محلياً:**
   ```bash
   npm ci --legacy-peer-deps
   npm run build
   ```

2. **إذا نجح، استخدم Netlify CLI:**
   ```bash
   netlify build
   netlify deploy --prod
   ```

3. **إذا استمرت المشكلة، تحقق من:**
   - Netlify Status
   - Environment Variables
   - Build Settings في Dashboard

## 📞 الدعم

إذا استمرت المشكلة بعد تجربة جميع الحلول:
- راجع Netlify Community: https://answers.netlify.com
- راجع Netlify Documentation: https://docs.netlify.com
- اتصل بـ Netlify Support إذا كان لديك خطة مدفوعة

