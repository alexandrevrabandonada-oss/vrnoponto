$ErrorActionPreference = "Stop"
Write-Host "==========================="
Write-Host "  VR no Ponto - Ops Push"
Write-Host "==========================="

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_PROJECT_REF)) {
  Write-Host "ERRO FATAL: SUPABASE_PROJECT_REF ausente." -ForegroundColor Red
  Write-Host "Dica: $env:SUPABASE_PROJECT_REF=""pmfnlvtwenqrrdxarodl""" -ForegroundColor Yellow
  exit 1
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
  # valida que a CLI está logada (não depende de ACCESS_TOKEN env)
  npx supabase projects list *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Você não parece estar logado no Supabase CLI. Rode: npx supabase login" -ForegroundColor Red
    exit 1
  }

  Write-Host ("Linkando projeto: " + $env:SUPABASE_PROJECT_REF + "...")
  npx supabase link --project-ref $env:SUPABASE_PROJECT_REF
  if ($LASTEXITCODE -ne 0) { exit 1 }
  Write-Host "Link OK." -ForegroundColor Green

  Write-Host "Subindo migrations (db push)..."
  npx supabase db push --linked
  if ($LASTEXITCODE -ne 0) { exit 1 }
  Write-Host "Migrations OK." -ForegroundColor Green

  $ans = Read-Host "Executar seed (via --include-seed)? (y/N)"
  if ($ans -match "^(y|Y)$") {
    # garante seed.sql no padrão da CLI
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
