# Quick Deploy Script
Write-Host "🚀 بدء عملية النشر..." -ForegroundColor Green

cd "C:\Users\SANAD\Desktop\6"

Write-Host "📦 إضافة جميع الملفات..." -ForegroundColor Yellow
git add -A

Write-Host "📝 إنشاء commit..." -ForegroundColor Yellow
$commitMsg = "Fix: إصلاح أخطاء البناء - netlify.toml + جميع صفحات النظام الجديدة"
git commit -m $commitMsg

Write-Host "⬆️  رفع التحديثات..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع التحديثات بنجاح!" -ForegroundColor Green
    Write-Host "🌐 سيتم النشر على Netlify تلقائياً..." -ForegroundColor Cyan
} else {
    Write-Host "❌ فشل رفع التحديثات" -ForegroundColor Red
}

