# Email capture

Beta signups land in a Google Sheet via an Apps Script web app. No third-party
service, no signup, nothing to pay for.

Scope note (AGENTS.md §4): this is the marketing site only. It has zero
connection to user event data — the only thing that ever reaches the sheet is a
name and address someone typed into a form on the landing page.

---

## 1. Where the code lives

| File | Does |
|---|---|
| `lib/signups.ts` | The only file that knows the store exists. POSTs to Apps Script, parses the reply. Swapping providers means rewriting this file and nothing else. |
| `app/actions.ts` | `submitSignup` server action — honeypot, name and email validation, `source` normalisation. |
| `app/_components/signup-form.tsx` | The form. Takes a `location` prop, which becomes the sheet's `source` column. |
| `app/(marketing)/page.tsx` | Renders it twice: `location="hero"` and `location="footer"`. |

---

## 1a. Sheet columns

Row 1 of `Sheet1`, exactly these, in this order:

| A | B | C | D | E |
|---|---|---|---|---|
| `timestamp` | `first_name` | `last_name` | `email` | `source` |

`timestamp` is stamped by the Apps Script with `new Date()` at append time, so
it records when the row landed and can't be backdated by whatever POSTs to the
endpoint. Nothing about the time is sent from the site.

Deduplication reads column **D**. If you reorder these columns, change
`EMAIL_COLUMN` in the script to match or duplicate detection silently starts
comparing the wrong column.

### The script

```javascript
const EMAIL_COLUMN = 4;  // column D. Change with the header order above.

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);  // concurrent submits would otherwise overwrite rows
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    const body = JSON.parse(e.postData.contents);

    const firstName = String(body.firstName || '').trim().slice(0, 80);
    const lastName = String(body.lastName || '').trim().slice(0, 80);
    const email = String(body.email || '').trim().toLowerCase();
    const source = String(body.source || 'unknown').slice(0, 40);

    if (!firstName || !lastName) {
      return json({ ok: false, error: 'missing name' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'invalid email' });
    }

    // duplicate check — an inflated count is worse than no count
    const existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, EMAIL_COLUMN, sheet.getLastRow() - 1, 1).getValues().flat()
      : [];
    if (existing.includes(email)) {
      return json({ ok: true, duplicate: true });
    }

    sheet.appendRow([new Date(), firstName, lastName, email, source]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Paste it over the old script, then **redeploy** (§5). Editing alone changes
nothing on the live URL.

---

## 2. Environment

Set in `.env.local` for dev and in Vercel's environment variables for the
deployed site. `.env.example` lists them; `.env.local` is gitignored.

```
SIGNUP_ENDPOINT=https://script.google.com/macros/s/.../exec
```

**No `NEXT_PUBLIC_` prefix, deliberately.** The POST is made server-side from
the server action, so the endpoint stays out of the client bundle.

If `SIGNUP_ENDPOINT` is unset the form says signup isn't wired up rather than
showing a confirmation over a dropped address.

---

## 3. Optional: shared secret

The web app has to be deployed with "Who has access: Anyone" — visitors aren't
signed into a Google account — which means anyone who finds the URL can POST to
it. Fine at this scale. If it stops being fine:

Set `SIGNUP_SHARED_SECRET` to any random string in `.env.local` and Vercel, then
add the check to the Apps Script, immediately after `JSON.parse`:

```javascript
if (body.secret !== 'the-same-random-string') {
  return json({ ok: false, error: 'unauthorized' });
}
```

Then **redeploy** (§5). Setting the env var without the script change does
nothing; making the script change without the env var breaks signup entirely.

---

## 4. Why server-side, not the browser

The obvious version is a client-side `fetch` with `Content-Type: text/plain` to
dodge the CORS preflight Apps Script can't answer. This code doesn't do that.
Going through the server action instead buys three things:

1. **No CORS at all**, so the `text/plain` workaround isn't needed.
2. **The endpoint isn't in the page source**, so it isn't trivially harvested.
3. **The response body is actually read.** This is the one that matters. Apps
   Script reports its own failures with HTTP 200 and `{ok: false}` in the body —
   bad sheet name, script exception, unauthorised deployment. A client-side
   `await fetch(...)` that ignores the body cannot tell a saved address from a
   dropped one and shows "You're on the list" either way. That is the single
   failure mode this page cannot afford, because the signup count is what
   assumption #3 (AGENTS.md §10) is measured on.

`lib/signups.ts` maps the reply to a result:

| Script reply | Result | Shown |
|---|---|---|
| `{ok: true}` | new row | "You're on the list." |
| `{ok: true, duplicate: true}` | no row written | "You're already on the list." |
| `{ok: false, error: 'invalid email' \| 'missing name'}` | `rejected` | "Check your name and email and try again." |
| anything else, non-2xx, unparseable, timeout | `upstream` | "Couldn't save that. Try again in a moment." |

Unparseable is a real case, not a defensive nicety: a deployment whose access
isn't set to "Anyone" answers with an HTML sign-in page and HTTP 200.

The fetch times out at 10s (`TIMEOUT_MS`). Apps Script cold-starts and its
`doPost` holds a script lock for up to 20s under concurrent submits, so slow is
normal; the cap sits below the hosting function timeout so a stall surfaces as a
retryable message rather than a platform 504.

---

## 5. Redeploying the script

**Every edit to the Apps Script needs a redeploy.** Deploy → Manage deployments
→ edit → New version. Editing alone changes nothing on the live URL. This is the
single most common thing to get stuck on.

---

## 6. Testing

Submit a real name and address, check the sheet, then submit the same address
again — it should say "You're already on the list" and add no row. Submit from
both the hero and the footer form and confirm the `source` column differs.

If nothing appears:

- Did you redeploy after editing the script?
- Is "Who has access" set to **Anyone**?
- Is the sheet tab actually named `Sheet1`?
- Is `SIGNUP_ENDPOINT` set in the environment you're actually running? Next does
  not hot-reload env changes, so a dev server started before `.env.local`
  existed keeps reporting "Signup isn't wired up yet" until it is restarted.

If names land empty but rows still appear, the sheet has the new header row but
the script is still the old version — the old `appendRow` writes three columns
and ignores the names. Redeploy.

Errors are visible in the server logs, not the browser console — the request is
made server-side.

---

## 7. What this measures

Signups measure curiosity, not install intent. Typing an address costs nothing;
running an unsigned .exe that watches your keyboard does not. Expect the real
install rate to be a fraction of this number.

Set the threshold before driving any traffic. AGENTS.md §10 already names the
kill criterion for assumption #3 — fewer than 5 installs from strangers 30 days
post-launch. There is no equivalent number for signups yet. Pick one now, while
it's still possible to be objective about it.
