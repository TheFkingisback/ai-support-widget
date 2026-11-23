$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$stage = Join-Path $env:TEMP ('ai-support-starter-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$public = Join-Path $root 'web/public'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $public 'widget.manifest.json') | ConvertFrom-Json
Copy-Item -LiteralPath (Join-Path $public 'starter') -Destination $stage -Recurse
$files = @(
    (Join-Path $PSScriptRoot 'server.mjs'), (Join-Path $PSScriptRoot 'bootstrap.mjs'),
    (Join-Path $PSScriptRoot 'README.md'), (Join-Path $root 'integration/v3/backend-session.mjs'),
    (Join-Path $root 'integration/v3/backend.env.example'), (Join-Path $public $manifest.file),
    (Join-Path $public 'widget.manifest.json')
)
Copy-Item -LiteralPath $files -Destination $stage
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath (Join-Path $public 'downloads/ai-support-starter.zip') -Force
