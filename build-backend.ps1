param([int]$Start = -1)

$specs = @(
    @{N=0; F="specs/00-scaffold.md"; D="Scaffold + logger + shared types"}
    @{N=1; F="specs/01-gateway.md"; D="Support Gateway"}
    @{N=2; F="specs/02-snapshot-builder.md"; D="Snapshot Builder"}
    @{N=3; F="specs/03-context-processor.md"; D="Context Processor + sanitization"}
    @{N=4; F="specs/04-ai-orchestrator.md"; D="AI Orchestrator + OpenRouter"}
    @{N=5; F="specs/05-knowledge-base.md"; D="Knowledge Base RAG"}
    @{N=6; F="specs/06-escalation.md"; D="Escalation Engine"}
    @{N=7; F="specs/07-admin-api.md"; D="Admin API + analytics"}
    @{N=8; F="specs/08-integration.md"; D="Integration tests"}
)

if ($Start -eq -1) {
    $lastCommit = git log --oneline 2>$null | Select-String "feat\(sprint-(\d+)\)" | Select-Object -First 1
    if ($lastCommit -and $lastCommit.Matches.Groups[1]) {
        $lastSprint = [int]$lastCommit.Matches.Groups[1].Value
        $Start = $lastSprint + 1
        Write-Host "Auto-resume: last completed sprint was $lastSprint, starting from $Start" -ForegroundColor Cyan
    } else {
        $Start = 0
        Write-Host "No previous sprints found, starting from 0" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  AI SUPPORT WIDGET - BACKEND BUILD" -ForegroundColor Green
Write-Host ("  Started: " + (Get-Date)) -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

$ok = $true
if (!(Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "  X Node.js not found" -ForegroundColor Red; $ok = $false }
if (!(Get-Command claude -ErrorAction SilentlyContinue)) { Write-Host "  X Claude Code not found" -ForegroundColor Red; $ok = $false }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "  X Git not found" -ForegroundColor Red; $ok = $false }
if (!(Test-Path "CLAUDE.md")) { Write-Host "  X CLAUDE.md not found in current dir" -ForegroundColor Red; $ok = $false }
if (!$ok) { Write-Host "Fix the above and retry." -ForegroundColor Red; exit 1 }
Write-Host "  All OK" -ForegroundColor Green

foreach ($s in $specs) {
    if ($s.N -lt $Start) { continue }
    Write-Host ""
    Write-Host ("========== SPRINT " + $s.N + ": " + $s.D + " ==========") -ForegroundColor Yellow
    Write-Host ("Started: " + (Get-Date))
    git add -A 2>$null
    git diff --cached --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { git commit -m ("checkpoint: before sprint " + $s.N) --no-verify 2>$null }
    $prompt = "Read CLAUDE.md and API-CONTRACT.md and " + $s.F + ". Implement everything. Write all tests. Run npx vitest run in server/ and fix until green. Append to progress.txt."
    claude -p $prompt --dangerously-skip-permissions
    git add -A 2>$null
    git diff --cached --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { git commit -m ("feat(sprint-" + $s.N + "): " + $s.D) --no-verify 2>$null }
    Write-Host ("Sprint " + $s.N + " done: " + (Get-Date)) -ForegroundColor Green
}

Write-Host ""
Write-Host "========== INTEGRATION AUDIT ==========" -ForegroundColor Magenta
claude -p "Audit ALL routes in server/src/. Verify every route matches API-CONTRACT.md exactly: paths, methods, request/response types, error codes. Fix any mismatch. Verify tenant isolation in every DB query. Create INTEGRATION_AUDIT.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "fix(integration): audit" --no-verify 2>$null }

Write-Host ""
Write-Host "========== SECURITY REVIEW ==========" -ForegroundColor Magenta
claude -p "You are Kevin Mitnick. Review ALL files in server/src/. Check: secrets in LLM context, tenant isolation, JWT validation, rate limiting, PII leaks in logs, sanitization completeness. Fix issues. Create SECURITY_REVIEW.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "security: review" --no-verify 2>$null }

Write-Host ""
Write-Host "========== CODE REVIEW ==========" -ForegroundColor Magenta
claude -p "Review ALL files in server/src/ for clean code. Fix naming, duplication, function size. Create CODE_REVIEW.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "refactor: code review" --no-verify 2>$null }

Write-Host ""
Write-Host "========== TEST REVIEW ==========" -ForegroundColor Magenta
claude -p "Review all tests in server/src/. Add missing edge cases for: sanitization, tenant isolation, rate limiting, error handling. Run tests. Create TEST_REVIEW.md." --dangerously-skip-permissions
git add -A 2>$null
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "test: review" --no-verify 2>$null }

Write-Host ""
Write-Host "========== FINAL ==========" -ForegroundColor Green
Set-Location server
npx vitest run
npx tsc --noEmit
Set-Location ..
git log --oneline
Write-Host ("BACKEND BUILD COMPLETE: " + (Get-Date)) -ForegroundColor Green
