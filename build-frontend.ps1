# AI Support Widget — Frontend Build (Night 2)
# Run:            .\build-frontend.ps1           (auto-resumes from where it stopped)
# Force restart:  .\build-frontend.ps1 -Start 10 (start from scratch)

param([int]$Start = -1)

$specs = @(
    @{N=10; F="specs/10-widget-sdk.md"; D="Widget SDK (embeddable chat)"}
    @{N=11; F="specs/11-admin-dashboard.md"; D="Admin Dashboard + Analytics"}
    @{N=12; F="specs/12-api-docs.md"; D="API Docs + Developer Portal"}
)

# ============================================================
# AUTO-RESUME: detect last completed sprint from git log
# ============================================================
if ($Start -eq -1) {
    $lastCommit = git log --oneline 2>$null | Select-String "feat\(sprint-(\d+)\)" | Select-Object -First 1
    if ($lastCommit -and $lastCommit.Matches.Groups[1]) {
        $lastSprint = [int]$lastCommit.Matches.Groups[1].Value
        $Start = $lastSprint + 1
        Write-Host "Auto-resume: last completed sprint was $lastSprint, starting from $Start" -ForegroundColor Cyan
    } else {
        $Start = 10
        Write-Host "No previous frontend sprints found, starting from 10" -ForegroundColor Cyan
    }
}

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "  AI SUPPORT WIDGET — FRONTEND BUILD" -ForegroundColor Green
Write-Host "  Started: $(Get-Date)" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

$ok = $true
if (!(Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "  X Node.js not found" -ForegroundColor Red; $ok = $false }
if (!(Get-Command claude -ErrorAction SilentlyContinue)) { Write-Host "  X Claude Code not found" -ForegroundColor Red; $ok = $false }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "  X Git not found" -ForegroundColor Red; $ok = $false }
if (!(Test-Path "CLAUDE.md")) { Write-Host "  X CLAUDE.md not found" -ForegroundColor Red; $ok = $false }
if (!$ok) { Write-Host "`nFix the above and retry." -ForegroundColor Red; exit 1 }
Write-Host "  All OK`n" -ForegroundColor Green

foreach ($s in $specs) {
    if ($s.N -lt $Start) { continue }
    Write-Host "`n========== SPRINT $($s.N): $($s.D) ==========" -ForegroundColor Yellow
    Write-Host "Started: $(Get-Date)"
    git add -A 2>$null; git diff --cached --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { git commit -m "checkpoint: before sprint $($s.N)" --no-verify 2>$null }
    claude -p "Read CLAUDE.md and API-CONTRACT.md and $($s.F). BEFORE building components, read the actual backend route files in server/src/modules/ to verify real request/response shapes. Implement everything. Write all tests. Run tests and fix until green. Append to progress.txt." --dangerously-skip-permissions
    git add -A 2>$null; git diff --cached --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { git commit -m "feat(sprint-$($s.N)): $($s.D)" --no-verify 2>$null }
    Write-Host "Sprint $($s.N) done: $(Get-Date)" -ForegroundColor Green
}

Write-Host "`n========== INTEGRATION AUDIT ==========" -ForegroundColor Magenta
claude -p "Audit EVERY frontend API call in web/src/ and widget/src/ against actual backend routes in server/src/. Verify paths, methods, field names, auth headers all match. Remove any frontend features without backend endpoints. Fix mismatches. Create INTEGRATION_AUDIT_FRONTEND.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null; git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "fix(integration): frontend audit" --no-verify 2>$null }

Write-Host "`n========== DESIGN REVIEW ==========" -ForegroundColor Magenta
claude -p "Review ALL components in web/src/ and widget/src/ for design quality. Fix visual consistency, spacing, typography, theme, hover states, mobile responsiveness. Create DESIGN_REVIEW.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null; git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "style: design review" --no-verify 2>$null }

Write-Host "`n========== ACCESSIBILITY REVIEW ==========" -ForegroundColor Magenta
claude -p "Review ALL components for accessibility. Fix aria labels, keyboard nav, focus indicators, color contrast. Widget must be fully keyboard accessible. Create A11Y_REVIEW.md. Run tests." --dangerously-skip-permissions
git add -A 2>$null; git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "a11y: review" --no-verify 2>$null }

Write-Host "`n========== TEST REVIEW ==========" -ForegroundColor Magenta
claude -p "Review all tests. Add missing edge cases for widget, admin, and API docs. Run tests. Create TEST_REVIEW_FRONTEND.md." --dangerously-skip-permissions
git add -A 2>$null; git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) { git commit -m "test: frontend review" --no-verify 2>$null }

Write-Host "`n========== FINAL ==========" -ForegroundColor Green
npx vitest run
git log --oneline
Write-Host "`nFRONTEND BUILD COMPLETE: $(Get-Date)" -ForegroundColor Green
