Param(
    [string]$ProjectName,
    [string]$DatabaseName,
    [string]$BranchName,
    [string]$ConnectionString,
    [string]$SqlFile = "APPLY_INVENTORY_FUEL_UPDATES.sql",
    [switch]$NoTransaction
)

function Abort([string]$msg) {
    Write-Host $msg -ForegroundColor Red
    exit 1
}

$neonctl = Get-Command neonctl -ErrorAction SilentlyContinue
if (-not $neonctl -and -not $ConnectionString) {
    Write-Host "Neon CLI (neonctl) غير موجود في PATH ولم يتم تمرير ConnectionString." -ForegroundColor Yellow
    Write-Host "يمكنك إما تثبيت Neon CLI أو تمرير -ConnectionString أو استخدام scripts/apply_migrations.ps1 مع psql." -ForegroundColor Yellow
    Abort "Aborting: neonctl not found and no ConnectionString provided.";
}

if (-not (Test-Path $SqlFile)) {
    Abort "Migration file not found: $SqlFile";
}

if (-not $ConnectionString) {
    # محاولة الحصول على connection string من neonctl
    $args = @("connection-string")
    if ($ProjectName) { $args += @("--project", $ProjectName) }
    if ($DatabaseName) { $args += @("--database", $DatabaseName) }
    if ($BranchName) { $args += @("--branch", $BranchName) }

    try {
        $ConnectionString = (& neonctl @args | Select-Object -First 1).Trim()
    } catch {
        Abort "Failed to obtain connection string via neonctl. Pass -ConnectionString explicitly.";
    }
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Abort "psql client not found. Install PostgreSQL client tools.";
}

Write-Host "Using connection string from Neon/explicit (hidden)" -ForegroundColor Cyan
Write-Host "Applying: $SqlFile" -ForegroundColor Cyan

$confirm = Read-Host "Type YES to continue"
if ($confirm -ne 'YES') { Write-Host "Aborted by user." -ForegroundColor Yellow; exit 0 }

$argsList = @()
if (-not $NoTransaction) { $argsList += "--single-transaction" }
$argsList += "-v"; $argsList += "ON_ERROR_STOP=1"
$argsList += "-f"; $argsList += $SqlFile

& psql $ConnectionString @argsList

if ($LASTEXITCODE -ne 0) { Write-Host "psql exited with code $LASTEXITCODE" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Migration applied successfully via Neon." -ForegroundColor Green

