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

# ─── Main ───

Write-Host ""
Write-Host "  ⚡ SyncForge Installer" -ForegroundColor White
Write-Host ""

# Step 1: Check prerequisites

info "Checking prerequisites..."

$missing = @()
try { $null = (Get-Command node -ErrorAction Stop) } catch { $missing += "Node.js" }
try { $null = (Get-Command git -ErrorAction Stop) } catch { $missing += "Git" }
try { $null = (Get-Command npm -ErrorAction Stop) } catch { $missing += "npm" }

if ($missing.Count -gt 0) {
  fail "Missing prerequisites: $($missing -join ', '). Download from https://nodejs.org and https://git-scm.com"
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
npm install --loglevel=warn
if ($LASTEXITCODE -ne 0) { fail "npm install failed" }
ok "Dependencies installed"

# Step 4: Build

if (-not $SkipBuild) {
  info "Building..."
  npm run build
  if ($LASTEXITCODE -ne 0) { fail "npm run build failed" }
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
  $globalOutput = npm install -g . 2>&1
  $globalExitCode = $LASTEXITCODE
  if ($globalExitCode -eq 0) {
    ok "Installed globally! Run: syncforge"
  } else {
    warn "Global install failed (try running PowerShell as Administrator)"
    dim "  Error: $globalOutput"
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
