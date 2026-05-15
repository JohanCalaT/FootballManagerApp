#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Graba las 3 respuestas reales de API-Football para usar como fixtures en tests.

.DESCRIPTION
  Cuesta 3 peticiones del límite diario de 100. Solo ejecutar cuando el contrato
  cambia o las fixtures se pierden. Los archivos quedan en:

    src/FootballManagerApp/FootballManagerApp.Players.Infrastructure.Tests/
      ExternalServices/ApiFootball/Fixtures/

.EXAMPLE
  $env:ApiFootballKey = "tu-key-aqui"
  ./scripts/record-apifootball-fixtures.ps1
#>

$ErrorActionPreference = "Stop"

if (-not $env:ApiFootballKey) {
    Write-Host "ERROR: define `$env:ApiFootballKey antes de ejecutar." -ForegroundColor Red
    exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$fixtureDir = Join-Path $repoRoot "src/FootballManagerApp/FootballManagerApp.Players.Infrastructure.Tests/ExternalServices/ApiFootball/Fixtures"
New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null

$base = "https://v3.football.api-sports.io"
$headers = @{ "x-apisports-key" = $env:ApiFootballKey }

function Save-Fixture {
    param([string]$Url, [string]$Filename)

    Write-Host "GET $Url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $Url -Headers $headers -SkipHttpErrorCheck
    $path = Join-Path $fixtureDir $Filename
    [System.IO.File]::WriteAllText($path, $response.Content)
    Write-Host "  saved $Filename ($($response.Content.Length) bytes, HTTP $($response.StatusCode))" -ForegroundColor Green
}

Write-Host "== Recording API-Football fixtures (gastas 3/100 de tu cuota diaria) ==" -ForegroundColor Yellow
Write-Host ""

# 1) profiles search — Messi
Save-Fixture "$base/players/profiles?search=messi" "profiles-search-messi.json"

# 2) seasons — Messi (id 154)
Save-Fixture "$base/players/seasons?player=154" "seasons-player-154.json"

# 3) stats — Messi 2022
Save-Fixture "$base/players?id=154&season=2022" "stats-player-154-season-2022.json"

Write-Host ""
Write-Host "Done. Las fixtures viven en $fixtureDir" -ForegroundColor Yellow
Write-Host "Recuerda: NO commitear el contenido a la rama si revela info sensible." -ForegroundColor Yellow
