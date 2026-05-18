param(
    [string]$FrontendCommand = "npm run dev",
    [string]$BackendCommand = "npm run dev"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Marketing Engine local services"
Write-Host "Frontend URL: http://localhost:3000"
Write-Host "Backend URL: not-applicable"
Write-Host ""
Write-Host "Frontend command:"
Write-Host $FrontendCommand
Write-Host ""
Write-Host "Backend command:"
Write-Host $BackendCommand
