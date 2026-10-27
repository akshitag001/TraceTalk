# TraceTalk — UI v2: Homepage + Monochrome Redesign

> **How to use:** save this as `PROMPT_v2_UI.md` in the project root, then tell your IDE: *"Read PROMPT_v2_UI.md fully. It replaces Section 5 and Section 6 of PROMPT.md. Do Step 1 only, then stop and show me."* Go step by step.

---

## 0. Scope — read first

This is a **UI-layer redesign** of an existing, working app.

- **Do not change** the data model (`lib/types.ts`), the Zustand store logic, the parse pipeline, `/api/parse`, the offline parser, the ingestion code, or the sample data. If a UI change seems to need a logic change, stop and ask me.
- **Replace** Section 5 (design system) and Section 6 (screens) of `PROMPT.md` with this document.
- **Add** a homepage at `/`. The workbench stays at `/case/[id]`, the report at `/case/[id]/report`.
- Keep every existing feature working: filters, pinning, provenance highlighting, ledger, contradictions, report, import, reset.

## 1. What's wrong with the current UI (fix all of these)

1. **Everything has the same visual weight.** The timeline is a wall of monospace text with no hierarchy, so nothing important stands out.
2. **Too much noise.** Routine events (Teams, OneDrive, Edge Update, Office 365, the ERP) and 24 near-identical beacon rows bury the 10 events that matter.
3. **The core feature is hidden.** The voice capture bar, which is the whole product, is a thin line at the bottom of the screen.
4. **The empty ledger is a dead end.** A new visitor doesn't know what to say.
5. **No front door.** A judge lands straight in a log viewer with no idea what the product is, why voice matters, or how Wispr Flow fits.
6. **The color scheme feels generic.** It needs to move to a disciplined black, white and royal blue system.

## 2. Design direction

**References:** Vercel's dashboard, Linear, Stripe's docs, Raycast, Resend. These are monochrome, typographically confident, quiet, and precise, with one accent color used sparingly. Think of what a top 1% product engineer would ship: restraint, perfect alignment, nothing decorative.

**The rule:** black and white do 95% of the work. Royal blue marks only what is interactive or selected. Evidence colors (fact, hypothesis, unknown, conflict) appear only as small dots, thin bars and small badges.

**Still banned:** neon, glows, gradients (including text and buttons), glassmorphism, blur, decorative shadows, green-on-black terminal looks, matrix or glitch effects, sparkle / wand / brain / robot icons, the words "AI", "AI-powered", "magic", "smart" or "intelligent" in the UI, typing animations, emoji, ALL-CAPS tracked labels, stock illustrations, generic "trusted by" logo walls, and fade-up-on-scroll animations on every section.

## 3. Tokens

Implement both themes with CSS variables on `:root` and `[data-theme="dark"]`. Add a theme toggle (sun/moon icon button) in the homepage nav and the workbench top bar. Default: follow the system setting. Persist the choice in localStorage.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#000000` | Page background |
| `--surface` | `#FAFAFA` | `#0A0A0A` | Panes, cards, table body |
| `--surface-2` | `#F2F2F2` | `#141414` | Hover rows, inputs, code blocks |
| `--line` | `#E8E8E8` | `#1F1F1F` | Borders, dividers (1px) |
| `--line-strong` | `#D4D4D4` | `#2E2E2E` | Input borders, focused panes |
| `--text` | `#0A0A0A` | `#EDEDED` | Primary text |
| `--text-2` | `#666666` | `#A1A1A1` | Secondary text, column headers |
| `--text-3` | `#A3A3A3` | `#5C5C5C` | Placeholders, disabled |
| `--royal` | `#2445D1` | `#5B7BFF` | Links, focus ring, selected row bar, active tab underline |
| `--royal-soft` | `#2445D1` at 8% | `#5B7BFF` at 14% | Selected row background |
| `--fact` | `#15803D` | `#3FB950` | Confirmed facts |
| `--hyp` | `#B45309` | `#D29922` | Hypotheses |
| `--unknown` | `#6D28D9` | `#A78BFA` | Unknowns |
| `--conflict` | `#DC2626` | `#F85149` | Contradictions |

**Buttons:**
- Primary: `--text` background with `--bg` text. This means black in light mode and white in dark mode, Vercel-style. Royal blue is not used for button fills.
- Secondary: transparent with a 1px `--line-strong` border.
- Ghost: text only.
- Height 32px in the workbench, 40px on the homepage. Radius 6px.

**Radius:** 6px for buttons, inputs and badges; 8px for cards and the composer; 0 for tables and panes.

