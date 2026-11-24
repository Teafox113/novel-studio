param([string]$Version, [switch]$Publish)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (!$Version) { $Version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version }
$folder = Join-Path $root "release/v$Version"
$names = @("Novel-Studio-$Version-Windows-x64-Setup.exe", "Novel-Studio-$Version-Windows-x64-NoInstall.zip", "Novel-Studio-$Version-Windows-x64-zh-TW.msi", 'SHA256SUMS.txt')
foreach ($name in $names) { if (!(Test-Path -LiteralPath (Join-Path $folder $name))) { throw "Missing release artifact: $name" } }
$env:GIT_TERMINAL_PROMPT = '0'
$credential = @{}
"protocol=https`nhost=github.com`n`n" | git credential fill | ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) { $credential[$parts[0]] = $parts[1] }
}
if (!$credential['password']) { throw 'GitHub authentication is required.' }
$headers = @{ Authorization = "Bearer $($credential['password'])"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'NovelStudio-Release' }
try {
    $api = 'https://api.github.com/repos/Teafox113/novel-studio'
    $release = @(Invoke-RestMethod "$api/releases" -Headers $headers) | Where-Object tag_name -eq "v$Version" | Select-Object -First 1
    if (!$release) {
        $body = @{ tag_name = "v$Version"; target_commitish = (git rev-parse HEAD).Trim(); name = "Novel Studio $Version"; body = (Get-Content -LiteralPath (Join-Path $root "docs/RELEASE_$Version.md") -Raw -Encoding utf8); draft = $true; prerelease = $false } | ConvertTo-Json
        $release = Invoke-RestMethod "$api/releases" -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
    }
    foreach ($name in $names) {
        $file = Join-Path $folder $name
        $asset = @($release.assets) | Where-Object name -eq $name | Select-Object -First 1
        if (!$asset) {
            if (!$release.draft) { throw 'Refusing to change an already published release.' }
            $upload = $release.upload_url -replace '\{.*$', ''
            $asset = Invoke-RestMethod "$upload`?name=$([Uri]::EscapeDataString($name))" -Method Post -Headers $headers -ContentType 'application/octet-stream' -InFile $file
        }
        $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($asset.size -ne (Get-Item -LiteralPath $file).Length -or $asset.digest -ne "sha256:$hash") { throw "Uploaded asset verification failed: $name" }
        Write-Output "Verified $name"
    }
    if ($Publish -and $release.draft) {
        $release = Invoke-RestMethod "$api/releases/$($release.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body '{"draft":false,"make_latest":"true"}'
    }
    Write-Output "Release: $($release.html_url) (draft=$($release.draft))"
} finally { $headers.Clear(); $credential.Clear() }
