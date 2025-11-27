# Script to push updates to GitHub
Write-Host "=== Starting Git Push Process ===" -ForegroundColor Green

# Check status
Write-Host "`n1. Checking Git status..." -ForegroundColor Yellow
git status --short

# Add all files
Write-Host "`n2. Adding all files..." -ForegroundColor Yellow
git add -A

# Commit
Write-Host "`n3. Committing changes..." -ForegroundColor Yellow
git commit -m "feat: Complete advanced features - ApexCharts, ActiveUsersCard, AdvancedFinancialBox, enhanced Notifications, currency updates, image upload, section settings, SQL updates"

# Push to origin
Write-Host "`n4. Pushing to origin (58.git)..." -ForegroundColor Yellow
git push origin main

# Push to new-origin
Write-Host "`n5. Pushing to new-origin (2025.git)..." -ForegroundColor Yellow
git push new-origin main

Write-Host "`n=== Process Complete ===" -ForegroundColor Green