**Focus:** a 2px `--royal` ring with a 2px offset on every interactive element.

## 4. Typography

- **Geist Sans** for UI and **Geist Mono** for data. Load them with the `geist` npm package (`geist/font/sans`, `geist/font/mono`). Remove IBM Plex.
- Mono is used **only for values**: timestamps, event and entry IDs, IPs, ports, domains, file paths, command lines, hashes and raw JSON. Labels, verbs and sentences are always in Sans. This single rule fixes most of the current messiness.
- Workbench: 13px base, 12px for table mono values. Homepage: 16px body, 18px lead text. The hero headline is 56px desktop / 36px mobile, weight 600, tracking −0.03em, line-height 1.05.
- Sentence case everywhere. Use `tabular-nums` on all numbers.

## 5. Brand logos — strict rules

I will place the official logo files in `/public/brand/` myself:

- `wispr-flow.svg` (or `.png`), plus optionally `wispr-flow-white.svg` for dark mode
- `wemakedevs.svg`

Rules:
- **Never draw, trace, redraw or recreate any logo** as inline SVG, CSS or an icon. Only render these files with `next/image` or an `<img>` tag.
- If a file is missing, render the brand name as plain text in the same spot. Don't substitute any other image.
- Never recolor, stretch, crop, rotate or add effects to a logo. If no white version exists, show the logo on a `--surface` chip in dark mode so it stays legible.
- Logos appear only in the "Built with Wispr Flow" section and the footer. Use the wording "Built for No Hands: The Wispr Challenge by WeMakeDevs × Wispr Flow". Don't imply endorsement beyond that.

## 6. Homepage (`/`)

Put all copy in `content/home.ts` so I can edit it without touching components. Left-align everything, with a max width of 1120px and a text column of at most 640px. Separate sections with generous whitespace (120px desktop, 72px mobile) and a 1px `--line` divider. Don't use card grids.

### 6.1 Nav (sticky, 64px)

- Left: the "TraceTalk" wordmark in Geist Sans 600, 16px.
- Center/right: anchor links (How it works, Why voice, Integrity) and a GitHub icon link.
- Right: the theme toggle and a primary button, "Open sample case".
- Bottom: a 1px border that appears only after scrolling.

### 6.2 Hero

- **Headline:** "Speak your investigation. Keep the evidence."
- **Lead:** "TraceTalk is an investigation notebook for security analysts. Describe what you see in the logs out loud, and it becomes a ledger of facts, hypotheses and open questions, each one linked to the exact log line behind it."
- **Buttons:** "Open sample case" (primary, goes to `/case/IR-2026-0147`) and "Import your logs" (secondary, opens the workbench with the import modal).
- **Note under the buttons** in `--text-2`: "No signup. A sample incident with 61 real-format events is preloaded."

**Hero visual (the signature element of the page).** Below the text, show a real HTML rendering of the product's core transformation. It's static, not interactive, and must not be a screenshot. It sits in a bordered `--surface` frame with a slim window-style header that reads `IR-2026-0147` in mono.

- **Left column, "What you said":** the raw dictation, verbatim, filler words in `--text-3`: *"So, um, at 14:32 the host made an unusual outbound connection. The process was launched by PowerShell. We haven't confirmed data exfiltration yet."*
- **Right column, "What TraceTalk recorded":** three ledger rows, each with a 3px left bar in its evidence color.
  - `OBS-001` · Confirmed · "Outbound connection to 203.0.113.77:443 at 14:32:07" · chips `EVT-0017` `EVT-0018`
  - `OBS-002` · Confirmed · "Connecting process rundll32.exe was launched by powershell.exe" · chip `EVT-0015`
  - `UNK-001` · Open · "Whether data was exfiltrated" · chip `EVT-0048` marked "may answer"
- **Motion:** on first load only, the three rows appear one after another, 150ms apart. Disable this under `prefers-reduced-motion`. No other motion on the page.

### 6.3 The problem

- **Heading:** "Investigations lose their reasoning."
- **Body:** three short paragraphs in prose, no bullets.
  - When you're tracing an attack, your hands and eyes are on the logs. Switching to a notes app breaks focus, so notes get written later, from memory.
  - By the time the report is written, confirmed facts and educated guesses have blurred together.
  - A reviewer reading "data was exfiltrated" can't tell which log line proved it, or whether anything did.
- **Placeholder for my story:** `content/home.ts` must include a `founderNote` field rendered as a short quote with my name. Use this placeholder text: *"I built this because in my own blue-team labs I kept losing track of what I'd actually confirmed versus what I suspected."* — [Your Name]

