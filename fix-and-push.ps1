# Fix Netlify config and push updates
Write-Host "🔧 إصلاح ملف netlify.toml..." -ForegroundColor Yellow

# التحقق من أن الملف تم إصلاحه
if (Test-Path "netlify.toml") {
    $content = Get-Content "netlify.toml" -Raw
    $duplicateCount = ([regex]::Matches($content, "\[build\.processing\]")).Count
    
    if ($duplicateCount -gt 1) {
        Write-Host "❌ لا يزال هناك تكرار في netlify.toml" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ ملف netlify.toml صحيح" -ForegroundColor Green
    }
}

Write-Host "📦 إضافة جميع التغييرات..." -ForegroundColor Yellow
git add -A

Write-Host "📝 إنشاء commit..." -ForegroundColor Yellow
git commit -m "Fix: إصلاح خطأ تكرار القسم في netlify.toml وإضافة جميع صفحات النظام الجديدة (صالة الإنترنت + متجر إكسسوارات)"

Write-Host "🔍 التحقق من remote..." -ForegroundColor Yellow
$remote = git remote get-url origin
Write-Host "Remote: $remote" -ForegroundColor Cyan

Write-Host "🚀 رفع التحديثات إلى GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع التحديثات بنجاح!" -ForegroundColor Green
    Write-Host "🌐 سيتم النشر على Netlify تلقائياً..." -ForegroundColor Cyan
} else {
    Write-Host "❌ فشل رفع التحديثات" -ForegroundColor Red
    exit 1
}

