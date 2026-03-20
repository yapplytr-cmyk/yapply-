"""Transactional email notifications via Resend HTTP API.

All functions are fire-and-forget: failures are logged but never
block the caller.  The email is only attempted when RESEND_API_KEY
is configured.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import RESEND_API_KEY, RESEND_FROM_EMAIL

log = logging.getLogger("yapply.email")

RESEND_SEND_URL = "https://api.resend.com/emails"


# ── Brand constants ──────────────────────────────────────

_BG = "#080b10"
_CARD_BG = "#111620"
_CARD_BORDER = "#1c2333"
_GOLD = "#c9a84c"
_GOLD_DARK = "#a8882e"
_GOLD_LIGHT = "#e0c878"
_TEXT = "#e8e2d6"
_TEXT_MUTED = "#9a9286"
_TEXT_DIM = "#6b6560"
_WHITE = "#f5f0e8"
_DIVIDER = "#1e2636"


# ── Bird mascot SVG (construction bird holding envelope) ─

_BIRD_SVG = """\
<svg viewBox="0 0 120 120" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;margin:0 auto;">
  <ellipse cx="60" cy="62" rx="28" ry="30" fill="#4A7EC7"/>
  <ellipse cx="60" cy="71" rx="17" ry="15" fill="#89B8E8"/>
  <ellipse cx="60" cy="34" rx="21" ry="9" fill="#E8C840"/>
  <rect x="39" y="29" width="42" height="7" rx="2" fill="#E8C840"/>
  <rect x="54" y="21" width="12" height="9" rx="2" fill="#E8C840"/>
  <rect x="35" y="34" width="50" height="3.5" rx="1.5" fill="#D4A828"/>
  <text x="60" y="33" text-anchor="middle" fill="#3A6AAF" font-size="9" font-weight="bold" font-family="system-ui,sans-serif">Y</text>
  <circle cx="50" cy="48" r="4.5" fill="white"/>
  <circle cx="70" cy="48" r="4.5" fill="white"/>
  <circle cx="51" cy="48" r="2.2" fill="#1A1A2E"/>
  <circle cx="71" cy="48" r="2.2" fill="#1A1A2E"/>
  <polygon points="60,55 55,60 65,60" fill="#E8A020"/>
  <ellipse cx="86" cy="64" rx="11" ry="7" fill="#3A6AAF" transform="rotate(-15 86 64)"/>
  <rect x="77" y="70" width="20" height="14" rx="2" fill="white" stroke="#D4A828" stroke-width="1.2"/>
  <polyline points="77,70 87,78 97,70" fill="none" stroke="#D4A828" stroke-width="1.2" stroke-linejoin="round"/>
  <rect x="43" y="84" width="34" height="3.5" rx="1.5" fill="#8B6914"/>
  <rect x="56" y="83" width="8" height="5.5" rx="1" fill="#D4A828"/>
  <rect x="49" y="91" width="5" height="5" rx="1" fill="#E8A020"/>
  <rect x="66" y="91" width="5" height="5" rx="1" fill="#E8A020"/>
</svg>"""


# ── Shared branded HTML shell ────────────────────────────

def _branded_html(title: str, body_html: str) -> str:
  return f"""\
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>{title}</title>
  <!--[if mso]><style>table,td{{font-family:Arial,sans-serif;}}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:{_BG};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{_BG};">
<tr><td align="center" style="padding:32px 16px 40px;">

  <!-- Main container (560px max) -->
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

    <!-- ── Header: Bird + Logo ── -->
    <tr><td align="center" style="padding:24px 0 8px;">
      {_BIRD_SVG}
    </td></tr>
    <tr><td align="center" style="padding:12px 0 6px;">
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:2px;color:{_GOLD};">YAPPLY</span>
    </td></tr>
    <tr><td align="center" style="padding:0 0 28px;">
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:{_TEXT_DIM};">Premium Construction Marketplace</span>
    </td></tr>

    <!-- ── Gold accent line ── -->
    <tr><td style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="height:2px;background:linear-gradient(90deg,transparent,{_GOLD},transparent);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    <!-- ── Content area ── -->
    <tr><td style="padding:32px 32px 24px;">
      {body_html}
    </td></tr>

    <!-- ── Footer divider ── -->
    <tr><td style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="height:1px;background-color:{_DIVIDER};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    <!-- ── Footer ── -->
    <tr><td align="center" style="padding:24px 32px 8px;">
      <a href="https://yapplytr.com" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:{_GOLD};text-decoration:none;letter-spacing:0.5px;">yapplytr.com</a>
    </td></tr>
    <tr><td align="center" style="padding:4px 32px 16px;">
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:{_TEXT_DIM};">Turkey&rsquo;s Premium Construction Marketplace</span>
    </td></tr>

  </table>

