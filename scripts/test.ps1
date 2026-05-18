$ErrorActionPreference = "Stop"

$TestCommand = $env:TEST_COMMAND
if ([string]::IsNullOrWhiteSpace($TestCommand)) {
    $TestCommand = "echo "Add project validation command here""
}

Write-Host "Running validation:"
Write-Host $TestCommand
Invoke-Expression $TestCommand
