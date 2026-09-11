param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $CargoArguments
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
$cargoPath = Join-Path $cargoRoot 'bin\cargo.exe'
if (-not (Test-Path -LiteralPath $cargoPath)) {
    throw 'Rust Cargo was not found.'
}

& $cargoPath @CargoArguments
exit $LASTEXITCODE