</td></tr>
</table>

</body>
</html>"""


# ── Reusable email components ────────────────────────────

def _heading(text: str) -> str:
  return f'<h1 style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.3;color:{_WHITE};">{text}</h1>'


def _paragraph(text: str) -> str:
  return f'<p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:{_TEXT};">{text}</p>'


def _accent(text: str) -> str:
  return f'<span style="color:{_GOLD};font-weight:600;">{text}</span>'


def _detail_card(rows: list[tuple[str, str]], card_title: str = "") -> str:
  """Build a premium detail card using email-safe tables.
  rows: list of (label, value) tuples."""
  card = f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background-color:{_CARD_BG};border:1px solid {_CARD_BORDER};border-radius:12px;overflow:hidden;">"""

  if card_title:
    card += f"""\
  <tr><td style="padding:16px 20px 10px;">
    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{_GOLD};">{card_title}</span>
  </td></tr>"""

  for i, (label, value) in enumerate(rows):
    border_bottom = f"border-bottom:1px solid {_DIVIDER};" if i < len(rows) - 1 else ""
    top_pad = "14px" if (i == 0 and not card_title) else "12px"
    bottom_pad = "14px" if i == len(rows) - 1 else "12px"
    card += f"""\
  <tr><td style="padding:{top_pad} 20px {bottom_pad};{border_bottom}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:500;letter-spacing:0.3px;text-transform:uppercase;color:{_TEXT_MUTED};padding-bottom:4px;">{label}</td>
      </tr>
      <tr>
        <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:{_WHITE};line-height:1.4;">{value}</td>
      </tr>
    </table>
  </td></tr>"""

  card += "</table>"
  return card


def _cta_button(text: str, url: str) -> str:
  """Premium Yapply-style CTA button — email-safe with VML fallback for Outlook."""
  return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr><td align="center" style="border-radius:8px;background-color:{_GOLD};">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" fillcolor="{_GOLD}" stroke="f">
    <w:anchorlock/><center style="color:#0a0e14;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">{text}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!--><a href="{url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#0a0e14;text-decoration:none;border-radius:8px;background-color:{_GOLD};letter-spacing:0.3px;">{text}</a><!--<![endif]-->
  </td></tr>
</table>"""


def _proposal_block(text: str) -> str:
  """Render a proposal excerpt in a styled quote block."""
  return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
  <tr><td style="padding:14px 18px;background-color:{_CARD_BG};border-left:3px solid {_GOLD};border-radius:0 8px 8px 0;">
    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-style:italic;line-height:1.6;color:{_TEXT_MUTED};">&ldquo;{text}&rdquo;</span>
  </td></tr>
</table>"""


# ── Low-level send via Resend HTTP API ───────────────────

def _send_email(to: str, subject: str, html: str) -> None:
  """Send one email via Resend.  Synchronous but wrapped in try/except
  so it never crashes the caller.  Must be synchronous because Vercel
  serverless functions kill daemon threads on handler return."""
  if not RESEND_API_KEY or not to:
    return

  try:
    body = json.dumps({
      "from": RESEND_FROM_EMAIL,
      "to": [to],
      "subject": subject,
      "html": html,
    }).encode("utf-8")
    req = Request(
      RESEND_SEND_URL,
      method="POST",
      data=body,
      headers={
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "YapplyApp/1.0",
      },
    )
    with urlopen(req, timeout=10) as resp:
      resp.read()
  except (HTTPError, URLError, OSError) as exc:
    log.warning("Email send failed: %s", exc)


