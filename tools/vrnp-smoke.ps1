$ErrorActionPreference = "Stop"
Write-Host "==========================="
Write-Host "  VR no Ponto - Smoke Test"
Write-Host "==========================="

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$healthUrl = "http://localhost:3000/api/health"

Write-Host "Subindo servidor local 'npm run dev' em background..."
$cmd = $env:ComSpec
$arg = "/c npm run dev -- -p 3000"
$process = Start-Process -FilePath $cmd -ArgumentList $arg -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru

Write-Host "Aguardando /api/health ficar OK (timeout 60s)..."
$deadline = (Get-Date).AddSeconds(60)
$ok = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $healthUrl
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { $ok = $true; break }
  } catch { }
  Start-Sleep -Seconds 2
}

if ($ok) { Write-Host "OK: /api/health respondeu 2xx" -ForegroundColor Green }
else { Write-Host "FAIL: /api/health não respondeu 2xx dentro do timeout" -ForegroundColor Red }

try { if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } } catch {}
try {
  $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}

if (-not $ok) { exit 1 }
