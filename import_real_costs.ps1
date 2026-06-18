<#
.SYNOPSIS
    Importiert Realkosten aus einer CSV-Datei in die laufende Backend-Datenbank.

.DESCRIPTION
    Die CSV muss in .\backend\input\ liegen. Zusätzliche Optionen werden an
    das Django-Management-Command durchgereicht.

.EXAMPLE
    .\import_real_costs.ps1 ist_kosten.csv
    .\import_real_costs.ps1 ist_kosten.csv --dry-run
    .\import_real_costs.ps1 ist_kosten.csv --encoding cp1252
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$CsvName,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"

# In das Script-Verzeichnis wechseln (= \application\)
Set-Location -Path $PSScriptRoot

$InputDir       = ".\backend\input"
$ContainerInput = "/app/input"
$LocalPath      = Join-Path $InputDir $CsvName

# Prüfen, ob die Datei lokal existiert
if (-not (Test-Path -Path $LocalPath -PathType Leaf)) {
    Write-Error "Datei '$LocalPath' nicht gefunden. Lege die CSV bitte in $InputDir\ ab."
    exit 1
}

# Prüfen, ob der Backend-Container läuft
$running = docker compose ps --status running backend
if (-not ($running -match "backend")) {
    Write-Host "Backend-Container läuft nicht. Starte Stack..." -ForegroundColor Yellow
    docker compose up -d backend
}

Write-Host "Importiere '$CsvName' (Delimiter ';', Encoding 'utf-8-sig')..."
if ($ExtraArgs) {
    Write-Host "Zusätzliche Optionen: $($ExtraArgs -join ' ')"
}
Write-Host ""

docker compose exec backend `
    python manage.py import_real_costs `
    "$ContainerInput/$CsvName" `
    --delimiter ";" `
    @ExtraArgs
