Write-Host "Content Amplifier - Smoke Test Runner"
Write-Host "====================================="

$required = @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY")
$envFile = Join-Path $PSScriptRoot "..\\.env"
$envFileVars = @{}
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $parts = $_.Split('=', 2)
    if ($parts.Count -eq 2) {
      $key = $parts[0].Trim()
      $value = $parts[1].Trim()
      if ($key) { $envFileVars[$key] = $value }
    }
  }
}

$missing = $required | Where-Object {
  -not (Get-Item -Path "Env:$($_)" -ErrorAction SilentlyContinue) -and -not $envFileVars.ContainsKey($_)
}

if ($missing.Count -gt 0) {
  Write-Warning ("Missing env vars: " + ($missing -join ", "))
} else {
  Write-Host "Env vars: OK"
}

try {
  $nodeVersion = & node --version 2>$null
  Write-Host "Node: $nodeVersion"
} catch {
  Write-Warning "Node not found in PATH"
}

Write-Host "Next: run 'npm install' (first time) then 'npm run dev'"
Write-Host "Checklist: testing\\smoke-checklist.md"
