# Baseline — Working Spec

**Status:** unvalidated concept
**Last updated:** 2026-08-02
**Owner:** Vivaan

> Living document. Edit freely. Anything marked `[UNVALIDATED]` is a guess, not a fact.
> Anything marked `[DECIDED]` should not be reopened without a written reason in the Decision Log.

---

## 1. One-liner

A local-first desktop tool that learns how you normally work, then tells you when you've drifted from it.

It does **not** claim to detect stress. It detects deviation from your own baseline.

---

## 2. Why this framing

The research on typing-based stress detection is real but weak in the field:

| Finding                                                          | Source                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Keystroke-only stress detection: 63–76% multi-level, ~94% binary | IEEE/ACM survey figures                   |
| Keyboard + mouse fused: ~66% accuracy, F1 0.56                   | Stress Detection in Computer Users (2020) |
| Fatigue detection between consecutive sessions: ~91%             | Mental Fatigue Keystroke Dynamics study   |
| Personalized models >> one-fits-all                              | medRxiv field study, 2025                 |
| Most studies are lab-based, not real-world                       | recurring caveat across the literature    |

**Conclusion:** don't build a classifier. Build an anomaly detector.

Three reasons:

1. **No labeling problem.** Unsupervised. You never need ground-truth "stressed / not stressed."
2. **Honest.** The science doesn't support confident stress claims. Deviation claims it can support.
3. **Regulatory safety.** Health/fatigue claims move you toward FDA general-wellness boundaries. "Your rhythm changed" does not.

`[DECIDED]` Never use the words stress, burnout, fatigue, or any clinical term in the product UI.

---

## 3. The signal

**Primary:** rolling variance of inter-key intervals — not typing speed.

Speed tends to stay flat while rhythm falls apart. The variance is the tell.

**Candidate inputs, ranked by value-to-creepiness ratio:**

| #   | Signal                                                | May indicate                | Capture difficulty | Creep risk |
| --- | ----------------------------------------------------- | --------------------------- | ------------------ | ---------- |
| 1   | Window/app focus block length + switch rate           | Fragmentation, shallow work | Easy               | Low        |
| 2   | Circadian activity distribution                       | Personal peak hours         | Very easy          | Low        |
| 3   | Idle / micro-pause rhythm                             | Break cadence vs. stalling  | Easy               | Low        |
| 4   | Mouse kinematics (path efficiency, direction changes) | Cognitive load              | Easy               | Medium     |
| 5   | Error/correction rate (backspace, undo frequency)     | Difficulty, degraded output | Easy               | Medium     |
| 6   | Keystroke timing variance                             | Rhythm deviation            | Easy–moderate      | **High**   |
| 7   | Tab/window proliferation                              | Cognitive scatter           | Moderate           | Low        |
| 8   | IDE/CLI activity rhythm                               | Flow vs. thrash             | Moderate           | Low        |

`[UNVALIDATED]` Whether #6 adds enough over #1–3 to justify its creep cost. Test before committing.

---

## 4. Architecture

`[DECIDED]` Local-first. Non-negotiable.

```
┌─ USER'S MACHINE ─────────────────────────┐
│                                          │
│  Collector          → timing only        │
│  (open source)        never characters   │
│       ↓                                  │
│  Rolling buffer     → 30 days, then      │
│                       auto-deleted       │
│       ↓                                  │
│  On-device model    → trained on this    │
│                       user only          │
│       ↓                                  │
│  Nudge              "rhythm is off"      │
│                                          │
└──────────────────────────────────────────┘
              ╎ (optional, opt-in)
              ╎ derived daily score only
              ↓
        Cloud sync — no raw data crosses this line
```

**Rules:**

- Never capture content. Timing between keys, not which keys.
- 30-day retention on raw signal, then delete. Old data is liability, not asset.
- Collector is open source (AGPL). Model and UI stay closed.
- No account required for local-only use.
- User can view, export, and delete everything in one click.

**Cost of this approach:** less training data, slower model improvement. Worth paying here.

---

## 5. Positioning

**Closest competitor:** ActivityWatch — free, open-source, local-first, cross-platform.

|                | ActivityWatch                      | Baseline                       |
| -------------- | ---------------------------------- | ------------------------------ |
| Local-first    | Yes                                | Yes                            |
| Open source    | Fully                              | Collector only                 |
| Categorization | Manual, slow (top complaint)       | Automatic                      |
| Insight layer  | None by design — it's a raw logger | **This is the entire product** |

`[DECIDED]` The wedge is the interpretive layer ActivityWatch deliberately omits.

**Anti-pattern to avoid:** RescueTime gates a user's own history behind payment (~3 months free). This drove users to ActivityWatch. Never gate someone's own data.

---

## 6. Tiering

### Free — table stakes

Must ship or the product feels stripped. All of this is already free somewhere.

