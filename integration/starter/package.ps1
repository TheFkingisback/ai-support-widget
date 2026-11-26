$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot '../package.py')
exit $LASTEXITCODE
