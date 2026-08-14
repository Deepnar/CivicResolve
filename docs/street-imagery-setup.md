# Street Imagery — How to Set Up the Providers (5 minutes each)

The AI verification feature compares a citizen's photo with a **real street-level
photo of the reported location**. It needs a street-imagery provider. Three are
supported, tried in order:

```
Ola Street View  →  Mapillary  →  Kartaview
```

- **Kartaview** — works out of the box, nothing to set up (public API, no key).
- **Mapillary** — free, email-only, no card. Recommended upgrade.
- **Ola** — best coverage in India, but requires a card on file.

The system skips whatever key is missing and uses the next provider. Add one,
both, or none — everything keeps working either way.

---

## Option 1: Mapillary (free, ~5 minutes, no card)

1. Go to https://www.mapillary.com and sign up (email is enough).
2. Open the developer dashboard: https://www.mapillary.com/dashboard/developers
3. Click **Create an application** (give it any name, e.g. "CivicResolve").
4. You now see a **Client ID** and a **Client Secret**. Keep this page open.
5. Exchange them for a client token — run this once (replace the two values):

   ```bash
   curl -X POST https://graph.mapillary.com/token \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET \
     -d grant_type=client_credentials
   ```

   The response contains an `access_token` — that long string is your token.
6. Put it in the app's `.env` file:

   ```
   MAPILLARY_CLIENT_TOKEN=your_access_token_here
   ```

7. Restart the app (or just let the worker's next run pick it up). Done.

No billing, no card, no usage limits that matter for this project.

---

## Option 2: Ola Maps (best India coverage, requires a card, ~10 minutes)

Ola Maps APIs are free for the first year (500K requests/month), but Ola's
console now requires a card on file (Razorpay autopay) before it issues any
API key. Decide if that's OK for you — the steps:

1. Go to https://cloud.olakrutrim.com and sign up / sign in
   (email + phone OTP).
2. In the left sidebar, expand **Ola Maps** and open **Credentials**.
3. Click **+ New Credentials**.
4. A **Setup Autopay** modal appears — this is the required card step:
   - Cardholder name, mobile number, and card via Razorpay.
   - A ₹1 authorization charge is made to verify the card (it normally never
     settles).
   - The modal states you can cancel autopay afterwards from the same page.
5. Back on the Credentials page, create the credential (type: **API Key**)
   and copy the generated key.
6. Put it in the app's `.env`:

   ```
   OLA_MAPS_API_KEY=your_key_here
   ```

7. Restart the app. Ola becomes the primary street-imagery provider.

If you'd rather not add a card, skip this and use Mapillary (Option 1) —
it covers most of the same value.

---

## How to check it's working

After setting a key, report (or seed) an issue with a photo and coordinates in
a city, then either:

- run the worker once: `node --env-file=.env scripts/verify-worker.mjs`
- or open the issue's page and click **AI Verify**

The evidence card shows the street photo used, its source (ola / mapillary /
kartaview), the capture date, and a stale-age warning. `verification_source`
in the database tells you which provider answered.
