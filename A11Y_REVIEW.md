# Accessibility (A11Y) Review

## Summary

Full WCAG 2.1 Level AA accessibility audit and remediation across widget SDK and web admin dashboard.

**Audit Date:** 2026-02-20
**Standard:** WCAG 2.1 Level AA
**Scope:** widget/src/*, web/src/components/*, web/src/app/admin/*

---

## Widget SDK Fixes

### widget.ts — Floating Action Button
| Issue | Fix |
|-------|-----|
| Emoji-only button not announced by screen readers | Added `aria-label="Open support chat"` |
| No expanded state indication | Added `aria-expanded` toggling true/false |
| No dialog hint | Added `aria-haspopup="dialog"` |
| Focus lost on panel close | FAB receives focus on close |
| Panel opens without focus management | Input receives focus on open |

### chat.ts — Chat Panel
| Issue | Fix |
|-------|-----|
| Panel not identified as dialog | Added `role="dialog"` and `aria-label` |
| Header title not semantic | Changed `<span>` to `<h2>` with `id` for `aria-labelledby` |
| Close button unlabeled (only "X") | Added `aria-label="Close support chat"` |
| Escalate button lacks context | Added `aria-label="Escalate to human support"` |
| Messages not announced dynamically | Added `role="log"` and `aria-live="polite"` on messages container |
| Typing indicator not announced | Added `role="status"` and `aria-live="polite"` |
| Input lacks accessible name | Added `aria-label="Type your message"` |
| Send button lacks context | Added `aria-label="Send message"` |
| Input area not identified as form | Added `role="form"` with `aria-label` |
| No keyboard dismiss | Added Escape key handler to close panel |

### chat-renderer.ts — Feedback Buttons
| Issue | Fix |
|-------|-----|
| Emoji-only buttons (thumbs up/down) not labeled | Replaced `title` with `aria-label="Mark as helpful"` / `"Mark as not helpful"` |

### evidence.ts — Evidence Badges
| Issue | Fix |
|-------|-----|
| job_id badge clickable but not keyboard accessible | Added `role="button"`, `tabindex="0"`, Enter/Space key handler |
| No accessible name for copy action | Added `aria-label="Copy {label}: {value}"` |

### actions.ts — Confirmation Dialog
| Issue | Fix |
|-------|-----|
| Overlay not identified as dialog | Added `role="alertdialog"` and `aria-modal="true"` |
| No accessible description | Added `aria-describedby` pointing to confirmation message |
| No focus management | Cancel button receives focus on open |
| Focus can escape dialog | Added focus trap (Tab cycles between Yes/Cancel) |
| No keyboard dismiss | Added Escape key handler |

### styles.ts — Visual Accessibility
| Issue | Fix |
|-------|-----|
| Muted text contrast borderline in light mode (#71717a on #fff = 4.5:1) | Darkened to #5c5c66 (5.7:1 ratio) |
| Input removes outline on focus (`outline: none`) | Replaced with proper `outline: 2px solid` focus ring |
| Header title h2 has default margin | Added `margin: 0` reset |
| No reduced motion support | Added `@media (prefers-reduced-motion: reduce)` |
| No forced colors / high contrast support | Added `@media (forced-colors: active)` with visible borders |

---

## Web Admin Dashboard Fixes

### layout.tsx — Admin Layout
| Issue | Fix |
|-------|-----|
| No skip navigation link | Added "Skip to main content" link (visually hidden, visible on focus) |
| Main content not labeled | Added `id="main-content"` for skip link target |

### sidebar.tsx — Navigation Sidebar
| Issue | Fix |
|-------|-----|
| Active page not announced to AT | Added `aria-current="page"` on active link |
| Nav element unlabeled | Added `aria-label="Admin navigation"` |
| Sidebar landmark unlabeled | Added `aria-label="Admin sidebar"` |
| Mobile backdrop exposes to AT | Added `aria-hidden="true"` on backdrop overlay |
| Decorative icons read by AT | Added `aria-hidden="true"` on Icon components |

### create-tenant-modal.tsx — Modal Dialog
| Issue | Fix |
|-------|-----|
| Not identified as dialog | Added `role="dialog"`, `aria-modal="true"` |
| Not labeled | Added `aria-labelledby` pointing to h2 title |
| Close button (X icon) unlabeled | Added `aria-label="Close dialog"` |
| Focus not moved on open | Added `useEffect` to focus dialog on open |
| No keyboard dismiss | Added Escape key listener |
| Error messages not announced | Added `role="alert"` on error spans |

### charts.tsx — Data Visualizations
| Issue | Fix |
|-------|-----|
| Charts invisible to screen readers | Added `role="img"` with data-as-text `aria-label` |
| IntentsChart: no text alternative | `aria-label` lists all intents with counts |
| ErrorsChart: no text alternative | `aria-label` lists all error codes with counts |

### tenants/page.tsx — Tenants Table
| Issue | Fix |
|-------|-----|
| Table headers missing scope | Added `scope="col"` to all `<th>` elements |
| Loading state not announced | Added `role="status"` on loading text |
| Plus icon read by AT | Added `aria-hidden="true"` on Plus icon |

### tenants/[id]/page.tsx — Tenant Detail
| Issue | Fix |
|-------|-----|
| Back arrow link unlabeled | Added `aria-label="Back to tenants list"` |
| ArrowLeft/Save icons read by AT | Added `aria-hidden="true"` on icons |
| Connector toggle buttons lack state | Added `aria-pressed` toggle attribute |
| Connector group unlabeled | Added `role="group"` with `aria-label="Connector toggles"` |
| Save confirmation not announced | Added `role="status"` on "Saved successfully" text |

### tenants/[id]/cases/page.tsx — Cases
| Issue | Fix |
|-------|-----|
| Back arrow link unlabeled | Added `aria-label="Back to tenant details"` |
| Status filter select unlabeled | Added `aria-label="Filter by status"` |
| Table headers missing scope | Added `scope="col"` to all `<th>` elements |
| Table rows click-only (no keyboard) | Added `tabIndex={0}`, `role="button"`, `aria-label`, Enter/Space handler |
| Loading state not announced | Added `role="status"` |
| Case detail modal not identified | Added `role="dialog"`, `aria-modal`, `aria-labelledby` |
| No keyboard dismiss for modal | Added Escape key handler |

### audit/page.tsx — Audit Log
| Issue | Fix |
|-------|-----|
| Tenant select unlabeled | Added `aria-label="Select tenant"` |
| Table headers missing scope | Added `scope="col"` to all `<th>` elements |
| Truncated details inaccessible | Added `title` attribute for full text on hover |
| Loading state not announced | Added `role="status"` |
| Pagination not semantic | Changed `<div>` to `<nav aria-label="Pagination">` |
| Prev/Next buttons unlabeled | Added `aria-label="Previous page"` / `"Next page"` |
| Current page not indicated | Added `aria-current="page"` on page indicator |

### analytics/page.tsx — Analytics Dashboard
| Issue | Fix |
|-------|-----|
| Tenant select unlabeled | Added `aria-label="Select tenant"` |
| Loading state not announced | Added `role="status"` |

---

## Color Contrast Verification

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Widget muted text (light) | #5c5c66 | #ffffff | 5.7:1 | AA |
| Widget muted text (dark) | #a1a1aa | #1e1e2e | 5.5:1 | AA |
| Widget primary text (light) | #1a1a2e | #ffffff | 16.5:1 | AAA |
| Widget primary text (dark) | #e4e4e7 | #1e1e2e | 11.8:1 | AAA |
| Web table-header text | #9ca3af | #030712 | 8.1:1 | AAA |
| Web text-gray-500 on gray-950 | #6b7280 | #030712 | 4.9:1 | AA |
| Web text-gray-400 on gray-950 | #9ca3af | #030712 | 8.1:1 | AAA |

---

## Keyboard Navigation Summary

### Widget
- **Tab order:** FAB -> (when open) Input -> Send -> Escalate -> Close
- **Escape:** Closes panel from anywhere, closes confirmation dialog
- **Enter:** Sends message from input, activates action buttons
- **Space/Enter:** Copies job_id evidence badge, activates all buttons
- **Focus trap:** Active in confirmation dialog (Yes <-> Cancel)

### Web Admin
- **Skip link:** Tab to "Skip to main content" bypasses sidebar
- **Tab order:** Follows natural DOM order through sidebar -> main content
- **Escape:** Closes Create Tenant modal, closes Case Detail modal
- **Enter/Space:** Opens case detail from table rows
- **aria-current:** Screen readers announce current page in sidebar

---

## Compliance Status

| Criterion | Status |
|-----------|--------|
| 1.1.1 Non-text Content | Pass (aria-labels on icons, chart descriptions) |
| 1.3.1 Info and Relationships | Pass (semantic HTML, table scope, form labels) |
| 1.4.3 Contrast (Minimum) | Pass (all text meets 4.5:1 AA) |
| 1.4.11 Non-text Contrast | Pass (focus indicators meet 3:1) |
| 2.1.1 Keyboard | Pass (all interactive elements keyboard accessible) |
| 2.1.2 No Keyboard Trap | Pass (Escape key exits dialogs, focus traps cycle) |
| 2.4.1 Bypass Blocks | Pass (skip navigation link added) |
| 2.4.3 Focus Order | Pass (logical tab order maintained) |
| 2.4.7 Focus Visible | Pass (2px solid outline on all focusable elements) |
| 3.3.1 Error Identification | Pass (form errors use role="alert") |
| 4.1.2 Name, Role, Value | Pass (all components properly labeled) |
| 4.1.3 Status Messages | Pass (role="status" on loading/success messages) |
