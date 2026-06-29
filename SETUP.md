# Howlwheel setup — do this once

ADHD-friendly. Do the steps **top to bottom**. Don't skip. Each `[ ]` is one click/paste.
Total time: ~15 min. Coffee optional. ☕

There are **4 parts**. Finish a part fully before the next.

```
PART 1  Cloudflare API token      ~3 min
PART 2  Cloudflare Access (login)  ~5 min
PART 3  GitHub secrets (paste 5)   ~4 min
PART 4  Go live                    ~3 min
```

Keep a scratch note open. You'll copy **3 values** along the way:

```
ACCOUNT ID  = ____________________
API TOKEN   = ____________________
ACCESS AUD  = ____________________
```

---

## PART 1 — Cloudflare API token

- [ ] Go to **https://dash.cloudflare.com/profile/api-tokens**
- [ ] Click **Create Token**
- [ ] Find **"Edit Cloudflare Workers"** → click **Use template**
- [ ] Scroll to **Permissions**. Click **+ Add more**. Add one row:
  - **Account** · **D1** · **Edit**
- [ ] Click **Continue to summary** → **Create Token**
- [ ] **COPY the token now.** Paste into your scratch note as `API TOKEN`.
  ⚠️ You can't see it again. If you lose it, just make a new one.

Get your Account ID:
- [ ] Go to **https://dash.cloudflare.com** → click **Workers & Pages** (left menu)
- [ ] On the right, copy **Account ID** → scratch note as `ACCOUNT ID`

✅ Part 1 done when: scratch note has `API TOKEN` and `ACCOUNT ID`.

---

## PART 2 — Cloudflare Access (so only YOU can open the control panel)

- [ ] Go to **https://one.dash.cloudflare.com** (Zero Trust)
- [ ] Left menu → **Access** → **Applications** → **Add an application**
- [ ] Pick **Self-hosted**

Fill the form:
- [ ] **Application name:** `Howlwheel Control`
- [ ] Under **Application domains**, add **TWO** rows (same domain, different path):

  Row 1:
  - Subdomain: `howlwheel` · Domain: `mrdemonwolf.workers.dev` · Path: `control`

  Row 2 (click **+ Add domain**):
  - Subdomain: `howlwheel` · Domain: `mrdemonwolf.workers.dev` · Path: `api/trpc`

- [ ] Click **Next**

Add the rule (who's allowed in):
- [ ] Policy name: `Me`
- [ ] Action: **Allow**
- [ ] Add include → **Emails** → type **your email**
- [ ] **Next** → **Add application**

Get the AUD:
- [ ] Open the app you just made → **Overview** tab
- [ ] Copy **Application Audience (AUD) Tag** → scratch note as `ACCESS AUD`

> 🚫 **Do NOT** add `/overlay` or `howlwheel-api` to Access. Those stay public on purpose
> (OBS gets in with the secret link instead).

✅ Part 2 done when: scratch note has `ACCESS AUD`.

---

## PART 3 — GitHub secrets (paste your 3 values + 2 fixed ones)

- [ ] Go to **https://github.com/MrDemonWolf/howlwheel/settings/secrets/actions**
- [ ] Click **New repository secret** for **each** row below. Name on the left, value on the right.

| Click "New secret", name it… | …paste this value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | your `API TOKEN` |
| `CLOUDFLARE_ACCOUNT_ID` | your `ACCOUNT ID` |
| `CF_ACCESS_AUD` | your `ACCESS AUD` |
| `CF_ACCESS_TEAM_DOMAIN` | `mrdemonwolf.cloudflareaccess.com` |
| `ALCHEMY_PASSWORD` | make up a long password, paste it (save a copy somewhere) |

- [ ] Double-check: the secrets page lists **5 secrets**.

✅ Part 3 done when: 5 secrets show on the page.

> Why before merging? If these are missing, the control panel locks **everyone** out
> (that's the safe default). Set them first.

---

## PART 4 — Go live

- [ ] Open the PR: **https://github.com/MrDemonWolf/howlwheel/pull/1**
- [ ] Click **Merge pull request** → **Confirm merge**
- [ ] Click the **Actions** tab. Watch **CI** turn green ✓, then **Deploy** turn green ✓
  (first run ~3–5 min — go refill the coffee)

When both are green:
- [ ] Open **https://howlwheel.mrdemonwolf.workers.dev/control**
  (Cloudflare asks you to log in — that's Access working ✓)
- [ ] Click the **Overlays** tab → **Copy** the URL
- [ ] In OBS: **+ → Browser** → paste URL → Width `1920`, Height `1080` → OK

🎉 Done. Spin the wheel from the control panel; it animates on the OBS source.

---

## If something's red

- **Deploy failed?** Open the failed run in **Actions**, read the last red line.
  Usually a typo in a secret → fix that secret, then **Actions → Deploy → Re-run jobs**.
- **Control panel won't load / "denied"?** `CF_ACCESS_AUD` or `CF_ACCESS_TEAM_DOMAIN`
  is wrong, or your email isn't in the Access policy. Recheck Part 2 + Part 3.
- **Overlay is blank?** You copied an old link. Control → Overlays → **Copy** again.
  (Hitting **Reset** there makes a new link and kills old ones.)
- **Wheel shows nothing?** Add slots in the **Wheel** tab first.
