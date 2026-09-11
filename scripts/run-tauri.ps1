param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $TauriArguments
)

$vsWherePath = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vsWherePath)) {
    throw 'Visual Studio Installer was not found.'
}

$installationPath = & $vsWherePath `
    -latest `
    -products * `
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    -property installationPath

if (-not $installationPath) {
    throw 'Microsoft C++ Build Tools were not found.'
}

$devCommandPath = Join-Path $installationPath 'Common7\Tools\VsDevCmd.bat'
$environmentLines = & cmd.exe /d /s /c "`"$devCommandPath`" -arch=x64 -host_arch=x64 >nul && set"

foreach ($environmentLine in $environmentLines) {
    $separatorIndex = $environmentLine.IndexOf('=')
    if ($separatorIndex -le 0) {
        continue
    }

    $name = $environmentLine.Substring(0, $separatorIndex)
    $value = $environmentLine.Substring($separatorIndex + 1)
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

$cargoRoot = if ($env:CARGO_HOME) { $env:CARGO_HOME } else { Join-Path $env:USERPROFILE '.cargo' }
$rustBinaryPath = Join-Path $cargoRoot 'bin'
$env:Path = "$rustBinaryPath;$env:Path"

$tauriCliPath = Join-Path $PSScriptRoot '..\node_modules\@tauri-apps\cli\tauri.js'
if (-not (Test-Path -LiteralPath $tauriCliPath)) {
    throw 'The local Tauri CLI was not found. Run npm install first.'
}

& node $tauriCliPath @TauriArguments
exit $LASTEXITCODE
