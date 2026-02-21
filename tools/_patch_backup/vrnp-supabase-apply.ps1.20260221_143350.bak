<#
.SYNOPSIS
  Script para validar chaves remotas e engatilhar Migrações do Supabase.
#>

$projectRef = $env:SUPABASE_PROJECT_REF
$accessToken = $env:SUPABASE_ACCESS_TOKEN

Write-Host "===========================" -ForegroundColor Cyan
Write-Host "  VR no Ponto - Ops Push" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

If ([string]::IsNullOrWhiteSpace($projectRef) -or [string]::IsNullOrWhiteSpace($accessToken)) {
    Write-Host "ERRO FATAL: Variáveis SUPABASE_PROJECT_REF ou SUPABASE_ACCESS_TOKEN ausentes." -ForegroundColor Red
    Write-Host "Declare-as na sessão atual com `$env:SUPABASE_PROJECT_REF="..." ou verifique se o Antigravity as possui em memória." -ForegroundColor Red
    Exit 1
}

Write-Host "[OK] Variáveis de ambiente encontradas." -ForegroundColor Green

Write-Host "Iniciando Link do Projeto $projectRef..."
try {
   npm run supabase:link 
} catch {
   Write-Host "Aviso: 'supabase link' acusou erro (o projeto já pode estar linkado ou deu conflito). Continuando..." -ForegroundColor Yellow
}

Write-Host "Subindo Migrations para o banco remoto..."
try {
   npm run supabase:push
} catch {
   Write-Host "Falha durante o supabase db push. Verifique o output acima." -ForegroundColor Red
   Exit 1
}

$prompt = Read-Host "Migrations aplicadas com sucesso. Executar SEED base? (Y/n)"
if ($prompt -eq 'y' -or $prompt -eq 'Y' -or $prompt -eq '') {
   Write-Host "Executando Seed..."
   npm run supabase:seed
} else {
   Write-Host "Pulando processo de Seed."
}

Write-Host "=> Processo do Supabase Remoto finalizado." -ForegroundColor Green
