# AI Support Widget — Build Manual

## Read This FIRST. The Whole Thing. Before Touching Anything.

This manual builds the entire AI Support Widget from the PRD.
Two overnight builds. Two mornings checking results.

```
NIGHT 1: Backend (Gateway, Snapshot, AI Orchestrator, Sanitization)
NIGHT 2: Frontend (Widget SDK, Admin Dashboard, API Docs)
```

---

## BEFORE YOU START (one time, 20 minutes)

You need 4 things on your Windows PC. If you already have them from TrackShare, skip to Step 5.

### Step 1: Install Node.js
1. Open your browser
2. Go to https://nodejs.org
3. Click the big green button (LTS)
4. Run the installer. Click Next on everything.
5. Close and reopen PowerShell
6. Type: `node --version`
7. You should see something like `v20.x.x`

**If it says "not recognized"**: close ALL PowerShell windows, open a NEW one, try again.

### Step 2: Install Git
1. Go to https://git-scm.com
2. Click "Download for Windows"
3. Run installer. Click Next on everything.
4. In PowerShell: `git --version`

### Step 3: Install Claude Code
1. Open PowerShell
2. Run this EXACTLY:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass
```
3. Type Y and Enter
4. Run:
```
npm install -g @anthropic-ai/claude-code
```
5. Wait 30 seconds

### Step 4: Log in to Claude
1. In PowerShell, type: `claude`
2. Browser opens. Log in with your account.
3. Come back to PowerShell
4. Type: `/exit`

### Step 5: Install Docker Desktop
1. Go to https://docker.com/products/docker-desktop
2. Download for Windows
3. Run installer. Restart if asked.
4. Open Docker Desktop (it should start automatically)
5. Wait until the whale icon in the system tray says "Running"
6. In PowerShell: `docker --version`

**You are done with setup. Never need to do this again.**

---

## NIGHT 1: BUILD THE BACKEND

### Step 1: Create the project folder
Open PowerShell. Copy-paste these lines ONE BY ONE:

```
cd $HOME\Desktop
mkdir ai-support-widget
cd ai-support-widget
git init
mkdir specs
```

### Step 2: Download the files
Download ALL files from the package. You should have:
- `CLAUDE.md`
- `API-CONTRACT.md`
- `build-backend.ps1`
- `specs/00-scaffold.md`
- `specs/01-gateway.md`
- `specs/02-snapshot-builder.md`
- `specs/03-context-processor.md`
- `specs/04-ai-orchestrator.md`
- `specs/05-sanitization.md`
- `specs/06-knowledge-base.md`
- `specs/07-escalation.md`
- `specs/08-admin-api.md`
- `specs/09-integration.md`

### Step 3: Place the files
Put them in the project folder:
- `CLAUDE.md` → `C:\Users\[you]\Desktop\ai-support-widget\`
- `API-CONTRACT.md` → same folder
- `build-backend.ps1` → same folder
- All `specs/*.md` files → `C:\Users\[you]\Desktop\ai-support-widget\specs\`

### Step 4: Verify the files are there
```
cd $HOME\Desktop\ai-support-widget
dir
dir specs
```

You should see CLAUDE.md, API-CONTRACT.md, build-backend.ps1, and the specs folder with 10 files.

**IF FILES ARE MISSING**: go back to Step 2. Don't continue without all files.

### Step 5: Save checkpoint
```
git add -A
git commit -m "initial setup"
```

### Step 6: Start the build
```
.\build-backend.ps1
```

**WHAT HAPPENS NEXT:**
- Text appears on screen. The AI is working.
- Each sprint takes 5-30 minutes.
- Total: 4-8 hours.
- DON'T close the window. DON'T close the laptop lid. DON'T unplug power.

**HOW TO KNOW IT'S WORKING:**
- Text keeps appearing (code, test results, file names)
- You see `Sprint X done:` messages in yellow/green

**HOW TO KNOW IT'S STUCK:**
- No new text for more than 10 minutes
- The cursor just blinks with no output

**IF IT'S STUCK:**
1. Press Ctrl+C to stop
2. Run the same command again:
```
.\build-backend.ps1
```
It auto-detects where it stopped and resumes from the next sprint. No need to figure out the sprint number.

### Step 7: Go to sleep

### Step 8: Morning check
Open PowerShell:
```
cd $HOME\Desktop\ai-support-widget
git log --oneline
```
You should see 10+ commits.

Run tests:
```
npx vitest run
```
ALL GREEN = backend is done.

Run type check:
```
npx tsc --noEmit
```
No output = perfect.

Read the review reports:
```
type INTEGRATION_AUDIT.md
type SECURITY_REVIEW.md
type CODE_REVIEW.md
type TEST_REVIEW.md
```

**Write down the test count. Send it to me if you want.**

---

## NIGHT 2: BUILD THE FRONTEND (Widget + Admin)

### Step 1: Download Build 2 files
You should have:
- `build-frontend.ps1`
- `specs/10-widget-sdk.md`
- `specs/11-widget-chat.md`
- `specs/12-admin-dashboard.md`
- `specs/13-admin-analytics.md`
- `specs/14-api-docs.md`
- `specs/15-landing-polish.md`

### Step 2: Place the files
Put `build-frontend.ps1` in the project root (same folder as CLAUDE.md).
Put all `specs/*.md` files in the `specs/` folder (alongside the backend specs).

### Step 3: Start the build
```
cd $HOME\Desktop\ai-support-widget
.\build-frontend.ps1
```

Same rules: don't close, don't unplug, go to sleep.

### Step 4: Morning check
Same process:
```
git log --oneline
npx vitest run
npx tsc --noEmit
```

Read frontend reviews:
```
type DESIGN_REVIEW.md
type A11Y_REVIEW.md
```

---

## TESTING THE APP LOCALLY

After both builds are done:

### Start the database
```
cd $HOME\Desktop\ai-support-widget
docker compose up -d
```
Wait 10 seconds.

### Start the backend
Open a PowerShell window:
```
cd $HOME\Desktop\ai-support-widget\server
npm run dev
```
Leave it running.

### Start the frontend
Open a SECOND PowerShell window:
```
cd $HOME\Desktop\ai-support-widget\web
npm run dev
```

### Open in browser
- Admin dashboard: http://localhost:3001
- API docs: http://localhost:3000/api/docs
- Widget test page: http://localhost:3001/demo

---

## DEPLOYING TO A SERVER

### Option A: Railway (easiest)
1. Push to GitHub:
```
cd $HOME\Desktop\ai-support-widget
git remote add origin https://github.com/YOUR-USER/ai-support-widget.git
git push -u origin master
```
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add PostgreSQL database (click + New → Database → PostgreSQL)
4. Add Redis (click + New → Database → Redis)
5. Add environment variables in Settings:
```
LOG_LEVEL=low
OPENROUTER_API_KEY=your-key-here
JWT_SECRET=generate-a-long-random-string
```

### Option B: VPS (DigitalOcean/Hetzner)
```
ssh root@YOUR-SERVER-IP

# Install everything
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git docker.io docker-compose-plugin nginx
npm install -g pm2

# Clone and build
cd /opt
git clone https://github.com/YOUR-USER/ai-support-widget.git app
cd app
docker compose up -d
cd server && npm install && npm run build && cd ..
cd web && npm install && npm run build && cd ..

# Configure
cp .env.example .env
nano .env
# Fill in: LOG_LEVEL, OPENROUTER_API_KEY, JWT_SECRET, DATABASE_URL, REDIS_URL

# Start
cd /opt/app/server && pm2 start npm --name "api" -- start
cd /opt/app/web && pm2 start npm --name "web" -- start
pm2 save && pm2 startup
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| "not recognized" when running node/git/claude | Close ALL PowerShell windows, open new one |
| Build script doesn't start | Make sure you're in the right folder: `cd $HOME\Desktop\ai-support-widget` |
| Build stuck (no output 10+ min) | Ctrl+C, then `.\build-backend.ps1 -Start [next sprint]` |
| Tests fail in the morning | Run: `claude -p "Run npx vitest run. Fix all failures." --dangerously-skip-permissions` |
| Docker won't start | Open Docker Desktop app, wait for whale icon to say "Running" |
| Port 3000 already in use | Kill whatever's using it: `npx kill-port 3000` or use `-p 3001` |
| "CLAUDE.md not found" error | You're in the wrong folder. `cd $HOME\Desktop\ai-support-widget` |

---

## QUICK REFERENCE

| I want to... | Command |
|--------------|---------|
| Run backend build | `.\build-backend.ps1` |
| Run frontend build | `.\build-frontend.ps1` |
| Resume from sprint 5 | `.\build-backend.ps1 -Start 5` |
| Run all tests | `npx vitest run` |
| Check for code errors | `npx tsc --noEmit` |
| See build history | `git log --oneline` |
| Start database | `docker compose up -d` |
| Stop database | `docker compose down` |
| Start backend | `cd server && npm run dev` |
| Start frontend | `cd web && npm run dev` |
| See app logs | `Get-Content logs\app-*.log -Tail 50` |
| See only errors | `Select-String '"level":"ERROR"' logs\app-*.log` |
| Fix failing tests | `claude -p "Fix failing tests" --dangerously-skip-permissions` |
| Go back to last good version | `git log --oneline` then `git reset --hard [hash]` |
| Turn on psycho logging | `$env:LOG_LEVEL="psycho"; npm run dev` |
