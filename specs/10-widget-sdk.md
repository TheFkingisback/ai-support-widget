# Sprint 10: Widget SDK

## Objective
Build the embeddable JavaScript widget that host apps include via script tag. Shadow DOM for style isolation, zero dependencies.

## Tasks

### 1. Widget Entry (widget/src/widget.ts)
- `AISupportWidget.init(config)` — main entry point
  - Config: tenantKey, jwt, theme, position, locale, onTokenRefresh
  - Creates Shadow DOM container for style isolation
  - Injects CSS into shadow root
  - Renders chat button (floating action button)
  - On click: opens chat panel
  - Log INFO: widget initialized for tenant

### 2. Chat Panel (widget/src/chat.ts)
- Renders inside Shadow DOM:
  - Header: "Support" title + close button + "Talk to human" button (always visible per PRD)
  - Message list: scrollable, auto-scroll to bottom
  - Input: text input + send button + attachment button
  - Typing indicator when waiting for AI
  - Feedback buttons (thumbs up/down) after each AI response
- Message types:
  - User message: right-aligned, brand color
  - AI message: left-aligned, with evidence blocks and action buttons
  - System message: centered, gray

### 3. API Client (widget/src/api.ts)
- `createCase(message)` → Case
- `sendMessage(caseId, content)` → Message
- `addFeedback(caseId, feedback)` → void
- `escalate(caseId, reason)` → { ticketId, ticketUrl }
- All calls include Authorization: Bearer jwt
- Handles 401 by calling onTokenRefresh callback
- Log errors to console (widget has no file logger)

### 4. Evidence Renderer (widget/src/evidence.ts)
- Renders evidence blocks inline in AI messages:
  - Error codes: red badge
  - Job IDs: monospace, clickable (copies to clipboard)
  - Timestamps: formatted to user's locale
  - Log excerpts: code block with dark background

### 5. Action Buttons (widget/src/actions.ts)
- Renders suggested action buttons below AI messages:
  - Retry: calls action endpoint, shows result
  - Open docs: opens URL in new tab
  - Create ticket: calls escalate endpoint
  - Request access: calls action endpoint
- Confirmation dialog for destructive actions

### 6. Styles (widget/src/styles.ts)
- CSS-in-JS (template literal injected into Shadow DOM)
- Default theme: clean, professional, light background
- Dark theme variant
- CSS custom properties for host app customization:
  - --ai-support-primary: brand color
  - --ai-support-bg: background
  - --ai-support-text: text color
  - --ai-support-radius: border radius
- Responsive: works on mobile and desktop

### 7. Build Config (widget/tsconfig.json + build script)
- Compiles to single IIFE bundle
- Target: ES2020
- Output: dist/ai-support-widget.js (<50KB gzipped)
- No external dependencies

## Tests
1. Widget.init creates Shadow DOM container
2. Widget.init renders chat button
3. Chat panel opens on button click
4. Chat panel closes on close button click
5. sendMessage calls correct API endpoint
6. Typing indicator shows while waiting for response
7. AI message renders evidence blocks
8. AI message renders action buttons
9. Feedback buttons call feedback endpoint
10. "Talk to human" button triggers escalation
11. Widget handles 401 by calling onTokenRefresh
12. Styles are isolated in Shadow DOM

## Definition of Done
- All 12 tests pass
- Widget builds to single JS file
- Shadow DOM isolates styles
- Chat flow works end-to-end (mocked API)
- Evidence and actions render correctly
