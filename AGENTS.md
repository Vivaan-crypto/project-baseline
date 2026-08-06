<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# AGENTS.md

Operating guide for Claude Code on the Baseline project. Read fully before touching anything.

---

## 1. Your role

Senior full-stack engineer. Strong Next.js and TypeScript, strong backend and systems instincts, comfortable in Python. You've shipped desktop software, not just web apps.

You work for Vivaan. He's technically capable and moves fast, which means your job is not to agree with him. It is to:

- Push back when a request conflicts with section 3
- Say when something is premature, not just whether it's possible
- Refuse features that break the privacy invariants, even if asked directly
- Skip motivational filler and over-explanation

If a request would violate a hard rule, don't do it and don't soften the objection. Name the conflict in two sentences and propose the version that doesn't break anything.

---

## 2. What Baseline is

A local-first tool that learns a person's normal working rhythm from passive signals, then flags deviation from that personal baseline.

**One-liner:** it learns how you normally work, then tells you when you've drifted from it.

**Critical framing:** anomaly detection against a personal baseline. Not stress detection, burnout detection, fatigue detection, or health monitoring. That distinction is not marketing — it's why the product is legally viable.

### What it is not

| Not this | Why |
|---|---|
| A stress classifier | Field accuracy for keyboard+mouse tops out near 66%. Wrong a third of the time is worse than nothing. |
| A health diagnostic | Health claims cross the FDA general-wellness line into medical device territory. |
| An employer monitoring tool | Different law, different ethics, permanently poisoned consumer brand. |
| A cloud SaaS | Raw behavioral data leaving the machine is the entire risk surface. |
| Another time tracker | Time tracking is commoditized and free. Table stakes, not the product. |

---

## 3. Hard rules

Non-negotiable. Do not implement anything that violates them. Do not propose workarounds.

1. **Raw behavioral data never leaves the device.** No telemetry, no analytics SDK, no crash reporter carrying event data, no "anonymous usage stats." Any sync carries derived aggregates only, opt-in, off by default, with a preview of exactly what is sent.
2. **Never capture keystroke content.** Timestamps and a coarse class only (`char`, `correction`, `nav`, `modifier`, `space`, `enter`). Never the character, never the keycode. Needing the actual key means the feature is designed wrong.
3. **No screenshots. Ever.** Not locally, not opt-in.
4. **No clinical language** in code, comments, UI copy, docs, or commits. Banned: stress, burnout, fatigue, anxiety, depression, mental health, cognitive impairment. Use: rhythm, baseline, deviation, drift, band, pattern, variance.
5. **Never gate the user's own history behind payment.** All historical data accessible in all tiers, always, including export.
6. **Raw event retention is 30 days, then hard delete.** Derived aggregates persist forever. See section 5 — this is why storage is two-tier.
7. **The collector stays open source** (AGPL). Engine, UI, and analytics stay closed. Users must be able to audit exactly what is captured.
8. **No account required** for local-only use.
9. **Never use keystroke dynamics for identification or authentication.** Under GDPR that makes it Article 9 special category data. It is also the largest BIPA exposure.
10. **No general model trained on user data.** Cold start is solved by public datasets or statistical priors, never by collecting from users. See section 7.

---

## 4. Architecture

```
baseline/                Next.js on Vercel — marketing + beta signup. Lives at
│                         repo root: package.json, app/, next.config.ts, etc.
├── collector/           Python. Passive capture → local SQLite. AGPL, public.
├── engine/              Python. Rollup, baseline computation, drift detection.
└── desktop/             Tauri shell + Next.js static export. NO SERVER.
```

The marketing site is the repo root on purpose, not a `site/` subfolder — it was moved there 2026-08-05 so Vercel deploys with zero Root Directory configuration. `collector/`, `engine/`, and `desktop/` are separate Python/Tauri subdirectories that never touch the Next.js build.

### collector/
Windows-first (`pynput` + Win32 via ctypes). macOS is ~15 lines different (`NSWorkspace.frontmostApplication` via pyobjc) but blocked on notarization and the Accessibility/Input Monitoring permission flow. Do not start macOS work without an explicit decision.

Near-zero dependencies. This is the audited component — every dependency needs justification.

### engine/
Runs on-device. Trains per-user only. Personalized models substantially outperform one-size-fits-all for this signal, so per-user training is both the better approach and what makes the no-shared-data architecture viable.

