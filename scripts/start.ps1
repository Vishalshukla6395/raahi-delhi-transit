$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) { throw 'Run the README setup commands first.' }
if (-not (Test-Path -LiteralPath 'frontend/dist/index.html')) {
    & npm --prefix frontend run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
}
& .\.venv\Scripts\python -m uvicorn raahi.api:app --host 127.0.0.1 --port 8000