# ── Helper to safely extract nested values ───────────────

def _get(d: dict | None, *keys: str, default: str = "") -> str:
  val = d or {}
  for k in keys:
    if isinstance(val, dict):
      val = val.get(k)
    else:
      return default
  return str(val).strip() if val else default


# ── 1. Client listing created ────────────────────────────

def send_client_listing_created(listing: dict[str, Any]) -> None:
  meta = listing.get("marketplaceMeta") or {}
  to = _get(listing, "ownerEmail") or _get(listing, "contact", "email")
  title = _get(listing, "title") or _get(meta, "projectTitle") or "Your Project"
  category = _get(meta, "category") or _get(meta, "projectCategory")
  location = _get(meta, "location") or _get(listing, "location")
  budget = _get(meta, "budget") or _get(meta, "estimatedBudget")
  timeline = _get(meta, "timeline") or _get(meta, "estimatedTimeline")
  owner_name = _get(listing, "ownerName") or _get(listing, "contact", "fullName") or ""

  greeting = f"Hi {owner_name}," if owner_name else "Hi,"

  rows = [("Project", title)]
  if category:
    rows.append(("Category", category))
  if location:
    rows.append(("Location", location))
  if budget:
    rows.append(("Budget", budget))
  if timeline:
    rows.append(("Timeline", timeline))

  body = (
    _heading("Your listing is now live")
    + _paragraph(greeting)
    + _paragraph(f'Your project {_accent(f"&ldquo;{title}&rdquo;")} has been published on the Yapply marketplace and is now open for developer bids.')
    + _detail_card(rows, "Project Details")
    + _paragraph("You&rsquo;ll be notified when developers submit bids on your project.")
    + _cta_button("View Your Dashboard", "https://yapplytr.com/client-dashboard.html")
  )

  _send_email(to, f"Your Yapply listing is live \u2014 {title}", _branded_html("Listing Created", body))


# ── 2. Developer listing created ─────────────────────────

def send_developer_listing_created(listing: dict[str, Any]) -> None:
  meta = listing.get("marketplaceMeta") or {}
  dev_ref = meta.get("developerProfileReference") or {}
  to = _get(listing, "ownerEmail") or _get(listing, "contact", "email")
  title = _get(listing, "title") or _get(listing, "name") or "Your Listing"
  company = _get(dev_ref, "companyName") or _get(listing, "ownerName") or ""
  category = _get(meta, "category") or _get(listing, "specialty")
  location = _get(meta, "location") or _get(listing, "location")
  experience = _get(meta, "yearsExperience") or _get(dev_ref, "yearsExperience")
  price = _get(meta, "startingPrice")

  greeting = f"Hi {company}," if company else "Hi,"

  rows = [("Listing", title)]
  if category:
    rows.append(("Specialty", category))
  if location:
    rows.append(("Service Area", location))
  if experience:
    rows.append(("Experience", f"{experience} years"))
  if price:
    rows.append(("Starting Price", price))

  body = (
    _heading("Your listing is now live")
    + _paragraph(greeting)
    + _paragraph(f'Your professional listing {_accent(f"&ldquo;{title}&rdquo;")} is now published on the Yapply marketplace.')
    + _detail_card(rows, "Listing Details")
    + _paragraph("Clients searching for services in your area can now find and contact you.")
    + _cta_button("View Your Dashboard", "https://yapplytr.com/developer-dashboard.html")
  )

  _send_email(to, f"Your Yapply listing is live \u2014 {title}", _branded_html("Listing Created", body))


# ── 3. Bid placed — notify client ────────────────────────

