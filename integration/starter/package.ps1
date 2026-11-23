$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Write-ReleaseZip([string]$Source, [string]$Destination) {
    $stream = [IO.File]::Open($Destination, [IO.FileMode]::Create)
    try {
        $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
        try {
            foreach ($file in (Get-ChildItem -LiteralPath $Source -Recurse -File | Sort-Object FullName)) {
                $name = $file.FullName.Substring($Source.Length + 1).Replace('\', '/')
                $entry = $zip.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
                $entry.LastWriteTime = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
                $sourceStream = $file.OpenRead()
                try {
                    $entryStream = $entry.Open()
                    try { $sourceStream.CopyTo($entryStream) } finally { $entryStream.Dispose() }
                } finally { $sourceStream.Dispose() }
            }
        } finally { $zip.Dispose() }
    } finally { $stream.Dispose() }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$stage = Join-Path $env:TEMP ('ai-support-starter-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$public = Join-Path $root 'web/public'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $public 'widget.manifest.json') | ConvertFrom-Json
$target = Join-Path $public $manifest.file
if ((Get-FileHash -LiteralPath $target).Hash -ne $manifest.sha256) { throw 'SDK and manifest do not match' }
Copy-Item -LiteralPath (Join-Path $public 'starter') -Destination $stage -Recurse
$files = @(
    (Join-Path $PSScriptRoot 'server.mjs'), (Join-Path $PSScriptRoot 'bootstrap.mjs'),
    (Join-Path $PSScriptRoot 'README.md'), (Join-Path $root 'integration/v3/backend-session.mjs'),
    (Join-Path $root 'integration/v3/backend.env.example'), (Join-Path $public $manifest.file),
    (Join-Path $public 'widget.manifest.json')
)
Copy-Item -LiteralPath $files -Destination $stage
Write-ReleaseZip $stage (Join-Path $public 'downloads/ai-support-starter.zip')

$integration = Join-Path $root 'integration/v3'
$mirror = Join-Path $public 'integration-v3'
$kit = Join-Path $stage 'full-kit'
New-Item -ItemType Directory -Path $kit | Out-Null
$inputs = @('GUIA.md','ACEITE.md','PUBLICACAO.md','context.schema.json','context.example.json',
  'backend-session.mjs','backend.env.example','examples.test.mjs','mcp-auth.mjs','widget-controller.mjs')
foreach ($input in $inputs) {
  $source = Join-Path $integration $input
  Copy-Item -LiteralPath $source -Destination $kit
  Copy-Item -LiteralPath $source -Destination (Join-Path $mirror $input) -Force
}
Copy-Item -LiteralPath (Join-Path $integration 'widget-controller.mjs') -Destination (Join-Path $mirror "widget-controller.v$($manifest.version).mjs") -Force
Copy-Item -LiteralPath $target -Destination $kit
Copy-Item -LiteralPath (Join-Path $public 'widget.manifest.json') -Destination $kit
Copy-Item -LiteralPath (Join-Path $public 'widget.manifest.json') -Destination (Join-Path $mirror 'widget.manifest.json') -Force
Copy-Item -LiteralPath $target -Destination $mirror
$entries = @(Get-ChildItem -LiteralPath $kit -File | Sort-Object Name | ForEach-Object {
  @{file=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()}
})
$json = @{sdkVersion=$manifest.version;files=$entries} | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $kit 'package.manifest.json'),$json+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
Write-ReleaseZip $kit (Join-Path $public "downloads/ai-support-integration-v3-sdk-$($manifest.version).zip")