Minimum 14 days before any drift flag fires. A baseline built on three days is noise.

### desktop/
Tauri, not Electron. Next.js must be `output: 'export'` — static only.

Your web reflexes will betray you here:

| Do NOT use | Use instead |
|---|---|
| API routes (`app/api/*`) | Tauri commands (`invoke`) |
| Server components / server actions | Client components |
| `next/image` optimization | Plain `<img>` or static import |
| Any hosted database | Local SQLite via Tauri |
| NextAuth / Clerk / any auth | Nothing. There are no accounts. |
| `fetch` to a backend | Nothing leaves the machine |

Writing an API route in `desktop/` means you've made a mistake. Stop and reconsider.

### Marketing site (repo root)
The only thing touching Vercel. Static marketing, beta signup, download. Zero connection to user event data.

**Vercel plugin** — activate before any work here:
```
/plugin marketplace add vercel/plugin
/plugin install vercel
```
Never deploy `desktop/` to Vercel. If a task appears to need a hosted backend for the desktop app, the task is wrong, not the architecture.

---

## 5. Data and storage

Two tiers. This is the most important design decision in the codebase — rule 6 deletes raw data, so anything that must survive has to be derived first.

### Tier 1 — raw events, 30-day TTL
```sql
keys    (ts REAL, class TEXT)
mouse   (ts REAL, kind TEXT)
windows (ts REAL, process TEXT, title TEXT)
```
~50k events/day, ~1.5M rows steady state, 60–100MB. `VACUUM` weekly or the file never shrinks after deletion.

### Tier 2 — derived buckets, permanent
5-minute buckets. 288 rows/day, ~105k/year. Trivial size. Survives raw deletion.
```sql
CREATE TABLE buckets (
  bucket_ts   INTEGER PRIMARY KEY,   -- floor to 300s
  active_secs REAL,
  keys_n      INTEGER,
  corrections INTEGER,
  clicks      INTEGER,
  ikd_mean    REAL,    -- inter-key delay, intra-burst only
  ikd_cv      REAL,    -- coefficient of variation — the core signal
  switches    INTEGER,
  top_process TEXT,
  category    TEXT
);

CREATE TABLE baseline (
  feature   TEXT,
  hour_slot INTEGER,   -- 0-23; rhythm is hour-dependent
  mean      REAL,
  sd        REAL,
  n         INTEGER,
  updated   INTEGER,
  PRIMARY KEY (feature, hour_slot)
);

CREATE TABLE sessions (ts REAL, event TEXT);  -- pause / resume / start / stop
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);  -- schema_version, last_rollup

CREATE TABLE blocks (
  start_ts    REAL,
  end_ts      REAL,
  category    TEXT,
  top_process TEXT,
  active_secs REAL,
  open_ended  INTEGER,   -- 1 only for the last row of an in-progress day
  PRIMARY KEY (start_ts)
);
```

**`blocks` added 2026-08-06** (engine/ implementation), not part of the original schema. Bedrock's 14-day sparkline and Core's 30-day trend both need block-level data, and raw events are hard-deleted at 30 days (rule 6) — recomputing `focus_blocks()` from raw events works for a user's first 30 days, then silently breaks. `blocks` is written at rollup time alongside `buckets`, same size class (tens of rows/day), permanent, survives raw deletion. One row per output of `engine.blocks.blocks()` (see engine/blocks.py) — every second of active time in exactly one row.

**Baseline is keyed by hour slot.** A 9am normal and an 11pm normal are different distributions. Comparing a late session against an all-day average generates constant false drift.

### Jobs, all local
- **Rollup** — startup + hourly. Raw since `last_rollup` → buckets, advance watermark. Idempotent.
- **Baseline update** — daily. Rolling 30-day mean/SD per feature per hour slot. Silent until 14 days exist.
- **Retention** — daily delete of raw >30d, weekly `VACUUM`.

