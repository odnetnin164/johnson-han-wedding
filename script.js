/* =================================================================
   Janice & Justin Wedding Invitation — script
   Vanilla JS, ES modules. Loaded as <script type="module"> in
   index.html. No build step.
   ================================================================= */

import { CONFIG } from "./config.js";

// ---------- helpers ----------

/** Get a nested value from CONFIG using a dot-separated path. */
function getConfig(path) {
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      CONFIG
    );
}

/** Format an ISO datetime for human display, e.g. "September 4, 2026, 11:59 PM". */
function formatDeadline(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Pull the first name out of a comma-joined attendee string. */
function firstAttendeeName(combined) {
  if (!combined) return "friend";
  const first = combined.split(",")[0].trim().split(/\s+/)[0];
  return first || "friend";
}

// ---------- Calendar helpers ----------

/** Build a Google Calendar event-creation URL. */
function googleCalendarUrl() {
  const { summary, description, location, dtstart, dtend } = CONFIG.calendar;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${dtstart}/${dtend}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build a minimal RFC 5545 .ics file body for the event. */
function buildIcs() {
  const { uid, dtstart, dtend, summary, description, location } = CONFIG.calendar;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "");
  const fmt = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
  const esc = (s) =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Johnson-Han Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(dtstart)}`,
    `DTEND:${fmt(dtend)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Build an Apple Calendar data: URL that delivers the .ics contents. */
function appleCalendarUrl() {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs())}`;
}

/** Build an Outlook (live.com) deeplink event-creation URL. */
function outlookCalendarUrl() {
  const { summary, description, location, dtstart, dtend } = CONFIG.calendar;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: summary,
    startdt: dtstart,
    enddt: dtend,
    body: description,
    location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Trigger a browser download of the .ics file (used by "Other Calendar"). */
function downloadIcs() {
  const blob = new Blob([buildIcs()], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "janice-and-justin-wedding.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- DOM population from CONFIG ----------

function populateFromConfig() {
  // Plain text/hostedBy replacements.
  document.querySelectorAll("[data-config-key]").forEach((el) => {
    const key = el.getAttribute("data-config-key");

    // Special-case: rsvpDeadlineDisplay formats the ISO datetime.
    if (key === "rsvpDeadlineDisplay") {
      el.textContent = formatDeadline(CONFIG.rsvpDeadline);
      return;
    }

    // Special-case: hostedBy is "{name1} & {name2}".
    if (key === "hostedBy") {
      el.textContent = `${CONFIG.couple.name1} & ${CONFIG.couple.name2}`;
      return;
    }

    const value = getConfig(key);
    if (value === undefined) return;

    // For <a> tags, only set the href — the visible text is supplied by
    // child elements (each with its own data-config-key). This lets the
    // address <a> show "Woman's Club of Bethesda / 5500 Sonoma Rd / ..."
    // while the href is the Google Maps URL.
    if (el.tagName === "A") {
      el.setAttribute("href", value);
    } else {
      el.textContent = value;
    }
  });

  // Invite card image.
  const img = document.getElementById("invite-card-img");
  if (img) {
    img.setAttribute("src", CONFIG.inviteCardSrc);
    img.setAttribute("alt", CONFIG.inviteCardAlt);
  }
}

// ---------- Deadline ----------

function applyDeadline() {
  const deadline = new Date(CONFIG.rsvpDeadline).getTime();
  const past = !Number.isNaN(deadline) && Date.now() > deadline;

  if (past) {
    document.getElementById("rsvp-buttons")?.classList.add("d-none");
    document.getElementById("rsvp-closed")?.classList.remove("d-none");
  } else {
    document.getElementById("rsvp-closed")?.classList.add("d-none");
  }
}

// ---------- Attendee rows ----------

/** Build a single attendee row: a two-line fields column (name on
 *  top, phone + email indented below) with a minus-icon remove
 *  button to the right, vertically centered between the two lines.
 *  @param {boolean} isFirst  When true, the phone/email inputs get
 *    the `required` attribute — only the first row's contact info is
 *    mandatory, because additional attendees' phone/email default to
 *    the first attendee's values at submit time (see wireSubmit).
 */
function buildAttendeeRow(isFirst = false) {
  const row = document.createElement("div");
  row.className = "attendee-row";

  // Helper: wrap a labelled input in an .attendee-field cell.
  const makeField = (inputName, inputType, placeholder, autocomplete, required, ariaLabel) => {
    const wrap = document.createElement("div");
    wrap.className = `attendee-field attendee-field-${inputName.split("-")[1]}`;
    const input = document.createElement("input");
    input.type = inputType;
    input.className = "form-control";
    input.name = inputName;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.setAttribute("aria-label", ariaLabel);
    if (required) input.required = true;
    wrap.appendChild(input);
    return wrap;
  };

  // Wrapper for the two field sub-rows so the remove button can sit
  // to the right of both and be vertically centered between them.
  const fieldsCol = document.createElement("div");
  fieldsCol.className = "attendee-fields";

  // First line: name (full width).
  const nameRow = document.createElement("div");
  nameRow.className = "attendee-name-row";
  nameRow.appendChild(
    makeField("attendee-name", "text", "Full name", "name", true, "Attendee full name")
  );
  fieldsCol.appendChild(nameRow);

  // Second line: phone + email, indented under the name.
  const contactRow = document.createElement("div");
  contactRow.className = "attendee-contact-row";
  contactRow.appendChild(
    makeField("attendee-phone", "tel", "Phone", "tel", isFirst, "Attendee phone number")
  );
  contactRow.appendChild(
    makeField("attendee-email", "email", "Email", "email", isFirst, "Attendee email")
  );
  fieldsCol.appendChild(contactRow);

  row.appendChild(fieldsCol);

  // Always render the remove button so the first row's fields line
  // up with the others (the button still occupies its column on the
  // first row — see the :first-child rule in styles.css that hides
  // it visually). The click handler is a no-op for the first row
  // because the list is guaranteed to have exactly one child there.
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-attendee-btn";
  removeBtn.setAttribute("aria-label", "Remove attendee");
  // Mark hidden for assistive tech on the first row, where the button
  // is purely a layout placeholder.
  if (isFirst) removeBtn.setAttribute("aria-hidden", "true");
  // Inline SVG minus icon — cleaner than a Unicode hyphen and lets us
  // match the rest of the form's stroke-based icon style.
  removeBtn.innerHTML =
    '<svg viewBox="0 0 20 20" aria-hidden="true">' +
    '<line x1="5" y1="10" x2="15" y2="10" />' +
    "</svg>";
  removeBtn.addEventListener("click", () => {
    const list = document.getElementById("attendees-list");
    if (list && list.children.length > 1) {
      row.remove();
    } else {
      // Defensive fallback: if some other path left the list with
      // only this row, clear it instead of leaving an empty shell.
      row.querySelectorAll("input").forEach((el) => {
        el.value = "";
        el.classList.remove("is-invalid");
      });
      row.querySelector('input[name="attendee-name"]')?.focus();
    }
  });
  row.appendChild(removeBtn);

  return row;
}

function ensureInitialAttendeeRow() {
  const list = document.getElementById("attendees-list");
  if (!list) return;
  if (list.children.length === 0) {
    // First row: phone/email required so we always have contact info
    // to use as defaults for additional attendees.
    list.appendChild(buildAttendeeRow(true));
  }
}

function wireAddAttendee() {
  const btn = document.getElementById("add-attendee-btn");
  const list = document.getElementById("attendees-list");
  if (!btn || !list) return;
  btn.addEventListener("click", () => {
    // Additional rows: phone/email optional — they default to the first
    // attendee's values at submit time if left blank.
    const row = buildAttendeeRow(false);
    list.appendChild(row);
    row.querySelector('input[name="attendee-name"]')?.focus();
  });
}

// ---------- Modal ----------

let rsvpModal = null;

/** Lazily build a Bootstrap Modal instance for #rsvp-modal. */
function getModal() {
  if (rsvpModal) return rsvpModal;
  const el = document.getElementById("rsvp-modal");
  if (!el || !window.bootstrap?.Modal) return null;
  rsvpModal = new window.bootstrap.Modal(el);
  return rsvpModal;
}

/** Open the RSVP modal, pre-checking the radio based on which button was clicked. */
function showModal(attendingValue) {
  const modal = getModal();
  if (!modal) return;

  // Pre-select the radio.
  document.getElementById("attending-yes").checked = attendingValue === "Yes";
  document.getElementById("attending-no").checked = attendingValue === "No";

  modal.show();

  // After the modal animation, focus the first attendee input.
  setTimeout(() => {
    document.querySelector("#attendees-list input")?.focus();
  }, 400);
}

/** Put the modal back into the form view: form visible, thank-you hidden,
 *  title restored to the "Kindly reply" copy. */
function resetRsvpModalToFormView() {
  document.getElementById("rsvp-form")?.classList.remove("d-none");
  document.getElementById("rsvp-thank-you")?.classList.add("d-none");
  const titleEl = document.getElementById("rsvp-modal-title");
  if (titleEl) titleEl.textContent = "Kindly reply";
}

/** Lifecycle listeners: reset the modal to the form view when it opens
 *  (so a stale thank-you from a previous interaction doesn't show), and
 *  reset the form fields when it fully closes. The thank-you is shown
 *  after submit and stays in the modal until the user closes it (via
 *  the X button, ESC, the Cancel link, or clicking the backdrop). */
function wireModalLifecycle() {
  const modalEl = document.getElementById("rsvp-modal");
  if (!modalEl) return;

  modalEl.addEventListener("show.bs.modal", () => {
    resetRsvpModalToFormView();
  });

  // When the modal fully closes (cancel, X, backdrop, ESC, or programmatic
  // hide after submit), reset the form so it's clean for next time.
  modalEl.addEventListener("hidden.bs.modal", () => {
    const form = document.getElementById("rsvp-form");
    if (!form) return;
    form.reset();
    form.querySelectorAll(".form-control").forEach((el) => {
      el.classList.remove("is-invalid");
    });
  });
}

function wireRsButtons() {
  document.querySelectorAll("#rsvp-buttons [data-attending]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showModal(btn.getAttribute("data-attending"));
    });
  });
}

// ---------- Calendar popover ----------

function wireCalendarDropdown() {
  const trigger = document.getElementById("date-trigger");
  const popover = document.getElementById("calendar-popover");
  if (!trigger || !popover) return;

  const open = () => {
    popover.classList.remove("d-none");
    trigger.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    popover.classList.add("d-none");
    trigger.setAttribute("aria-expanded", "false");
  };
  const toggle = () =>
    popover.classList.contains("d-none") ? open() : close();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  // Click outside to close.
  document.addEventListener("click", (e) => {
    if (!popover.contains(e.target) && e.target !== trigger) close();
  });

  // ESC to close.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Wire the four popover items.
  popover.querySelectorAll("[data-cal]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const kind = item.getAttribute("data-cal");
      if (kind === "google")
        window.open(googleCalendarUrl(), "_blank", "noopener");
      else if (kind === "apple")
        window.location.href = appleCalendarUrl();
      else if (kind === "outlook")
        window.open(outlookCalendarUrl(), "_blank", "noopener");
      else if (kind === "ics") downloadIcs();
      close();
    });
  });
}

function wireReminderLink() {
  const link = document.getElementById("set-reminder-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    // Open the same Google Calendar URL the dropdown uses.
    window.open(googleCalendarUrl(), "_blank", "noopener");
  });
}

// ---------- Theme toggle ----------

const THEME_DARK = "dark";
const THEME_LIGHT = "light";
const THEME_COLOR_DARK = "#1a1714";
const THEME_COLOR_LIGHT = "#f5f0e8";

/** Update the <meta name="theme-color"> tag to match the current theme. */
function updateThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

/** Apply a theme to <html> + persist + sync UI. */
function applyTheme(theme) {
  const html = document.documentElement;
  const btn = document.querySelector(".theme-toggle");
  const isLight = theme === THEME_LIGHT;

  if (isLight) html.setAttribute("data-theme", "light");
  else html.removeAttribute("data-theme");

  if (btn) {
    btn.classList.toggle("is-light", isLight);
    btn.setAttribute(
      "aria-label",
      isLight ? "Switch to dark mode" : "Switch to light mode"
    );
  }

  try {
    localStorage.setItem("theme", theme);
  } catch (e) {
    /* localStorage may be unavailable (private mode, sandboxed iframe, etc.). */
  }

  updateThemeColor(isLight ? THEME_COLOR_LIGHT : THEME_COLOR_DARK);
}

function wireThemeToggle() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  // Sync the button's initial visual state to whatever the pre-paint script set.
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";
  if (isLight) {
    btn.classList.add("is-light");
    btn.setAttribute("aria-label", "Switch to dark mode");
  }

  btn.addEventListener("click", () => {
    const currentlyLight =
      document.documentElement.getAttribute("data-theme") === "light";
    applyTheme(currentlyLight ? THEME_DARK : THEME_LIGHT);
  });
}

// ---------- Validation helpers ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d+\-()\s.]{7,}$/;

function validate(form) {
  let ok = true;
  const rows = Array.from(form.querySelectorAll(".attendee-row"));

  rows.forEach((row, idx) => {
    const nameEl = row.querySelector('input[name="attendee-name"]');
    const phoneEl = row.querySelector('input[name="attendee-phone"]');
    const emailEl = row.querySelector('input[name="attendee-email"]');

    // Every row's name is required.
    const nameEmpty = !nameEl?.value.trim();
    nameEl?.classList.toggle("is-invalid", nameEmpty);
    if (nameEmpty) ok = false;

    const phoneVal = (phoneEl?.value ?? "").trim();
    const emailVal = (emailEl?.value ?? "").trim();

    if (idx === 0) {
      // First row: phone and email are required — they also serve as
      // the defaults for any additional attendees that leave those
      // fields blank (see wireSubmit).
      const phoneOk = PHONE_RE.test(phoneVal);
      phoneEl?.classList.toggle("is-invalid", !phoneOk);
      if (!phoneOk) ok = false;

      const emailOk = EMAIL_RE.test(emailVal);
      emailEl?.classList.toggle("is-invalid", !emailOk);
      if (!emailOk) ok = false;
    } else {
      // Additional rows: phone/email are optional. If the user does
      // provide them they must be valid, otherwise leave them blank
      // and we'll fall back to the first attendee's values on submit.
      if (phoneVal) {
        const phoneOk = PHONE_RE.test(phoneVal);
        phoneEl?.classList.toggle("is-invalid", !phoneOk);
        if (!phoneOk) ok = false;
      } else {
        phoneEl?.classList.remove("is-invalid");
      }

      if (emailVal) {
        const emailOk = EMAIL_RE.test(emailVal);
        emailEl?.classList.toggle("is-invalid", !emailOk);
        if (!emailOk) ok = false;
      } else {
        emailEl?.classList.remove("is-invalid");
      }
    }
  });

  return { ok, rows };
}

// ---------- Submit ----------

function wireSubmit() {
  const form = document.getElementById("rsvp-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { ok, rows } = validate(form);
    if (!ok) return;

    const attending =
      (document.querySelector('input[name="attending"]:checked') || {}).value ||
      "Yes";

    const userMessage = form.querySelector("#message").value.trim();

    // The first attendee's phone and email are the defaults for any
    // additional attendees that leave those fields blank — we always
    // submit a complete contact for every Google Form row.
    const firstRow = rows[0];
    const firstName = firstRow.querySelector('input[name="attendee-name"]').value.trim();
    const firstPhone = firstRow.querySelector('input[name="attendee-phone"]').value.trim();
    const firstEmail = firstRow.querySelector('input[name="attendee-email"]').value.trim();

    // Submit each attendee as its own Google Form entry. We POST them
    // sequentially so the "thank you" only appears after the last one
    // has been sent; the network round-trips are short and Google
    // accepts them as independent submissions either way.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.querySelector('input[name="attendee-name"]').value.trim();
      let phone = row.querySelector('input[name="attendee-phone"]').value.trim();
      let email = row.querySelector('input[name="attendee-email"]').value.trim();

      // Build the per-row private message. The first attendee gets
      // exactly what the user typed; additional attendees get the
      // user's message (if any) with a short note appended indicating
      // they were submitted by the first attendee.
      let rowMessage = userMessage;
      if (i > 0) {
        // Default blank phone/email to the first attendee's values.
        if (!phone) phone = firstPhone;
        if (!email) email = firstEmail;
        const note = `${name} (RSVP submitted by ${firstName})`;
        rowMessage = userMessage ? `${userMessage}\n\n${note}` : note;
      }

      // Build FormData using the field IDs from CONFIG.
      const fd = new FormData();
      fd.append(CONFIG.fields.attending, attending);
      fd.append(CONFIG.fields.name, name);
      fd.append(CONFIG.fields.phone, phone);
      fd.append(CONFIG.fields.email, email);
      if (rowMessage) fd.append(CONFIG.fields.message, rowMessage);

      // Fire-and-forget POST to Google. We can't read the response with
      // mode: 'no-cors', but Google will record the submission.
      try {
        await fetch(CONFIG.formActionUrl, {
          method: "POST",
          mode: "no-cors",
          body: fd,
        });
      } catch (err) {
        // Even if the fetch rejects, Google may have received it. We
        // still continue with the remaining attendees and show the
        // thank-you state at the end so the user isn't left waiting.
        console.warn("RSVP POST failed for", name, err);
      }
    }

    // Show the thank-you inside the modal, addressed to the first
    // attendee by first name. The modal fades away with this message
    // still visible.
    showThankYouInModal(firstName);
  });
}

/** Swap the modal contents to the thank-you view. The message stays
 *  visible in the modal until the user closes it themselves (X, ESC,
 *  Cancel link, or backdrop click). Greeted by the first attendee's
 *  first name (the person who actually filled out the form). */
function showThankYouInModal(firstAttendeeFullName) {
  const msgEl = document.getElementById("rsvp-thank-you-message");
  const titleEl = document.getElementById("rsvp-modal-title");

  if (msgEl) {
    const first = firstAttendeeName(firstAttendeeFullName);
    msgEl.textContent = `Thank you, ${first}! Your RSVP has been received.`;
  }
  if (titleEl) {
    titleEl.textContent = "Thank you!";
  }

  document.getElementById("rsvp-form")?.classList.add("d-none");
  document.getElementById("rsvp-thank-you")?.classList.remove("d-none");
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  populateFromConfig();
  applyDeadline();
  ensureInitialAttendeeRow();
  wireAddAttendee();
  wireRsButtons();
  wireModalLifecycle();
  wireThemeToggle();
  wireSubmit();
  wireCalendarDropdown();
  wireReminderLink();
});
