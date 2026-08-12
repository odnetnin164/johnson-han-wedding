// All editable content for the wedding invite lives here.
// To swap to a different Google Form, see the "Swap the Google Form"
// section in README.md — you'll need a new formActionUrl and entry IDs.

export const CONFIG = {
  // Where the form posts to. Pulled from your existing Google Form at
  // https://forms.gle/7sV9K9f3VShoiUdU7
  formActionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSci9xHqRMMO4_vIV2mDd43QhRySwrRckPkxxd2MPaZ7SNCz5w/formResponse",

  // Google Form field IDs. These come from the form's FB_PUBLIC_LOAD_DATA
  // payload in the viewform page source — see README.md for how to find them.
  fields: {
    attending: "entry.643666890", // "Are you attending?" — Yes / No radio
    name: "entry.2019693562", // "Attendee Name" — short text (we combine multi-row values)
    phone: "entry.1006424672", // "Attendee Phone" — short text
    email: "entry.1544068584", // "Attendee Email" — short text
    message: "entry.1425858943", // "Private Message" — paragraph (optional)
  },

  // After this date/time the RSVP buttons are hidden and a "closed" notice
  // is shown. Local time (browser's clock). ISO 8601 format.
  rsvpDeadline: "2026-09-04T23:59",

  // Couple. "hosted by" in the details section is derived from these.
  couple: {
    name1: "Janice",
    name2: "Justin",
  },

  // Title for the details panel (replaces the old `event.title`).
  eventTitle: "Janice & Justin's Wedding Celebration",

  // Long-form description shown in the details panel.
  eventDescription:
    "Join us for an evening of food, drinks, and conversation. This event is for adults (unless given special exception).",

  // Date and time shown in the DATE column of the 3-column footer.
  eventDateDisplay: "Friday, September 25",
  eventTimeDisplay: "6:00PM EDT",

  // Event details shown in the text section below the invite card image.
  event: {
    venue: "Woman's Club of Bethesda",
    addressLine1: "5500 Sonoma Rd",
    addressLine2: "Bethesda, MD 20817",
    addressUrl:
      "https://www.google.com/maps/search/?api=1&query=5500+Sonoma+Rd+Bethesda+MD+20817",
  },

  // Calendar event data, used by all four "Add to..." destinations.
  // dtstart / dtend are in basic ISO 8601 (no separators) UTC, per RFC 5545.
  // 6:00 PM EDT on 2026-09-25 → 22:00 UTC. End: 4 hours later.
  calendar: {
    uid: "wedding-janice-justin-2026-09-25@johnson-han-wedding",
    dtstart: "20260925T220000Z",
    dtend: "20260926T020000Z",
    summary: "Janice & Justin's Wedding Celebration",
    description:
      "Join us for an evening of food, drinks, and conversation. Woman's Club of Bethesda, 5500 Sonoma Rd, Bethesda, MD 20817.",
    location:
      "Woman's Club of Bethesda, 5500 Sonoma Rd, Bethesda, MD 20817",
  },

  // Path to the invite card image. The default points at the images
  // screenshot the user provided. To use a custom image, copy it to
  // assets/invite-card.jpeg and update this path.
  inviteCardSrc:
    "images/invite.jpeg",
  inviteCardAlt: "Janice and Justin wedding invitation",
};