def send_bid_received(listing: dict[str, Any], bid: dict[str, Any]) -> None:
  to = _get(listing, "ownerEmail") or _get(listing, "contact", "email")
  listing_title = _get(listing, "title") or _get(listing, "marketplaceMeta", "projectTitle") or "your listing"
  owner_name = _get(listing, "ownerName") or _get(listing, "contact", "fullName") or ""

  dev_ref = bid.get("developerProfileReference") or {}
  dev_name = _get(dev_ref, "companyName") or _get(bid, "developerName") or "A developer"
  bid_amount = _get(bid, "bidAmount", "label") or _get(bid, "bidAmount", "amount")
  timeframe = _get(bid, "estimatedCompletionTimeframe", "label") or _get(bid, "estimatedCompletionTimeframe", "estimatedDays")
  proposal = _get(bid, "proposalMessage")

  greeting = f"Hi {owner_name}," if owner_name else "Hi,"

  rows = [("Developer", dev_name)]
  if bid_amount:
    rows.append(("Bid Amount", bid_amount))
  if timeframe:
    rows.append(("Timeframe", timeframe))

  proposal_html = ""
  if proposal:
    short_proposal = proposal[:200] + ("\u2026" if len(proposal) > 200 else "")
    proposal_html = _proposal_block(short_proposal)

  body = (
    _heading("New bid on your project")
    + _paragraph(greeting)
    + _paragraph(f'A developer has placed a bid on your project {_accent(f"&ldquo;{listing_title}&rdquo;")}.')
    + _detail_card(rows, "Bid Summary")
    + proposal_html
    + _cta_button("Review Bids", "https://yapplytr.com/client-dashboard.html#client-dashboard-active")
  )

  _send_email(to, f"New bid on \"{listing_title}\"", _branded_html("New Bid Received", body))


# ── 4. Bid accepted — notify winning developer ──────────

def send_bid_accepted(listing: dict[str, Any], bid: dict[str, Any]) -> None:
  dev_ref = bid.get("developerProfileReference") or {}
  # The developer email may be in the bid or fetched from profile.
  to = _get(bid, "developerEmail") or _get(dev_ref, "email") or ""

  # If no email in bid, try to look up the developer profile.
  if not to:
    dev_user_id = _get(bid, "developerUserId") or _get(dev_ref, "userId")
    if dev_user_id:
      try:
        from .supabase import get_profile_by_id
        profile = get_profile_by_id(dev_user_id)
        if profile:
          to = profile.get("email") or ""
      except Exception:
        pass

  dev_name = _get(dev_ref, "companyName") or "Developer"
  listing_title = _get(listing, "title") or _get(listing, "marketplaceMeta", "projectTitle") or "the project"
  bid_amount = _get(bid, "bidAmount", "label") or _get(bid, "bidAmount", "amount")
  timeframe = _get(bid, "estimatedCompletionTimeframe", "label") or _get(bid, "estimatedCompletionTimeframe", "estimatedDays")

  # Client contact details (shared after acceptance).
  client_name = _get(listing, "ownerName") or _get(listing, "contact", "fullName")
  client_email = _get(listing, "ownerEmail") or _get(listing, "contact", "email")
  client_phone = _get(listing, "contact", "phone") or _get(listing, "contact", "phoneNumber")

  greeting = f"Congratulations {dev_name}!"

  rows = [("Project", listing_title)]
  if bid_amount:
    rows.append(("Accepted Bid", bid_amount))
  if timeframe:
    rows.append(("Timeframe", timeframe))

  contact_rows: list[tuple[str, str]] = []
  if client_name:
    contact_rows.append(("Name", client_name))
  if client_email:
    contact_rows.append(("Email", client_email))
  if client_phone:
    contact_rows.append(("Phone", client_phone))

  contact_html = _detail_card(contact_rows, "Client Contact") if contact_rows else ""

  body = (
    _heading("Your bid was accepted!")
    + _paragraph(greeting)
    + _paragraph(f'Your bid on {_accent(f"&ldquo;{listing_title}&rdquo;")} has been accepted by the client. You can now begin coordinating the project.')
    + _detail_card(rows, "Accepted Bid")
    + contact_html
    + _cta_button("View Project Details", "https://yapplytr.com/developer-dashboard.html#developer-dashboard-bids")
  )

  _send_email(to, f"Your bid was accepted \u2014 {listing_title}", _branded_html("Bid Accepted", body))
