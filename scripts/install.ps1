$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Command "node"
Require-Command "npm"
Require-Command "python"
Require-Command "ffmpeg"
Require-Command "ffprobe"

$venvDir = Join-Path $root ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

Write-Host "Installing Node dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed"
}

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating Python virtual environment..."
  python -m venv $venvDir
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create Python virtual environment. On Windows, make sure the Python installer includes venv and pip."
  }
}

if (-not (Test-Path $venvPython)) {
  throw "Python virtual environment is incomplete: $venvPython not found"
}

Write-Host "Checking pip inside .venv..."
& $venvPython -m pip --version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "pip is missing inside .venv, attempting to bootstrap with ensurepip..."
  & $venvPython -m ensurepip --upgrade
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to bootstrap pip inside .venv. Reinstall Python with pip support, then remove .venv and run this script again."
  }
}

Write-Host "Installing Python speech dependencies into .venv..."
& $venvPython -m pip install -r .\scripts\requirements-speech.txt
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install Python speech dependencies"
}

Write-Host ""
Write-Host "Install complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. .\.venv\Scripts\Activate.ps1"
Write-Host "2. python .\scripts\generate_speech_assets.py"
Write-Host "3. npm run studio"
