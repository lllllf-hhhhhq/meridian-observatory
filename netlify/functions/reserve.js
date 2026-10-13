/* Meridian reservation desk - Netlify Function (Node.js runtime, Functions API v2)
   Route: POST /api/reserve  (netlify.toml maps /api/* onto this function)
   Holds a place for one evening session and mails the confirmation to the guest,
   with a blind copy to the desk inbox. Nothing is claimed unless the relay took it. */
import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSIONS = new Set(["18:30", "19:30", "20:30"]);

/* One reservation desk, one evening's worth of patience. */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map();

function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function longDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  });
}

function mailConfig(env) {
  const vars = env || process.env;
  const host = vars.SMTP_HOST || "smtp.qq.com";
  const port = Number(vars.SMTP_PORT || 465);
  const user = vars.SMTP_USER;
  const pass = vars.SMTP_PASS;
  const inbox = vars.MAIL_TO || user;
  return { host, port, user, pass, inbox };
}

function body(guest, when, party) {
  const seats = party === "1" ? "1 guest" : party + " guests";
  const text = [
    "Meridian",
    "Society of Celestial Cartography & Instrument-Making",
    "",
    "Place held",
    when,
    seats,
    "Booked as " + guest,
    "",
    "Doors open fifteen minutes before the session and the instruments come",
    "out of their cases first. Bring this message to the desk and the",
    "attendant will match it against the list.",
    "",
    "If you cannot come, reply to this message and the place goes back to",
    "the waitlist the same evening.",
    "",
    "---",
    "Sent automatically because this address was entered on the",
    "reservation form at the Meridian desk."
  ].join("\n");

  const html = [
    '<div style="font-family:Georgia,\'Times New Roman\',serif;color:#1b1b1f;line-height:1.6;max-width:560px">',
    '<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a6d2f;margin:0 0 18px">Meridian</p>',
    '<h1 style="font-size:24px;font-weight:400;margin:0 0 6px">Place held</h1>',
    '<p style="margin:0 0 22px;color:#55555e">Society of Celestial Cartography &amp; Instrument-Making</p>',
    '<table style="border-collapse:collapse;font-size:15px;margin:0 0 22px">',
    '<tr><td style="padding:6px 22px 6px 0;color:#8a6d2f">When</td><td style="padding:6px 0">' + when + "</td></tr>",
    '<tr><td style="padding:6px 22px 6px 0;color:#8a6d2f">Seats</td><td style="padding:6px 0">' + seats + "</td></tr>",
    '<tr><td style="padding:6px 22px 6px 0;color:#8a6d2f">Booked as</td><td style="padding:6px 0">' + guest + "</td></tr>",
    "</table>",
    '<p style="margin:0 0 14px">Doors open fifteen minutes before the session and the instruments come out of their cases first. Bring this message to the desk and the attendant will match it against the list.</p>',
    '<p style="margin:0 0 14px">If you cannot come, reply to this message and the place goes back to the waitlist the same evening.</p>',
    '<p style="margin:22px 0 0;font-size:12px;color:#8a8a92">Sent automatically because this address was entered on the reservation form at the Meridian desk.</p>',
    "</div>"
  ].join("");

  return { text, html };
}

/* The request arrives as a standard Fetch Request, which is what the
   Netlify Functions v2 signature hands over. */
async function readJson(req) {
  if (!req) return {};
  if (typeof req.json === "function") {
    try { return await req.json(); } catch (e) { return {}; }
  }
  if (req.body) {
    try {
      const reader = req.body.getReader();
      const chunks = [];
      for (;;) {
        const step = await reader.read();
        if (step.done) break;
        chunks.push(step.value);
      }
      return JSON.parse(Buffer.concat(chunks.map(Buffer.from)).toString("utf8"));
    } catch (e) { return {}; }
  }
  return {};
}

function reply(status, payload) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function reject(status, payload) {
  return reply(status, Object.assign({ ok: false }, payload));
}

export default async function handle(request, context) {
  const method = (request && request.method) || "GET";
  const cfg = mailConfig(process.env);

  if (method === "GET") {
    return reply(200, {
      ok: true,
      service: "meridian-reserve",
      configured: Boolean(cfg.user && cfg.pass),
      relay: cfg.host
    });
  }

  if (method !== "POST") {
    return reject(405, { message: "No such desk." });
  }

  const payload = await readJson(request);
  const date = String(payload.date || "").trim();
  const time = String(payload.time || "").trim();
  const party = String(payload.party || "").trim();
  const guest = String(payload.email || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reject(422, { field: "date", message: "Choose the evening you would like to attend." });
  }
  if (!SESSIONS.has(time)) {
    return reject(422, { field: "time", message: "Choose a session time." });
  }
  if (!/^[1-6]$/.test(party)) {
    return reject(422, { field: "party", message: "Choose how many guests are coming, from 1 to 6." });
  }
  if (!EMAIL_RE.test(guest)) {
    return reject(422, { field: "email", message: "Add an email address we can confirm to." });
  }

  if (!cfg.user || !cfg.pass) {
    return reject(503, {
      message: "The confirmation desk is offline, so nothing was sent. Please try again later."
    });
  }

  const ip = String(
    (context && context.ip) ||
    (request.headers.get("x-nf-client-connection-ip")) ||
    ""
  ).trim();
  if (ip && overLimit(ip)) {
    return reject(429, { message: "That is a lot of reservations from one connection. Try again in an hour." });
  }

  const when = longDate(date) + " at " + time;
  const content = body(guest, when, party);

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass }
  });

  try {
    const info = await transport.sendMail({
      from: '"Meridian Reservations" <' + cfg.user + ">",
      to: guest,
      bcc: cfg.inbox && cfg.inbox !== guest ? cfg.inbox : undefined,
      replyTo: cfg.inbox,
      subject: "Place held: " + when,
      text: content.text,
      html: content.html
    });

    return reply(200, {
      ok: true,
      when: when,
      seats: party === "1" ? "1 guest" : party + " guests",
      id: info.messageId
    });
  } catch (err) {
    console.error("reserve: send failed", err && err.message);
    return reject(502, { message: "The confirmation desk could not reach the mail relay. Please try again." });
  }
}