### 6.4 How it works

The content really is a sequence, so use numbered steps. Lay them out as a vertical list with a thin connecting line, not three cards.

1. **Load your logs.** Import Sysmon, Windows Security, proxy and Defender events as JSONL. They land on one timeline, with repetitive noise grouped so the important events stand out.
2. **Say what you see.** Select events, hold your Wispr Flow key and talk. Each statement becomes a fact, a hypothesis or an open question.
3. **Let the evidence check you.** Facts are only marked confirmed when a log line backs them. Claims that conflict with the logs or with your earlier notes are flagged.
4. **Export a report a reviewer can trust.** Every sentence cites its evidence, and the full trail of what you said, and when, is attached.

Next to each step on desktop (below it on mobile), show a small, crisp UI fragment built in HTML that matches the workbench styling: a timeline row, a dictation in the composer, a contradiction card, and a report line with citations.

### 6.5 Why voice, and why Wispr Flow

- **Heading:** "Your hands stay on the evidence."
- **Body copy** (two columns on desktop: text on the left, a details list on the right):
  - TraceTalk doesn't ship its own speech engine. Wispr Flow works system-wide: hold your Flow key, speak naturally, and polished text lands in TraceTalk's composer, the same way it lands in Slack or your editor.
  - Flow removes filler words and fixes punctuation as you speak, so your notes read cleanly even when you think out loud.
  - Analysts in India can narrate in Hinglish, and Flow handles it.
  - Your eyes never leave the timeline. Select a row, hold the key, describe it, release, and move on.
- **Details list on the right**, as plain rows with a hairline between them:
  - "Hotkey: Fn on Mac, Ctrl + Win on Windows (configurable in Flow)"
  - "Works in: the composer, ledger edits, contradiction notes"
  - "Fallback: browser speech input or typing, if Flow isn't installed"
- **"Built by voice" strip:** "This project was built by voice for the No Hands challenge. Specs, prompts, commit messages and docs were dictated with Wispr Flow." Next to it, show a stat in large mono numerals, "[WORDS] words dictated", read from `content/home.ts` so I can update it from my usage card. Then show the Wispr Flow logo with a link to wisprflow.ai.

### 6.6 Integrity

- **Heading:** "Nothing confirmed without a log line."
- **Body:** "Every evidence link must quote an exact field value from the event it cites. If the quoted value isn't in the log, the link is rejected and recorded in the activity trail. TraceTalk only structures what you said. It never adds findings of its own."
- **Visual:** a small two-row example.
  - An accepted link: `EVT-0015 · ParentImage = …\powershell.exe` with a check mark.
  - A rejected link: `EVT-0012 · ParentImage = explorer.exe — value not found` with an x mark.

### 6.7 Final call to action and footer

- **Call to action:** a large left-aligned line, "Open the sample case and say something.", with the primary button below it.
- **Footer:** "Built for No Hands: The Wispr Challenge", the WeMakeDevs and Wispr Flow logos (following Section 5), my name, a GitHub link, and "Sample data is synthetic. IPs use RFC 5737 documentation ranges."

## 7. Workbench redesign (`/case/[id]`)

### 7.1 Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TraceTalk / IR-2026-0147  Suspicious outbound from WS-FIN-0142  High  Open │
│                                       Spoken times UTC   ◐   Export report │
├──────────┬─────────────────────────────────────────────┬───────────────────┤
│ Filters  │ Timeline   61 events · 9 routine hidden · ⌕ │ Ledger            │
│          │                                             │ All Facts Hyp ... │
│ Sources  │ 14:31:48  powershell.exe started by         │                   │
│ Hosts    │           WINWORD.EXE  [Encoded command]    │ ▍OBS-001 ...      │
│ Signals  │ ▸ 14:32:07  POST …/api/v1/health  ×24       │                   │
│          │             every ~60s · 14:32–14:57        │                   │
│ Activity │                                             │                   │
│          ├─────────────────────────────────────────────┤                   │
│          │ Event details (when a row is selected)      │                   │
├──────────┴─────────────────────────────────────────────┴───────────────────┤
│        ┌──────────────────────────────────────────────────────────┐        │
│        │ [EVT-0009 ×] [EVT-0015 ×]                                │        │
│        │ Hold Ctrl + Win and speak, or type a note            ⏎   │        │
│        └──────────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Top bar (48px)

