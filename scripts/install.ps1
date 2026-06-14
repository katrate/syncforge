# SyncForge — Installer for Windows (PowerShell)
#
# Usage:
#   powershell -c "irm https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.ps1 | iex"
#
# Or with options:
#   powershell -c "$script=Invoke-RestMethod 'https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.ps1'; & ([ScriptBlock]::Create($script)) -Dir 'C:\dev\syncforge' -NoGlobal"
#
# NOTE: When using | iex, interactive prompts are skipped.
# Use -Dir and -NoGlobal flags to control installation non-interactively.

param(
  [string]$Dir = "$env:USERPROFILE\syncforge",
  [switch]$NoGlobal = $false,
  [switch]$SkipBuild = $false,
  [switch]$Help = $false
)

$REPO = "katrate/syncforge"
$BRANCH = "master"

# ─── Detect if we have a real console (interactive) ───
$HAS_CONSOLE = $false
try {
  $HAS_CONSOLE = $Host.UI.RawUI -and $Host.UI.RawUI.KeyAvailable -eq $false
} catch {
  $HAS_CONSOLE = $false
}

# ─── Help ───

if ($Help) {
  Write-Host @"
SyncForge Installer (Windows PowerShell)

Usage:
  irm https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/install.ps1 | iex

Options:
  -Dir <path>      Install directory (default: ~\syncforge)
  -NoGlobal        Skip global npm install
  -SkipBuild       Skip npm run build
  -Help            Show this help

"@
  exit 0
}

# ─── Colors ───

$GREEN  = [System.ConsoleColor]::Green
$CYAN   = [System.ConsoleColor]::Cyan
$YELLOW = [System.ConsoleColor]::Yellow
$RED    = [System.ConsoleColor]::Red

function info  { Write-Host "◇ " -ForegroundColor $CYAN -NoNewline; Write-Host "$args" }
function ok    { Write-Host "✔ " -ForegroundColor $GREEN -NoNewline; Write-Host "$args" }
function warn  { Write-Host "⚠ " -ForegroundColor $YELLOW -NoNewline; Write-Host "$args" }
function fail  { Write-Host "✖ " -ForegroundColor $RED -NoNewline; Write-Host "$args"; exit 1 }
function dim   { Write-Host "  $args" -ForegroundColor DarkGray }

# ─── Helper: Run npm via cmd.exe to bypass PowerShell execution policy ───
# On Windows, PowerShell often blocks npm.ps1 due to Restricted execution policy.
# Running via cmd /c uses npm.cmd instead, which works regardless of policy.

function Invoke-Npm([string]$args) {
  $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm $args" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\npm_out.txt" -RedirectStandardError "$env:TEMP\npm_err.txt"
  $stdout = Get-Content "$env:TEMP\npm_out.txt" -Raw
  $stderr = Get-Content "$env:TEMP\npm_err.txt" -Raw
  Remove-Item "$env:TEMP\npm_out.txt" -Force -ErrorAction SilentlyContinue
  Remove-Item "$env:TEMP\npm_err.txt" -Force -ErrorAction SilentlyContinue
  return @{ ExitCode = $process.ExitCode; StdOut = $stdout; StdErr = $stderr }
}

# ─── Main ───

Write-Host ""
Write-Host "  ⚡ SyncForge Installer" -ForegroundColor White
Write-Host ""

# Step 1: Check prerequisites

info "Checking prerequisites..."

# Check PowerShell execution policy (common issue with npm on Windows)
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq 'Restricted') {
  warn "PowerShell execution policy is 'Restricted' — npm.ps1 may be blocked."
  warn "The installer will use cmd.exe to run npm commands as a workaround."
  dim "  To fix permanently, run as Administrator: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
}

$missing = @()
try { $null = (Get-Command node -ErrorAction Stop) } catch { $missing += "Node.js" }
try { $null = (Get-Command git -ErrorAction Stop) } catch { $missing += "Git" }

if ($missing.Count -gt 0) {
  fail "Missing prerequisites: $($missing -join ', '). Download from https://nodejs.org and https://git-scm.com"
}