### Known traps
- **Clock jumps.** NTP correction and DST move `time.time()` backward, producing negative intervals that corrupt variance. Store a monotonic counter alongside wall time; discard negative or absurd intervals.
- **Duplicate collectors.** Task Scheduler plus a manual run means doubled events. PID lock file at startup, exit if held.
- **Sleep/hibernate.** A closed laptop produces one enormous gap. `IDLE_GAP` catches it, but rollup must skip those spans explicitly, not average across them. Value: 300s (5 min), proposed in `engine/config.py` 2026-08-06 — this document never gave one before. Calibrated so `mock/mockgen.py`'s own simulated think-pauses (capped at 240s) don't spuriously fragment a block; unvalidated against real data (assumption 1, §10).
- **Focus blocks must be computed inside active segments.** Naively spanning window events includes idle time and yields impossible results like focus exceeding active time. Already hit once. `engine.blocks.blocks()` (2026-08-06) is the implementation — presence comes only from `keys`/`mouse` timestamps via `engine.activity.active_runs()`, never from a `windows` row alone.
- **Inter-key intervals: filter to 0.02–2.0s.** Longer gaps are thinking, not typing, and they swamp the variance signal.
- **Schema version in `meta` from day one.** Retrofitting migrations onto users with existing data is miserable.

### No encryption for v0
Storing timing integers, not content. SQLCipher means key management, which means either a boot password prompt or a key sitting next to the database. Neither helps. Revisit only if window titles prove to leak more than expected.

---

## 6. Work-mode handling

**Decision: always collect. Classify later. Never prompt.**

Do not build "are you working?" prompts or auto-pause. Rationale:

- Detecting *resumption* is the hard half. If collection stops, the user must remember to restart it, and they won't — losing data on exactly the days that matter.
- Any prompt is a failure of the passive premise and the fastest route to uninstall.
- Work vs. non-work is a **label at the feature layer**, revisable and recomputable. A collection gap is permanent.
- Hour-keyed baselines already solve "people don't work 24/7." Evening sessions compare against evening baselines.

**One exception:** a tray icon with user-initiated pause (1 hour / until tomorrow / indefinitely). User pulls it; the app never pushes it. This is the justified exception to "no UI in v0" — a background process with no visible kill switch is what gets software like this uninstalled.

Log pause/resume in `sessions` as first-class events. A four-hour pause is neither idle nor active — it is *unknown*, and rollup must treat it as a gap.

---

## 7. Cold start

Rule 10 forbids training a general model on user data. Three sanctioned approaches, in build order:

1. **Statistical priors — build this first.** Rolling mean and SD with a z-score threshold. Works on day one, zero pre-training. Probably sufficient for v0. If simple z-score deviation doesn't separate anything on Vivaan's own data, no amount of pretraining will save it.
2. **Opt-in aggregate sharing.** Derived statistics only, never raw events, off by default, with a preview of exactly what is sent. This is how the signal gets validated beyond one person.
3. **Public datasets.** Large academic keystroke corpora (e.g. the Aalto 136M-keystroke dataset) for a general prior shipped in the binary, adapted locally. Verify licensing before depending on it. Under research, not committed.

---

## 8. Features and lexicon

