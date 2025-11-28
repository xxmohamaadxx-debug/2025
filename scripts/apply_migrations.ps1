Param(
    [string]$ConnectionString = $env:PG_CONN,
    [switch]$NoTransaction
)

function Abort([string]$msg) {
    Write-Host $msg -ForegroundColor Red
    exit 1
}

if (-not $ConnectionString) {
    Write-Host "No connection string provided. Set environment variable `PG_CONN` or pass -ConnectionString.`nExample: -ConnectionString 'postgresql://user:pass@host:port/db'" -ForegroundColor Yellow
    Abort "Aborting: missing connection string.";
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "psql not found in PATH. Please install PostgreSQL client tools or use the Neon CLI. Example: https://neon.tech/docs" -ForegroundColor Yellow
    Abort "Aborting: psql client required.";
}

$scriptPath = Join-Path -Path (Get-Location) -ChildPath "APPLY_INVENTORY_FUEL_UPDATES.sql"
if (-not (Test-Path $scriptPath)) {
    Abort "Migration file not found at: $scriptPath";
}

Write-Host "About to apply migration: $scriptPath" -ForegroundColor Cyan
Write-Host "Connection string will be used from provided value (hidden)" -ForegroundColor Cyan

$confirm = Read-Host "Type YES to continue"
if ($confirm -ne 'YES') {
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
}

$argsList = @()
if (-not $NoTransaction) { $argsList += "--single-transaction" }
$argsList += "-v"; $argsList += "ON_ERROR_STOP=1"
$argsList += "-f"; $argsList += $scriptPath

Write-Host "Running: psql (single-transaction: $([bool](-not $NoTransaction)))" -ForegroundColor Cyan

& psql $ConnectionString @argsList

if ($LASTEXITCODE -ne 0) {
    Write-Host "psql exited with code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Migration applied successfully." -ForegroundColor Green