# Check if npm is available (via cmd.exe as fallback)
$npmAvailable = $false
try {
  $null = (Get-Command npm -ErrorAction Stop)
  $npmAvailable = $true
} catch {
  # Try via cmd.exe
  try {
    cmd /c "npm --version" 2>$null | Out-Null
    $npmAvailable = $true
  } catch {
    $npmAvailable = $false
  }
}

if (-not $npmAvailable) {
  fail "npm is required (comes with Node.js). Make sure Node.js is installed correctly."
}

$nodeVer = node --version
$gitVerRaw = git --version
$gitVer = ($gitVerRaw -split ' ')[2]
if (-not $gitVer) { $gitVer = $gitVerRaw }

dim "  Node: $nodeVer"
dim "  Git:  $gitVer"
dim "  OS:   Windows ($env:PROCESSOR_ARCHITECTURE)"
ok "Prerequisites met"

# Step 2: Download

info "Downloading SyncForge to $Dir"

if (Test-Path $Dir) {
  warn "Directory already exists: $Dir"
  if ($HAS_CONSOLE) {
    $answer = Read-Host "  Overwrite? [y/N]"
    if ($answer -ne "y" -and $answer -ne "Y") {
      Write-Host "  Installation cancelled."
      exit 1
    }
  } else {
    warn "Non-interactive mode — specify a different directory with -Dir"
    exit 1
  }
  Remove-Item -Recurse -Force $Dir
}

git clone --depth 1 "https://github.com/$REPO.git" $Dir 2>&1 | ForEach-Object { dim "  $_" }

if (-not (Test-Path $Dir)) {
  fail "Failed to download SyncForge"
}

ok "Downloaded SyncForge to $Dir"

Set-Location $Dir

# Step 3: Install dependencies

info "Installing dependencies..."
$npmResult = Invoke-Npm "install --loglevel=warn"
if ($npmResult.StdOut) { dim $npmResult.StdOut.Trim() }
if ($npmResult.StdErr) { dim $npmResult.StdErr.Trim() }
if ($npmResult.ExitCode -ne 0) { fail "npm install failed (exit code: $($npmResult.ExitCode))" }
ok "Dependencies installed"

# Step 4: Build

if (-not $SkipBuild) {
  info "Building..."
  $buildResult = Invoke-Npm "run build"
  if ($buildResult.StdOut) { dim $buildResult.StdOut.Trim() }
  if ($buildResult.StdErr) { dim $buildResult.StdErr.Trim() }
  if ($buildResult.ExitCode -ne 0) { fail "npm run build failed (exit code: $($buildResult.ExitCode))" }
  ok "Built successfully"
}

# Step 5: Global install (optional)

$doGlobal = $NoGlobal -eq $false

if ($doGlobal -and $HAS_CONSOLE) {
  Write-Host ""
  Write-Host "? " -ForegroundColor Yellow -NoNewline
  $answer = Read-Host "Install 'syncforge' globally? (run from anywhere) [Y/n]"
  if ($answer -eq "n" -or $answer -eq "N") {
    $doGlobal = $false
  }
}

if ($doGlobal) {
  info "Installing globally..."
  $globalResult = Invoke-Npm "install -g ."
  if ($globalResult.StdOut) { dim $globalResult.StdOut.Trim() }
  if ($globalResult.StdErr) { dim $globalResult.StdErr.Trim() }
  if ($globalResult.ExitCode -eq 0) {
    ok "Installed globally! Run: syncforge"
  } else {
    warn "Global install failed (try running PowerShell as Administrator)"
    dim "  You can still use: npx tsx $Dir\src\agent.ts"
  }
}

# ─── Done ───

Write-Host ""
ok "SyncForge installed successfully!"
Write-Host ""
Write-Host "  Location: $Dir" -ForegroundColor White
Write-Host "  Server:   npm run server"
Write-Host "  Create:   npm run dev -- init --name 'my-project'"
Write-Host "  Sync:     npm run dev -- start"
Write-Host ""
Write-Host "Documentation: https://github.com/$REPO/blob/$BRANCH/DOCUMENTATION.md" -ForegroundColor DarkGray