- **Breadcrumb:** "TraceTalk" (links to `/`) / `IR-2026-0147` in mono. Then the case title in Sans 600, 14px, and small outline badges for severity and status.
- **Right side:** the spoken-times timezone selector (compact), the theme toggle, and "Export report" (primary).
- Remove the "Analyst: you" label.

### 7.3 Left rail (220px, collapsible with `[`)

Collapsible groups:
- **Sources:** checkbox and count.
- **Hosts:** checkbox and count.
- **Signals:** a new group of quick filters for the flagged events (Section 7.5), each with a count.
- **Activity:** the audit trail, last 20 items, in small text.

"Import logs" and "Reset demo case" move into a `⋯` menu in the rail header.

### 7.4 Timeline: the decluttering

**1. Two-line rows, 44px tall.**
- Line 1: time in mono `--text-2`, then the summary, where verbs are Sans in `--text` and values are Mono.
- Line 2, smaller and in `--text-2`: event ID in mono, source, event code and short host name, separated by spaces.
- Remove the separate ID, Source, Event and Host columns. Keep a narrow left gutter for the evidence-citation dot.

**2. Routine events are hidden by default.** Mark events as routine when the process or destination matches a list in `lib/routine.ts`: Teams, OneDrive, MicrosoftEdgeUpdate, outlook.office365.com, teams.microsoft.com and tally.corp-erp.in. Show "9 routine hidden" (with the real count) in the timeline header as a toggle. Routine events are never deleted; they're always searchable and included in the export.

**3. Group repetitive series.** Group three or more proxy events with the same method, host and path within a rolling 5-minute gap into one row: `POST telemetry.edge-syncsvc.net/api/v1/health ×24 · every ~60s · 14:32–14:57`. The row shows a chevron and expands inline.
- Any event in the series whose `bytes_in` or `bytes_out` is more than 10× the series median stays outside the group as its own row. This keeps EVT-0038 (611 KB response) and EVT-0048 (46 MB upload) visible.
- Grouping is a display concern only. The underlying events and their IDs don't change.

**4. Hover and selection.** Hover uses a `--surface-2` background. A selected row gets `--royal-soft` and a 2px `--royal` left bar. Pinned rows show a small pin icon on line 2.

### 7.5 Signals (deterministic flags, `lib/signals.ts`)

Compute small text tags per event from simple rules, and show them at the end of line 1. Each tag is an outline badge in `--text-2`, except Malware detected and Large upload, which use `--conflict` text.

| Tag | Rule |
|---|---|
| Encoded command | `CommandLine` contains `-Enc` or `-EncodedCommand` |
| Office spawned shell | `ParentImage` is WINWORD/EXCEL/OUTLOOK and `Image` is powershell/cmd/wscript/mshta |
| LOLBin | `Image` basename is rundll32, regsvr32, mshta or certutil |
| Discovery | `CommandLine` contains whoami, `net group`, nltest or `net user` |
| LSASS access | sysmon 10 with `TargetImage` ending in lsass.exe |
| Archive created | `TargetFilename` ends in .rar/.zip/.7z, or the command line contains ` a -hp` |
| Uncategorized domain | proxy `category` is Uncategorized |
| Large upload | proxy `bytes_out` > 10,000,000 |
| Failed logon | winsec 4625 |
| Malware detected | defender 1116 |

These are labels to help scanning. They never create ledger entries.

### 7.6 Event details

Show event details in a bottom drawer within the center column, resizable, closed when nothing is selected. It has three tabs: Overview, Raw, and Cited by.

**Overview contains:**
- A process chain rendered as a horizontal breadcrumb in mono, for example `OUTLOOK.EXE › WINWORD.EXE › powershell.exe`, built by following `ParentProcessGuid`.
- Key fields as a two-column list, labels in Sans `--text-2` and values in Mono.
- For encoded PowerShell, a "Decoded" row that shows the base64 decoded as UTF-16LE.

### 7.7 Ledger (right, 380px)

- Tabs with counts: All, Facts, Hypotheses, Unknowns, Conflicts. The active tab gets a 2px `--royal` underline.
- **Entry rows:**
  - Line 1: a 3px left evidence bar, then the entry ID in mono `--text-2`, then the event time.
  - Line 2: the statement in Sans 13px `--text`.
  - Line 3: evidence chips in mono, plus a "Confirmed" or "Unverified" badge.
  - An unverified fact uses a dashed bar.
