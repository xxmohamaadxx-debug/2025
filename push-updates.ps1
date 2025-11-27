# سكربت PowerShell لرفع التحديثات إلى GitHub
# Script to push updates to GitHub

Write-Host "🚀 بدء عملية رفع التحديثات..." -ForegroundColor Green
Write-Host ""

# التحقق من أننا في مجلد Git
if (-not (Test-Path ".git")) {
    Write-Host "❌ خطأ: هذا المجلد ليس مستودع Git!" -ForegroundColor Red
    exit 1
}

# إضافة جميع الملفات
Write-Host "📦 إضافة جميع الملفات..." -ForegroundColor Yellow
git add .

# التحقق من وجود تغييرات
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "ℹ️  لا توجد تغييرات للرفع." -ForegroundColor Cyan
    exit 0
}

# عرض الملفات المعدلة
Write-Host ""
Write-Host "📝 الملفات المعدلة:" -ForegroundColor Yellow
git status --short

# عمل commit
Write-Host ""
$commitMessage = Read-Host "💬 أدخل رسالة الـ commit (أو اضغط Enter لاستخدام الرسالة الافتراضية)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "تحديث: إصلاح مشاكل البناء والنشر على Netlify"
}

Write-Host ""
Write-Host "💾 عمل commit..." -ForegroundColor Yellow
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل عمل commit!" -ForegroundColor Red
    exit 1
}

# رفع إلى GitHub
Write-Host ""
Write-Host "⬆️  رفع التحديثات إلى GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل رفع التحديثات!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ تم رفع التحديثات بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 المستودع: https://github.com/xxmohamaadxx-debug/2025.git" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ انتظر حتى يبدأ البناء في Netlify..." -ForegroundColor Yellow