- [ ] Automatic app/window + website tracking
- [ ] Auto-learning categorization (fix ActivityWatch's #1 pain)
- [ ] Daily/weekly dashboard: active time, focus time, top distractions
- [ ] Basic fragmentation view (count + length of uninterrupted blocks)
- [ ] Full un-gated access to own history

### Free hook — the one proprietary giveaway

- [ ] **Personal Rhythm Map** — learns over 1–2 weeks when _you_ do your most sustained, least-fragmented work. Surfaces: "your deep window is 9:30–11:30, you're scheduling hard tasks in your afternoon trough."

Why this one: novel, low creep, high perceived value, framed as scheduling not health, and it's the shareable moment. Derive from window-focus + input intensity so it works before any keystroke features are enabled.

### Pro — the anomaly engine

- [ ] Baseline deviation flags (the core model)
- [ ] Focus quality / deep-vs-shallow score
- [ ] Context-switch cost + fragmentation analytics
- [ ] AI-work metrics (human vs. AI effort mix) — dev niche, future-proofing
- [ ] Long-range trends, export, multi-device sync

`[UNVALIDATED]` Conversion. Plan for 2–5%, not the 8% median. If under 2% at 90 days, move focus-quality down to free and find a new Pro anchor.

---

## 7. Legal constraints

| Regime                                              | Constraint                                                                                                        | Mitigation                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **BIPA (Illinois)**                                 | $1k–5k per violation, private right of action. Newer state bills explicitly name keystroke dynamics as biometric. | Largest risk vector. Explicit granular consent before any keystroke feature. |
| **GDPR**                                            | Keystroke timing tied to a person is personal data. Becomes Art. 9 special category if used to _identify_.        | Process locally. Never use dynamics for authentication.                      |
| **FDA general wellness**                            | Stays unregulated only with no disease claims.                                                                    | No stress/fatigue/clinical claims, ever. Already decided.                    |
| **State monitoring laws** (NY, CT, + 2025–26 bills) | Target employers, but shape consumer expectations.                                                                | Local-first is the durable differentiator.                                   |

`[DECIDED]` Consumer, not employer. The moment a company buys this to watch staff, it's surveillance software with different law and a poisoned brand. Write this into the landing page.

---

## 8. Riskiest assumptions

Test in order. Stop at the first failure.

| #   | Assumption                                    | Fatal? | Cheapest test                              | Status      |
| --- | --------------------------------------------- | ------ | ------------------------------------------ | ----------- |
| 1   | The signal exists in real work, not just labs | Yes    | Log own keys, 2 weeks                      | Not started |
| 2   | People want to be told they're drifting       | Yes    | Reddit post, count unprompted descriptions | Not started |
| 3   | People will install a keylogger at all        | Yes    | Landing page, count install clicks         | Not started |
| 4   | The nudge changes behavior                    | No     | Later — irrelevant if 1–3 fail             | Blocked     |
| 5   | Anyone pays                                   | No     | Much later                                 | Blocked     |

Rows 1 and 2 cost a weekend combined. Neither requires a product.

---

## 9. Kill criteria

Written in advance, while objectivity is still possible.

- **KILL IF** two weeks of own data shows no separable pattern on days known to be bad
- **KILL IF** a Reddit post about the problem gets fewer than 10 unprompted descriptions
- **KILL IF** 30 days after a scrappy build, fewer than 5 strangers install it
- **PAUSE IF** it competes with internship applications, Aug–Nov

---

## 10. Pre-mortem

It's March. The project is dead. Why?

- Signal was there in lab conditions and vanished in real work
- Nudges felt patronizing, users disabled them in week one
- "Keylogger" ended the conversation before anyone read the privacy page
- Internship applications ate September and it never restarted
- Built for four months, never showed a stranger

The last two are likeliest, and neither is technical.

---

## 11. Next actions

- [ ] Write keystroke timing logger. Timings only. Run on self.
- [ ] Nightly one-line note on how the day felt → label set
- [ ] Day 14: plot rolling variance against notes, look for separation
- [ ] In parallel: post the _problem_ (not the solution) to r/productivity + one ADHD/knowledge-work sub
- [ ] September: email OSU psych + HCI faculty. Ask about the signal, not the market — they can't tell you the market.

---

## 12. Open questions

- Does variance separate on your own data, or is the effect swamped by task type?
- Is two weeks enough baseline, or does it need a month?
- How do you handle multiple machines? Baseline per device or merged?
- What's the nudge delivery mechanism that doesn't feel like nagging?
- Is the dev niche the better beachhead than general knowledge workers?

---

## Decision Log

| Date       | Decision                                     | Reason                                                     |
| ---------- | -------------------------------------------- | ---------------------------------------------------------- |
| 2026-08-02 | Anomaly detection, not stress classification | Labeling problem + weak field accuracy + regulatory safety |
| 2026-08-02 | Local-first, timing-only capture             | Trust is the product; breach exposes nothing meaningful    |
| 2026-08-02 | Consumer, not employer                       | Employer version poisons the brand and changes the law     |
| 2026-08-02 | AGPL on collector only                       | Verifiability without giving away the product              |
| 2026-08-02 | Rhythm Map as free hook                      | Novel, low creep, shareable, no health claims              |
