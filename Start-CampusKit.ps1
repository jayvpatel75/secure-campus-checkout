$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
# Some Windows machines have an inactive nvm shim before the installed runtime.
$candidates = @((Get-Command node -ErrorAction SilentlyContinue).Source, "$env:ProgramFiles\nodejs\node.exe")
$runtime = $null
foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $version = & $candidate -p 'Number(process.versions.node.split(".")[0])' 2>$null
        if ($LASTEXITCODE -eq 0 -and $version -match '^\d+$' -and [int]$version -ge 24) {
            $runtime = Split-Path -Parent $candidate
            break
        }
    }
}
if (-not $runtime) { throw 'Install Node.js 24 or later, then run this launcher again.' }
$env:Path = "$runtime;$env:Path"
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
if (-not (Test-Path -LiteralPath 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
# Seeding is explicit and refuses production mode; it preserves existing fixtures.
& npm.cmd run seed:demo
if ($LASTEXITCODE -ne 0) { throw 'Demo setup failed. This launcher is for local demos only.' }
Write-Host 'Open http://localhost:3000. Press Ctrl+C to stop.'
& npm.cmd run dev
