param([string]$Version = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!$Version) { $Version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding utf8 | ConvertFrom-Json).version }
$destination = Join-Path $projectRoot "release/v$Version"
$portable = Join-Path $projectRoot "release/noinstall-$Version"
New-Item -ItemType Directory -Force $destination, $portable | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "src-tauri/target/release/bundle/nsis/Novel Studio_${Version}_x64-setup.exe") -Destination (Join-Path $destination "Novel-Studio-$Version-Windows-x64-Setup.exe")
Copy-Item -LiteralPath (Join-Path $projectRoot "src-tauri/target/release/bundle/msi/Novel Studio_${Version}_x64_zh-TW.msi") -Destination (Join-Path $destination "Novel-Studio-$Version-Windows-x64-zh-TW.msi")
Copy-Item -LiteralPath (Join-Path $projectRoot 'src-tauri/target/release/novel-studio.exe') -Destination (Join-Path $portable 'Novel-Studio.exe')
Copy-Item -LiteralPath (Join-Path $projectRoot 'docs/USER_GUIDE.md') -Destination (Join-Path $portable '使用說明.md')
Copy-Item -LiteralPath (Join-Path $projectRoot "docs/RELEASE_$Version.md") -Destination (Join-Path $portable '更新紀錄.md')
foreach ($guide in @('CHARACTER_PROFILE.md', 'FICTIONAL_HISTORY.md', 'INTERACTIVE_BOOK.md', 'WRITING_VARIABLES.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot "docs/$guide") -Destination (Join-Path $portable $guide) }
Compress-Archive -LiteralPath (Join-Path $portable 'Novel-Studio.exe'), (Join-Path $portable '使用說明.md'), (Join-Path $portable '更新紀錄.md'), (Join-Path $portable 'CHARACTER_PROFILE.md'), (Join-Path $portable 'FICTIONAL_HISTORY.md'), (Join-Path $portable 'INTERACTIVE_BOOK.md'), (Join-Path $portable 'WRITING_VARIABLES.md') -DestinationPath (Join-Path $destination "Novel-Studio-$Version-Windows-x64-NoInstall.zip") -Force
Get-ChildItem -LiteralPath $destination -File | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object { '{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.Name } | Set-Content -Encoding utf8 (Join-Path $destination 'SHA256SUMS.txt')
Write-Output "Packaged at $destination"