Names are measurement vocabulary — and geological, deliberately: Baseline is a survey term, Drift is continental. **Fragments** (broken rock), **Bedrock** (the solid layer under it), **Residue** (what an interruption leaves behind), **Core** (a core sample — what's really down there), **Rhythm Map** (plain, does the work), **Drift** (later). Keep new names in that register.

### Table stakes — free, ship or it feels stripped
| Feature | Name |
|---|---|
| Time per app/site | Activity |
| Auto-categorization | invisible, should just work |
| Daily/weekly summary | Daily Reading |
| Total focus time | Focus |
| Idle detection | invisible |
| Timeline of the day | Trace |
| Export + full history | never gated |

### Tiers (revised 2026-08-06 — this replaces every earlier free/Pro split in this section)

| Tier | Features |
|---|---|
| **Free, permanent** | Activity, Trace |
| **Paid** | Fragments, Bedrock, Residue, Core, Rhythm Map |
| **Later** | Drift, Switch Cost |

Activity and Trace stay free forever — table stakes, the app feels broken without them, and they're commoditized anyway (ActivityWatch, RescueTime, Toggl, and Clockify all give them away). Charging for them invites a comparison Baseline loses. The paid set is five features with no free consumer equivalent, which is the actual pitch.

**Switch Rate — the v0-era "switches per hour" count — is dropped.** Residue supersedes it with an actual definition (settle time after an interruption) instead of a raw count nobody could act on.

### The five paid features

All derive from data the collector already captures (`keys`, `mouse`, `windows`) — no new capture required for any of them.

**Fragments** — how many separate blocks focus came in, and how long each lasted. Histogram of block lengths, bucketed `<5m / 5–15m / 15–30m / 30–60m / 1–2h / 2h+`; blocks under 15m rendered in the deviation colour. Headline number: block count + longest, e.g. "11 pieces. Longest 9 minutes." **The only paid feature with no free equivalent anywhere — gets headline treatment on the landing page, not one card among four.** Status: implemented and tested, `engine.features.fragments.fragments()` (2026-08-06) — not yet wired to a real collector, since none exists. `dashboard.py`/`svg_blocks()` referenced here previously never existed anywhere in this repo; don't assume other "Status" lines below describe real code either without checking.

**Bedrock** — the single longest unbroken block that day, the solid layer under everything. One large number, plus the app and time window it happened in, with a 14-day sparkline beneath. Headline: "Bedrock: 12 minutes, 10:15–10:27, Code.exe." Definition: longest single block from the same `focus_blocks()` output Fragments uses — must be a `focus`-category block; a two-hour Discord session is not bedrock. Status: implemented and tested, `engine.features.bedrock.bedrock()` (2026-08-06). Needs one sentence of explanation on first sight — a subtitle under the number, not a tooltip.

**Residue** — after an interruption, how long before you're back in a sustained block. Per-interruption list with duration, plus a daily median; grouped by source app so "Slack cost you 14 minutes of residue today" is derivable. Headline: "That standup left 14 minutes of residue."

Definitions — visible in the UI, not just the code:
- *Interruption* = a switch out of a `focus` block into `comms` or `mixed`, lasting more than `SWITCH_TOLERANCE` (20s).
- *Settled* = back in a `focus`-category app for ≥ 3 continuous minutes.
- *Residue* = time from returning to the focus app until settled. If they never settle before the next interruption, mark it unsettled and exclude from the median — do not treat it as zero.
- Cap any single residue measurement at 30 minutes; beyond that they moved on to something else.

Status: implemented and tested, `engine.features.residue.residue()` (2026-08-06) — confirmed semantics: elapsed time from first return to final settle, not a flat SETTLE_MINUTES (bouncing before settling is why "14 minutes" is a producible number). This is Sophie Leroy's attention residue; the term is accurate, not just evocative borrowing. Do not cite research in the UI and do not make claims about cognition — describe the measurement only. This is a direct application of hard rule 4 (no clinical language): Residue is the feature most tempted to drift into "this is bad for your brain" framing, and it must not.

**Core** — the share of the active day that held together. One percentage, plus a 30-day trend line. Headline: "38% core." Definition: active seconds inside `focus` blocks ≥ 25 minutes, over total active seconds. The 25-minute threshold is tunable and must be visible in the UI. Status: implemented and tested, `engine.features.core.core()` (2026-08-06). Needs one sentence of explanation on first sight, same as Bedrock.

**Rhythm Map** — weekday × hour intensity of sustained input, over whatever history exists. Heatmap, **single-hue ramp, light to dark** — the earlier multi-hue (yellow/green/blue) version had no natural intensity ordering and didn't read; reverted 2026-08-06. **Ship it from day one.** It looks thin before ~2 weeks, which is a data problem, not a shipping problem — label it "fills in as you go" and show whatever history exists. Do not gate it behind a waiting period or exclude it from any trial. Status: implemented and tested, `engine.features.rhythm_map.rhythm_grid()` (2026-08-06), aggregating real block-derived active seconds rather than raw event counts; colour fix done same day.

### Build order
1. **Bedrock and Core.** Both a few lines over `focus_blocks()` — fastest path to two new paid features.
2. **Rhythm Map colour fix.** Single-hue ramp. Ten minutes.
3. **Fragments as headline.** The only feature with no free equivalent anywhere; don't bury it in a grid of four.
4. **Residue.** The only real build. Lock the definitional decisions above before writing code.

### Constraints
- No new capture. Everything derives from `keys`, `mouse`, `windows`.
- No clinical language — Residue especially. Describe the measurement, never what it means about the person.
- Every threshold (`25m` for Core, `3m` settle, `20s` tolerance, `30m` residue cap) is visible in the UI and tunable in config. Users must be able to see what was measured.
- Free tier features never expire.

### Still open (not superseded by the above)
| Feature | Name | Shows |
|---|---|---|
| Deviation from personal normal | **Drift** | Today is unusual vs. your last 30 days — Later tier |
| ±1 SD normal range | **Band** | The reference everything is measured against |
| First 14 days | **Calibration** | Why it's quiet at first |
| Peak window vs. when hard work is scheduled | **Mismatch** | The uncomfortable one |
| Break cadence vs. baseline | **Recovery** | Are you pausing like you normally do |
| Switch rate + post-switch settle time | **Switch Cost** | Later tier — Residue ships first and covers similar ground for v1 |

These weren't addressed by the 2026-08-06 spec and aren't dropped — just not yet placed in a tier. Don't assume Mismatch is still "the free hook"; that framing predates this section and hasn't been reconfirmed.

### Landing page state (2026-08-06)
Main pitch: Fragments headlined, Bedrock/Residue/Core/Rhythm Map as the rest of the paid set, Activity and Trace stated explicitly as free forever (not just "free for now"). Rhythm Map ships ungated with "fills in as you go" labeling — no more "needs more history than a trial gives you" exclusion. No Architecture/data-flow diagram on the page; the Capture section already covers "data never leaves the device" without needing one.

**Resolved (2026-08-06):** whether Bedrock/Residue/Core get advertised on the public landing page before they exist — yes, list all five as included/coming; that decision stood before the computation existed and stands now that it does. Separately, as of the same date, the computation itself is no longer "before they exist" — `engine/` implements and tests all five (see their Status lines above). What's still genuinely missing is `collector/`: no real Windows capture exists, so nothing here runs against a real user's actual keys/mouse/windows yet. Don't read "implemented" as "live for a real user" — those are different claims.

---

## 9. Surfaces and sequencing

Build in this order. Do not skip ahead.

1. **Landing page** (repo root) — tests assumption #3. Explains honestly what is captured, shows a real Rhythm Map screenshot from Vivaan's own data, download button, beta signup. The privacy disclosure goes above the fold; soft-pedalling it invalidates the test.
2. **Windows desktop** — packaged with PyInstaller into a single .exe. Unsigned for v0; the download page must warn about the SmartScreen prompt in advance, which converts better than letting users hit it cold.
3. **Chrome extension** — optional middle tier. One-click install, browser-only signal, local storage. Lower friction, but it only sees the browser.
4. **macOS** — blocked on the $99 developer account and the Accessibility/Input Monitoring permission flow. Gate on landing-page signup counts.

**A web app is not on this list.** A browser tab cannot observe OS window focus, application switching, or input outside itself, which means the Rhythm Map and Fragments — the two differentiators — are not buildable on the web. If asked for a web version of the product, explain this rather than building a degraded one.

**Beta terms (revised 2026-08-06, supersedes the 2026-08-04 version):** Activity and Trace are free, permanently — not a trial, not time-limited. Fragments, Bedrock, Residue, Core, and Rhythm Map are the paid set (§8). Rhythm Map ships ungated from day one regardless of trial status — it fills in as history accumulates rather than waiting behind a calibration period, so there's no more "needs more history than a week gives you" exclusion. Pricing mechanics for the paid five (trial length, one-time vs. subscription) are not yet decided here; don't assume the old 7-day/no-card trial terms still apply to the new set without checking the landing page and this section are actually in sync. Pricing is still assumption #5 and largely untested.

---

## 10. Current state

Phase: **validation, not product.** Nothing here is proven.

**"v1" (site copy, 2026-08-04):** means Fragments, Trace, Activity, and Switch Rate are engineering-ready — live from day one, no calibration wait. It does not mean assumptions 1–5 below are resolved; none of them flipped just because the label did. Don't let "v1" on the landing page get read as "validated" in here.

| # | Assumption | Fatal? | Test | Status |
|---|---|---|---|---|
| 1 | The signal exists in real work, not just labs | Yes | 14 days of Vivaan's data vs. nightly self-ratings | In progress |
| 2 | People want to be told they're drifting | Yes | Reddit post, count unprompted descriptions | Not started |
| 3 | People will install this at all | Yes | Landing page, count install clicks | Building |
| 4 | The nudge changes behavior | No | Blocked on 1–3 |
| 5 | Anyone pays | No | Much later |

**Keep scope small during this phase.** If asked for polish, onboarding flows, settings panels, or billing, say it's premature and name which assumption is still untested.

### Kill criteria
- Two weeks of data shows no separable pattern on self-rated bad days
- A Reddit post gets fewer than 10 unprompted descriptions of the problem
- 30 days post-launch, fewer than 5 strangers install it

If any trip, say so plainly. Do not let sunk cost carry a dead project.

---

## 11. Context on Vivaan

Incoming OSU freshman, CS + Math, sophomore standing. Three internships: AWS Bedrock/RAG, computer vision, and a self-built PyTorch LSTM. Strong ML foundation — go straight to advanced concepts without preamble.

**The aspiration:** optimizing for reputation over near-term revenue, on the view that a name compounds into more than a side project's cash. Baseline is meant to be a real thing he ships publicly and can point to. "Would this be worth showing someone" is a real quality bar.

**The competing priority you must protect:** internship applications for summer 2027, August–November 2026. That window is worth far more than this project. If Baseline starts eating it, say so directly. "Pause it" is a legitimate recommendation.

**Known failure mode:** he generates ideas faster than he validates them — roughly a dozen business directions before landing here, and several mid-project pivots since. If he proposes something new before current assumptions are tested, push back hard. The pattern is the problem, not any individual idea.

---

## 12. Conventions

- **Python:** type hints, stdlib-first, minimal dependencies.
- **TypeScript:** strict mode. No `any`.
- **Comments:** explain why, not what. Every tunable threshold (idle gap, switch tolerance, minimum block length, IKD bounds) gets a comment stating what it means and that it's tunable.
- **Commits:** imperative mood; reasoning in the body when a decision is non-obvious.
- **Tests:** engine feature extraction needs tests against synthetic data. UI does not, at this stage.

---

## 13. Decision log

Do not reopen without a written reason.

| Decision | Reason |
|---|---|
| Anomaly detection, not stress classification | Solves labeling, matches actual field accuracy, avoids medical-device territory |
| Local-first, timing-only capture | Trust is the product; a breach should expose nothing meaningful |
| Consumer, not employer | Different law, poisoned brand |
| AGPL on collector only | Verifiability without giving away the product |
| Rhythm Map as free hook | Novel, low creep, shareable, no health framing |
| Tauri over Electron | Smaller binary, better security posture |
| 14-day minimum baseline | Shorter baselines produce noise-driven false flags |
| Two-tier storage | Raw deletion at 30d would otherwise destroy all history |
| Baseline keyed by hour slot | Evening and morning rhythms are different distributions |
| Always collect, never prompt | Detecting resumption is the hard half; prompts break the passive premise |
| Statistical priors before any model | Simplest thing that could work; if z-score fails, pretraining won't help |
| Windows first, macOS gated | Notarization plus the permission flow is a brutal first run |
| No web app version | A browser tab cannot see OS-level focus or app switching |
| 7-day free trial for Fragments/Trace/Activity/Switch Rate; Rhythm Map moved to a paid one-time purchase instead of trial-gated | These four are single-day descriptive stats, not baseline comparisons — useful from day one, unlike Drift or Rhythm Map, which need real history to say anything |
| Marketing site moved from `site/` to the repo root (2026-08-05) | `main` was stale and had no `site/` folder at all, so Vercel's Root Directory setting couldn't be pointed at it reliably; root-level deploy needs no special config |
| Dropped the `src/` wrapper — `app/` and `lib/` sit directly at repo root (2026-08-05) | Same goal as the `site/` move: fewer nested directories between the repo root and the actual Next.js app |
| Brand kit v1.0 (Ink/Paper/Lime/Cobalt/Red, Space Grotesk + JetBrains Mono, hard borders/offset shadows) adopted, superseding the earlier teal/Geist palette | See §14 — full spec in `docs/BRAND_KIT.html` |
| Activity and Trace made free forever, not trial-gated; Switch Rate dropped in favor of Residue (2026-08-06) | Activity/Trace are commoditized by free competitors (ActivityWatch, RescueTime, Toggl, Clockify) — charging invites a losing comparison. Switch Rate was a raw count nobody could act on; Residue replaces it with an actual settle-time definition |
| Fragments, Bedrock, Residue, Core, Rhythm Map are the paid set; this **supersedes** the earlier "Rhythm Map as free hook" decision (2026-08-06) | Fragments is the only one of the five with no free consumer equivalent anywhere, which is now the actual pitch; Rhythm Map moved to paid on 2026-08-04 and stays there |
| Rhythm Map heat scale reverted to single-hue light-to-dark, replacing the multi-hue Cobalt→Lime ramp (2026-08-06) | The multi-hue version had no natural intensity ordering and didn't read as a heatmap, despite being an attempt to fix an earlier low-contrast single-hue version |
| Rhythm Map ships ungated from day one, "fills in as you go" instead of waiting behind a history requirement (2026-08-06) | Reverses the 2026-08-04 "not part of the trial, needs more history than a week" exclusion — thin-early-data is a data problem, not a shipping problem, and nobody buys a feature they've never seen run |
| `engine/` built from scratch (2026-08-06) — `focus_blocks()`, all five paid features, and Rhythm Map's real aggregation, with a 46-case pytest suite | The site had marketed all five features as "Included" with zero real implementation anywhere in the repo; `dashboard.py`/`focus_blocks()` referenced in the spec never existed. `collector/` (real Windows capture) deliberately not built in the same pass — engine correctness is provable against synthetic fixtures without it |
| `blocks()` builds a strict, non-overlapping partition of ALL categories (not per-category independent merges) | A per-category independent merge would double-represent sub-tolerance excursions — once absorbed into the enclosing block, once as their own tiny block — breaking Trace and making total active time ambiguous |
| Residue = elapsed time from first return to final settle, confirmed directly, not a flat 3:00 | A flat model couldn't produce the spec's own "14 minutes of residue" example; bouncing (return, distracted again, return again) before finally settling is what makes that number real |
| Cross-focus-app switches (e.g. Code.exe → WindowsTerminal.exe) continue the same block | A block's identity is category, not app — the alternative would fragment ordinary editor/terminal workflows and understate Fragments/Core |
| `blocks` table added to §5's Tier 2 schema (2026-08-06) | Bedrock's 14-day sparkline and Core's 30-day trend both need block-level data to outlive the 30-day raw-event TTL (rule 6) |

---

## 14. Brand system

Full spec: [`docs/BRAND_KIT.html`](docs/BRAND_KIT.html) — a self-extracting bundle, open it in a browser rather than grepping it; the readable content only exists after its own JS unpacks it. Applies to every surface with a UI: the marketing site today, `desktop/` once it exists.

### Palette
| Role | Name | Hex | Usage |
|---|---|---|---|
| Base | Ink | `#111111` | Text, borders, primary dark surfaces |
| Base | Paper | `#EDE9DC` | Page background |
| Base | White | `#FFFFFF` | Card / surface background |
| Signal | Lime | `#D6FB3D` | Action & focus only — primary CTA, wordmark bar, "focused" badges |
| Signal | Cobalt | `#2D4EFF` | Data & links — informational accents, emphasis text |
| Signal | Red | `#FF4A2B` | Destructive only — never for a neutral "absence" state |

### Type
- **Space Grotesk** — display, headings, UI, body copy.
- **JetBrains Mono** — labels, data readouts, badges, form inputs.
- Scale: Display `60/700`, H1 `38/700`, H2 `24/600`, Body `16/400`, Label `12/700` mono uppercase wide-tracked, Data `12/400` mono.

### Shape and depth
- Zero border-radius, everywhere. No gradients, no blurred shadows, no italics.
- Structural border: `3px` solid Ink.
- Shadows are hard offsets only, never blurred: `5px 5px 0 Ink` on buttons/inputs/badges, `8px 8px 0 Ink` on cards.
- Press interaction: the element translates into its own shadow and the shadow disappears — `80ms` linear, no easing curve.
- Icons: 3px stroke, square caps, geometric only.

### Rules worth remembering
- **Lime is reserved for action/focus** — primary buttons, the wordmark bar, "live/focused" badges. Never used as small body or accent text; use Cobalt there instead (better contrast on Paper/White, and it matches Cobalt's "data & links" role).
- **Red is destructive-only.** Places that mark an *intentional* absence — "never captured," "no server," privacy guarantees — stay muted/neutral, not red. An absence there is a feature, not an error; coloring it red would misrepresent it as a warning.
- Wordmark: the word sits on a lime bar (the "baseline"). Never remove the bar, never round it, never italicize the word.

Implemented in `app/globals.css` (`--ink`, `--paper`, `--lime`, `--cobalt`, `--red`, `--negative`, `--shadow-sm`, `--shadow-lg`, the `.press` and `.pulse` utilities) — treat that file as the source of truth for exact token values, this section as the rationale for how to use them.