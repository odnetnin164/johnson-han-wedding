# Janice & Justin Wedding Invitation

A simple, single-page wedding invitation site. RSVPs are submitted directly to a Google Form so responses land in the couple's Google Sheet.

The page layout:

1. **Invite card** — the Paperless Post design, displayed as an image at the top.
2. **Event details** — text-based summary (title, description, hosted by, date, address) so it's screen-reader accessible.
3. **RSVP buttons** — *Will attend* / *Will not attend*.
4. **RSVP form** — name(s), phone, email, private message. Clicking either button reveals it.
5. **Thank-you state** — confirmation message after the form submits.

---

## Run locally

The page is a static site. Any HTTP server works. From the repo root:

```bash
# Python (built-in)
python3 -m http.server 8080

# or Node.js
npx serve .
```

Then visit <http://localhost:8080>.

> **Why an HTTP server?** The page uses ES modules (`<script type="module">), which most browsers block on `file://` URLs. A local server avoids that.

You can also just open `index.html` directly in a browser if you temporarily switch the script tag to non-module, but the server approach is cleaner.

---

## Customize content

All editable content (couple names, event details, RSVP deadline, invite-card image path) lives in **`config.js`**. Open it and edit the values there. No HTML changes needed for typical updates.

```js
export const CONFIG = {
  formActionUrl: "...",   // Google Form endpoint
  fields: { ... },        // Google Form field IDs
  rsvpDeadline: "...",    // ISO datetime
  couple: { name1, name2 },
  event: { title, subtitle, description, date, venue, address, addressUrl },
  inviteCardSrc: "...",
  inviteCardAlt: "...",
};
```

The HTML uses `data-config-key` attributes that map directly to CONFIG paths, so anything you change in CONFIG flows through to the page automatically.

---

## Swap the Google Form

If you ever want to point this site at a different Google Form:

1. Open the form in your browser.
2. View the page source of its `viewform` URL.
3. Find `FB_PUBLIC_LOAD_DATA` in the source — the structure is:
   ```
   [1387193420,"Are you attending?",null,2,[[643666890, ...options... ]]]
   ```
   The number at the **start of the inner array** (`643666890` above) is the `entry.<id>` for that field.
4. Find the `formResponse` URL — search for `docs.google.com/forms/d/e/<id>/formResponse` in the source.
5. Update `formActionUrl` and `fields.*` in `config.js`.

---

## Replace the invite card image

The default invite card image is at `images/invite.png.jpeg` (the Paperless Post design the couple chose). To use a different image:

1. Add your image to the repo (recommended path: `assets/invite-card.jpeg`).
2. Update `inviteCardSrc` and `inviteCardAlt` in `config.js`.

---

## Deploy to GitHub Pages

This repo is already set up to be served from the repo root on GitHub Pages.

1. Push your changes to the `main` branch.
2. In the GitHub repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick `main`, and `/ (root)`.
4. Save. After a minute or two, GitHub will publish the site at:
   ```
   https://<your-github-username>.github.io/johnson-han-wedding/
   ```

### After you deploy

- The `no-cors` POST to Google Forms must work cross-origin. It works in practice on GitHub Pages but is worth double-checking once the site is live (open DevTools → Network on submit and confirm the request is `204 No Content`).
- The form's `referrer` is your GitHub Pages URL; if you'd rather not leak that, the Google Form's responses sheet will show it. There's no client-side way to strip it for `no-cors` POSTs.

---

## File overview

| File | Purpose |
| --- | --- |
| `index.html` | Markup + Bootstrap 5 + Google Fonts (both via CDN) |
| `styles.css` | Minimal overrides on top of Bootstrap |
| `script.js` | Form behaviour, validation, submit |
| `config.js` | All editable content + Google Form endpoint/field IDs |
| `images/invite.png.jpeg` | The invite card image |
| `README.md` | This file |

---

## Tech notes

- **Bootstrap 5** is loaded via the jsDelivr CDN — no build step required.
- **ES modules** are used (`<script type="module">`), so the site must be served over HTTP (not opened from `file://`).
- **Form submission** uses the standard Google Forms `formResponse` endpoint with `mode: 'no-cors'`. This means we can't read the response, but Google will record the submission. The user sees a thank-you state regardless.
- **RSVP deadline** is checked client-side against the browser's clock. If you'd rather enforce the deadline server-side, that would require a different submission approach (Apps Script web app).
