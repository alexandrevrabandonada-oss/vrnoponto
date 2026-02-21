<#
.SYNOPSIS
  Script para fazer "Smoke Test" subindo o Next.js, chamando a rota de Health e derrubando-o a seguir.
#>

Write-Host "===========================" -ForegroundColor Cyan
Write-Host "  VR no Ponto - Smoke Test" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

Write-Host "Subindo servidor local 'npm run dev' em background..."
$port = 3000
$healthUrl = "http://localhost:$port/api/health"

# Dispara em background
$process = Start-Process npm -ArgumentList "run dev" -WindowStyle Hidden -PassThru

# Aguardando build do Turbopack
Write-Host "Aguardando startup do Turbopack (pode demorar até 15s)..."
$maxRetries = 15
$success = $false

for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -ErrorAction Stop
        if ($response.status -eq 'OK' -or $response.status -eq 'pass') {
            $success = $true
            break
        }
    } catch {
        Write-Host "." -NoNewline
    }
}

Write-Host "" # Quebra linha

if ($success) {
    Write-Host "[OK] Smoke Test passou com sucesso! Next.js e Banco responderam." -ForegroundColor Green
    $exitCode = 0
} else {
    Write-Host "[FATAL] Smoke Test falhou! /api/health nao respondeu codigo 200 no tempo limite." -ForegroundColor Red
    $exitCode = 1
}

Write-Host "Encerrando processo do Node Server..."
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Exit $exitCode
