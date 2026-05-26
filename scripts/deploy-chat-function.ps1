$ErrorActionPreference = "Stop"

$projectId = "qtxtvmgpxgnjtrrukggn"
$functionName = "chat"
$functionPath = Join-Path $PSScriptRoot "..\supabase\functions\chat\index.ts"
$resolvedFunctionPath = (Resolve-Path $functionPath).Path

if (-not (Test-Path $resolvedFunctionPath)) {
  throw "Nao encontrei o arquivo da funcao em: $resolvedFunctionPath"
}

$token = $env:SUPABASE_MANAGEMENT_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = Read-Host "Cole aqui seu SUPABASE_MANAGEMENT_TOKEN"
}

if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Token nao informado."
}

$body = @{
  body = [System.IO.File]::ReadAllText($resolvedFunctionPath, [System.Text.Encoding]::UTF8)
  verify_jwt = $false
} | ConvertTo-Json -Depth 5

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
  "User-Agent" = "codex-local-deploy"
}

$url = "https://api.supabase.com/v1/projects/$projectId/functions/$functionName"

Write-Host ""
Write-Host "Publicando a funcao '$functionName'..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Method Patch -Uri $url -Headers $headers -Body $body

Write-Host ""
Write-Host "Publicacao concluida com sucesso." -ForegroundColor Green
Write-Host "Projeto: $projectId"
Write-Host "Funcao: $functionName"
Write-Host ""
Write-Host "Agora abra o site e reinicie a conversa do assistente." -ForegroundColor Cyan
