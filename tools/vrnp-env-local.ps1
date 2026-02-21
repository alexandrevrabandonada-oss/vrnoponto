<#
.SYNOPSIS
  Script para configurar variáveis de ambiente local no vrnoponto sem expor as chaves no terminal.
#>

$envFile = ".env.local"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  VR no Ponto - Configuração Local (.env)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "As variáveis inseridas aqui serão salvas localmente e estão seguras."

Function Prompt-SecureString {
  param([string]$Prompt)
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  if ($secure) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    return $plain
  }
  return ""
}

$supabaseUrl = Prompt-SecureString "Insira NEXT_PUBLIC_SUPABASE_URL (URL da API)"
$supabaseAnon = Prompt-SecureString "Insira NEXT_PUBLIC_SUPABASE_ANON_KEY (Chave Pública Anon)"
$supabaseService = Prompt-SecureString "Insira SUPABASE_SERVICE_ROLE_KEY (Chave Secreta/Service Role)"
$adminToken = Prompt-SecureString "Insira ADMIN_TOKEN (Sua senha para o painel Admin)"
$officialSource = Prompt-SecureString "Insira OFFICIAL_SOURCE_URL (Site PMVR)"

Write-Host ""
Write-Host "Gravando configuração em $envFile ..."

$content = @"
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon
SUPABASE_SERVICE_ROLE_KEY=$supabaseService
ADMIN_TOKEN=$adminToken
OFFICIAL_SOURCE_URL=$($officialSource -replace '^$', 'https://www.voltaredonda.rj.gov.br/horario-de-onibus/')
"@

Set-Content -Path $envFile -Value $content -Encoding UTF8
Write-Host "=> Pronto! Arquivo .env.local criado com sucesso." -ForegroundColor Green
Write-Host "=> Dica: NUNCA dê git commit neste arquivo." -ForegroundColor Yellow
