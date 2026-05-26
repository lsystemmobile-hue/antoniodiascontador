$ErrorActionPreference = "Stop"

$projectRef = "qtxtvmgpxgnjtrrukggn"
$configPath = Join-Path $HOME ".codex\config.toml"
$backupDir = Join-Path $PSScriptRoot "backups"
$backupPath = Join-Path $backupDir ("codex-config-backup-" + (Get-Date -Format "yyyyMMddHHmmss") + ".toml")
$mcpUrl = "https://mcp.supabase.com/mcp?project_ref=$projectRef&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"

if (-not (Test-Path $configPath)) {
  throw "Nao encontrei o arquivo $configPath"
}

if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$content = Get-Content -LiteralPath $configPath -Raw
[System.IO.File]::WriteAllText($backupPath, $content, [System.Text.UTF8Encoding]::new($false))

$existingToken = $null
$existingBlock = [regex]::Match($content, '(?ms)^\[mcp_servers\.mcp_supabase\]\s*bearer_token_env_var = "([^"]+)"\s*enabled = true\s*url = "([^"]+)"')
if ($existingBlock.Success) {
  $existingToken = $existingBlock.Groups[1].Value
}

$currentEnvToken = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "User")

if ([string]::IsNullOrWhiteSpace($currentEnvToken)) {
  if ($existingToken -like "sbp_*") {
    [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", $existingToken, "User")
    $currentEnvToken = $existingToken
  } else {
    $typedToken = Read-Host "Cole seu token do Supabase para salvar em SUPABASE_ACCESS_TOKEN"
    if ([string]::IsNullOrWhiteSpace($typedToken)) {
      throw "Token nao informado."
    }
    [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", $typedToken, "User")
    $currentEnvToken = $typedToken
  }
}

$newBlock = @"
[mcp_servers.mcp_supabase]
bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"
enabled = true
url = "$mcpUrl"
"@

if ($content -match '(?ms)^\[mcp_servers\.mcp_supabase\].*?(?=^\[mcp_servers\.|\z)') {
  $content = [regex]::Replace($content, '(?ms)^\[mcp_servers\.mcp_supabase\].*?(?=^\[mcp_servers\.|\z)', $newBlock + "`r`n")
} else {
  $content = $content.TrimEnd() + "`r`n`r`n" + $newBlock + "`r`n"
}

[System.IO.File]::WriteAllText($configPath, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "MCP do Supabase configurado com sucesso." -ForegroundColor Green
Write-Host "Projeto: $projectRef"
Write-Host "Arquivo atualizado: $configPath"
Write-Host "Backup salvo em: $backupPath"
Write-Host ""
Write-Host "Agora feche totalmente o Codex/Desktop e abra novamente." -ForegroundColor Yellow