- **Empty state, replacing the dead end:**
  - Heading: "Describe what you see."
  - Text: "Select one or more events, then speak or type. Try one of these:"
  - Three clickable example chips that insert their text into the composer without submitting:
    - "At 14:32 the host made an unusual outbound connection. The process was launched by PowerShell. We haven't confirmed data exfiltration yet."
    - "PowerShell was started by Explorer, so the user probably ran it by hand."
    - "Looks like they dumped credentials, rundll32 touched lsass at 14:41."
- Open questions and Contradictions stay as collapsible sections at the bottom, with counts in the headers. When the Contradictions count is above 0, its header text turns `--conflict`.

### 7.8 The composer (make it the star)

- A floating composer, centered at the bottom of the workbench: max width 760px, 16px from the bottom edge, `--surface` background, 1px `--line-strong` border, radius 8px. It's the only element in the app with a shadow: `0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)` in light mode, and none in dark mode (use `--line-strong` instead).
- **Pinned events** appear as removable mono chips above the input.
- **Input:** Sans 14px, grows up to 5 lines.
  - Placeholder: "Hold Ctrl + Win and speak, or type a note". Show "Fn" instead on Mac, detected from `navigator.platform` or userAgent.
  - Show the hotkey as small key caps (`kbd` styling: 1px border, radius 4px, mono 11px).
- **Right side:** the browser mic fallback button (only if the Web Speech API exists), the parser status in tiny `--text-2` text ("Offline rules" or "Model"), and a submit button (arrow icon, primary style).
- **While parsing:** show "Parsing…" with a 12px spinner.
- **After parsing:** a one-line result appears above the composer for 6 seconds, then collapses into the Activity list: "3 entries added · 1 conflict · Undo".
- Pressing `/` focuses the composer from anywhere.
- When the input is focused, the composer border becomes `--royal`. This is the one place the accent appears prominently, because it's where the voice input goes.

### 7.9 Signature interaction (keep and refine)

**Provenance highlighting** works in both directions.
- Hovering a ledger entry gives its cited timeline rows a left bar in the relation color and scrolls the first one into view.
- If a cited event is inside a collapsed group, auto-expand that group.
- Selecting an event shows its citing entries in the "Cited by" tab.

When a note is parsed, new ledger entries slide in at the top over 160ms, and their cited rows get a 1px `--royal` outline for 1.2s. Respect reduced motion.

## 8. Report page

Keep the existing structure. Restyle it:
- White page, `#0A0A0A` text, Geist Sans 15px, line-height 1.6, max width 720px.
- Entry and event IDs in Geist Mono 12px with royal-blue links.
- Section headings in 20px weight 600.
- Hairline table rules.
- Print stylesheet: hide the buttons, and print link targets as plain text.

## 9. Steps

Do one step at a time. After each one, run the app, check both themes, fix issues, and stop for my review.

1. **Tokens, fonts and theme toggle.** Apply the new tokens and Geist fonts across the existing workbench and report. No layout changes yet. Acceptance: both themes render with no leftover IBM Plex or old colors.
2. **Homepage.** Build `/` per Section 6, with copy in `content/home.ts` and logos per Section 5. Acceptance: it renders in both themes, works down to 375px width, the hero visual is pure HTML, and no logo is drawn in code.
3. **Timeline declutter.** Two-line rows, routine hiding, series grouping, and the signals in Section 7.5. Acceptance:
   - With defaults, the visible timeline shows no Teams, OneDrive, Edge Update, Office 365 or ERP rows.
   - The health beacons collapse into one group row.
   - EVT-0038 and EVT-0048 stay visible as separate rows.
   - EVT-0009 shows "Encoded command" and "Office spawned shell".
4. **Composer, ledger empty state, event drawer, top bar and rail.** Implement Sections 7.2, 7.3, 7.6, 7.7 and 7.8. Acceptance: the example chips insert their text, pinned chips appear in the composer, and EVT-0009's Overview shows the decoded PowerShell command and the chain `OUTLOOK.EXE › WINWORD.EXE › powershell.exe`.
5. **Polish.**
   - Keyboard shortcuts sheet (`?`), visible focus everywhere, reduced motion.
   - Below 1280px, the ledger becomes a slide-over toggled from the top bar.
   - Run Lighthouse accessibility and get it to 95 or above.
   - Check every screen against the banned list in Section 2.

## 10. Definition of done

- Opening `/` explains the product, the problem, how it works and how Wispr Flow fits, within one scroll on a laptop.
- "Open sample case" lands in a workbench where the incident's key events are readable at a glance, without scrolling past noise.
- The composer is clearly the main action on the screen.
- Black, white and royal blue in both themes; evidence colors only in small doses.
- Official logo files only, never recreated.
- Every feature from PROMPT.md still works.
