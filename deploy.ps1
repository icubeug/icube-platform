param(
  [string]$SshTarget = "root@139.84.247.205",
  [string]$SshKey = "$env:USERPROFILE\.ssh\icube_server",
  [string]$RemoteDir = "/opt/icube",
  [string]$ApiHost = "web.icubeug.net"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $Root ".deploy"
$BackendZip = Join-Path $Work "isp-upgrade.zip"
$FrontendZip = Join-Path $Work "isp-frontend.zip"

function SshArgs {
  $args = @()
  if (Test-Path -LiteralPath $SshKey) {
    $args += @("-i", $SshKey)
  }
  return $args
}

function Invoke-Remote {
  param([string]$Command)
  & ssh @(SshArgs) $SshTarget $Command
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $Command" }
}

function Copy-ToServer {
  param([string]$LocalPath, [string]$RemotePath)
  & scp @(SshArgs) $LocalPath "${SshTarget}:${RemotePath}"
  if ($LASTEXITCODE -ne 0) { throw "Upload failed: $LocalPath" }
}

function New-ZipFromFolder {
  param([string]$Source, [string]$Destination, [string[]]$Exclude)

  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Force
  }

  $Temp = Join-Path $Work ([IO.Path]::GetFileName($Source))
  if (Test-Path -LiteralPath $Temp) {
    Remove-Item -LiteralPath $Temp -Recurse -Force
  }

  New-Item -ItemType Directory -Path $Temp | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | Where-Object {
    $Exclude -notcontains $_.Name
  } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Temp -Recurse -Force
  }

  Compress-Archive -Path (Join-Path $Temp "*") -DestinationPath $Destination -Force
}

Write-Host "==> Preflight: checking SSH access to $SshTarget"
& ssh @(SshArgs) -o BatchMode=yes -o ConnectTimeout=10 $SshTarget "hostname"
if ($LASTEXITCODE -ne 0) {
  throw "SSH access failed. Add the server key to $SshKey or confirm password-capable SSH access."
}

Write-Host "==> Installing and building frontend locally"
Push-Location (Join-Path $Root "isp-frontend")
npm.cmd install
npm.cmd run build
Pop-Location

Write-Host "==> Installing backend dependencies locally"
Push-Location (Join-Path $Root "isp-upgrade")
npm.cmd install
Pop-Location

New-Item -ItemType Directory -Path $Work -Force | Out-Null

Write-Host "==> Packaging backend"
New-ZipFromFolder `
  -Source (Join-Path $Root "isp-upgrade") `
  -Destination $BackendZip `
  -Exclude @("node_modules", ".env", "logs")

Write-Host "==> Packaging frontend"
New-ZipFromFolder `
  -Source (Join-Path $Root "isp-frontend") `
  -Destination $FrontendZip `
  -Exclude @("node_modules", ".env")

Write-Host "==> Uploading packages"
Invoke-Remote "mkdir -p '$RemoteDir/.deploy' '$RemoteDir/isp-upgrade' '$RemoteDir/isp-frontend'"
Copy-ToServer $BackendZip "$RemoteDir/.deploy/isp-upgrade.zip"
Copy-ToServer $FrontendZip "$RemoteDir/.deploy/isp-frontend.zip"

Write-Host "==> Extracting release on server"
Invoke-Remote @"
set -e
cd '$RemoteDir'
tmp_backend='.deploy/isp-upgrade-new'
tmp_frontend='.deploy/isp-frontend-new'
rm -rf "`$tmp_backend" "`$tmp_frontend"
mkdir -p "`$tmp_backend" "`$tmp_frontend"
unzip -q -o .deploy/isp-upgrade.zip -d "`$tmp_backend"
unzip -q -o .deploy/isp-frontend.zip -d "`$tmp_frontend"
rm -rf isp-upgrade-new isp-frontend-new
mv "`$tmp_backend" isp-upgrade-new
mv "`$tmp_frontend" isp-frontend-new
if [ -f isp-upgrade/.env ]; then cp isp-upgrade/.env isp-upgrade-new/.env; fi
rm -rf isp-upgrade-old isp-frontend-old
if [ -d isp-upgrade ]; then mv isp-upgrade isp-upgrade-old; fi
if [ -d isp-frontend ]; then mv isp-frontend isp-frontend-old; fi
mv isp-upgrade-new isp-upgrade
mv isp-frontend-new isp-frontend
"@

Write-Host "==> Applying runtime configuration checks"
Invoke-Remote @"
set -e
test -f '$RemoteDir/isp-upgrade/.env' || { echo 'Missing $RemoteDir/isp-upgrade/.env'; exit 2; }
grep -q '^API_PUBLIC_HOST=' '$RemoteDir/isp-upgrade/.env' || echo 'API_PUBLIC_HOST=$ApiHost' >> '$RemoteDir/isp-upgrade/.env'
grep -q '^SMS_PROVIDER=' '$RemoteDir/isp-upgrade/.env' || echo 'SMS_PROVIDER=disabled' >> '$RemoteDir/isp-upgrade/.env'
"@

Write-Host "==> Rebuilding backend and applying migrations"
Invoke-Remote @"
set -e
cd '$RemoteDir/isp-upgrade'
docker compose up -d --build
docker compose exec -T api npm run migrate
"@

Write-Host "==> Installing frontend runtime dependencies and restarting PM2"
Invoke-Remote @"
set -e
cd '$RemoteDir/isp-frontend'
npm install --omit=dev
pm2 restart icube-frontend
"@

Write-Host "==> Health check"
Invoke-Remote "curl -fsS https://$ApiHost/health"

Write-Host "Done. System: https://web.icubeug.net"
Write-Host "Marketing: https://www.icubeug.net"
