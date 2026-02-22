$ErrorActionPreference = "Stop"
Write-Host "==========================="
Write-Host "  VR no Ponto - Ops Push"
Write-Host "==========================="

function Read-SecretPlain([string]$Prompt) {
  $sec = Read-Host -AsSecureString $Prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_PROJECT_REF)) {
  Write-Host "ERRO FATAL: SUPABASE_PROJECT_REF ausente." -ForegroundColor Red
  Write-Host "Dica: $env:SUPABASE_PROJECT_REF=""pmfnlvtwenqrrdxarodl""" -ForegroundColor Yellow
  exit 1
}

# DB password (needed for remote link/push in CI-like environments)
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_PASSWORD)) {
  Write-Host "SUPABASE_DB_PASSWORD ausente. Vou pedir a senha do Postgres (modo cego)..." -ForegroundColor Yellow
  $env:SUPABASE_DB_PASSWORD = Read-SecretPlain "Senha do Postgres (Supabase) - NÃO aparecerá na tela"
  if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_PASSWORD)) {
    Write-Host "ERRO: senha vazia." -ForegroundColor Red
    exit 1
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
  # valida login da CLI (não imprime segredos)
  npx supabase projects list *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Você não parece estar logado no Supabase CLI. Rode: npx supabase login" -ForegroundColor Red
    exit 1
  }

  Write-Host ("Linkando projeto: " + $env:SUPABASE_PROJECT_REF + "...")
  # passa senha para evitar prompt travando (Windows/CI)
  npx supabase link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD
  if ($LASTEXITCODE -ne 0) { exit 1 }
  Write-Host "Link OK." -ForegroundColor Green

  Write-Host "Subindo migrations (db push)..."
  # SUPABASE_DB_PASSWORD já está no env e será usada pela CLI
  npx supabase db push --linked
  if ($LASTEXITCODE -ne 0) { exit 1 }
  Write-Host "Migrations OK." -ForegroundColor Green

  $ans = Read-Host "Executar seed (via --include-seed)? (y/N)"
  if ($ans -match "^(y|Y)$") {
    if (!(Test-Path "supabase\seed.sql") -and (Test-Path "supabase\migrations\0002_seed.sql")) {
      Copy-Item "supabase\migrations\0002_seed.sql" "supabase\seed.sql" -Force
      Write-Host "Criado supabase\seed.sql a partir de 0002_seed.sql" -ForegroundColor Cyan
    }
    npx supabase db push --linked --include-seed
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Host "Seed OK." -ForegroundColor Green
  } else {
    Write-Host "Seed pulado."
  }
} finally {
  Pop-Location
}
Write-Host "=> Supabase remoto: finalizado."
