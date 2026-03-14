from __future__ import annotations

import re
from copy import deepcopy


CLIENT_LISTING_TYPE = "client"
PROFESSIONAL_LISTING_TYPE = "professional"
DEFAULT_CLIENT_CATEGORY = "custom-project"
DEFAULT_PROFESSIONAL_CATEGORY = "general-construction"
DEFAULT_LISTING_STATUS = "open-for-bids"
DEFAULT_BID_STATUS = "submitted"
BID_PREVIEW_LIMIT = 4

MARKETPLACE_CATEGORY_OPTIONS = [
  {"value": "pool-renovation", "label": "Pool Renovation"},
  {"value": "pool-construction", "label": "Pool Construction"},
  {"value": "wall-construction", "label": "Wall Construction"},
  {"value": "interior-renovation", "label": "Interior Renovation"},
  {"value": "kitchen-renovation", "label": "Kitchen Renovation"},
  {"value": "bathroom-renovation", "label": "Bathroom Renovation"},
  {"value": "full-villa-construction", "label": "Full Villa Construction"},
  {"value": "landscaping", "label": "Landscaping"},
  {"value": "exterior-renovation", "label": "Exterior Renovation"},
  {"value": "roofing", "label": "Roofing"},
  {"value": "flooring", "label": "Flooring"},
  {"value": "painting", "label": "Painting"},
  {"value": "tiling", "label": "Tiling"},
  {"value": "plumbing", "label": "Plumbing"},
  {"value": "electrical", "label": "Electrical"},
  {"value": "facade-work", "label": "Facade Work"},
  {"value": "garden-design", "label": "Garden Design"},
  {"value": "pergola-outdoor-structures", "label": "Pergola / Outdoor Structures"},
  {"value": "demolition-site-prep", "label": "Demolition / Site Prep"},
  {"value": "general-construction", "label": "General Construction"},
  {"value": "architecture-design", "label": "Architecture / Design"},
  {"value": "custom-project", "label": "Custom Project"},
]

MARKETPLACE_PROJECT_STATUS_OPTIONS = [
  {"value": "not-started", "label": "Not Started"},
  {"value": "planning-stage", "label": "Planning Stage"},
  {"value": "in-construction", "label": "In Construction"},
  {"value": "renovation-needed", "label": "Renovation Needed"},
  {"value": "shell-structure-complete", "label": "Shell Structure Complete"},
  {"value": "interior-work-needed", "label": "Interior Work Needed"},
  {"value": "exterior-work-needed", "label": "Exterior Work Needed"},
  {"value": "landscape-needed", "label": "Landscape Needed"},
  {"value": "other", "label": "Other"},
]

MARKETPLACE_LISTING_STATUS_OPTIONS = [
  {"value": "open-for-bids", "label": "Open for Bids"},
  {"value": "closed", "label": "Closed"},
  {"value": "awarded", "label": "Awarded"},
  {"value": "in-progress", "label": "In Progress"},
  {"value": "completed", "label": "Completed"},
]

MARKETPLACE_BID_STATUS_OPTIONS = [
  {"value": "submitted", "label": "Submitted"},
  {"value": "shortlisted", "label": "Shortlisted"},
  {"value": "declined", "label": "Declined"},
  {"value": "accepted", "label": "Accepted"},
]

_CATEGORY_VALUES = {item["value"] for item in MARKETPLACE_CATEGORY_OPTIONS}
_PROJECT_STATUS_VALUES = {item["value"] for item in MARKETPLACE_PROJECT_STATUS_OPTIONS}
_LISTING_STATUS_VALUES = {item["value"] for item in MARKETPLACE_LISTING_STATUS_OPTIONS}
_BID_STATUS_VALUES = {item["value"] for item in MARKETPLACE_BID_STATUS_OPTIONS}

_CATEGORY_ALIASES = {
  "villa-build": "full-villa-construction",
  "villa-yapimi": "full-villa-construction",
  "apartment-renovation": "interior-renovation",
  "daire-renovasyonu": "interior-renovation",
  "commercial-project": "general-construction",
  "ticari-proje": "general-construction",
  "residential-development": "full-villa-construction",
  "konut-gelistirme": "full-villa-construction",
  "hospitality-concept": "architecture-design",
  "konaklama-konsepti": "architecture-design",
  "renovation": "interior-renovation",
  "luxury-residence": "full-villa-construction",
  "development-study": "architecture-design",
  "architect": "architecture-design",
  "architecture": "architecture-design",
  "architect-design": "architecture-design",
  "interior-design": "interior-renovation",
  "contractor": "general-construction",
  "construction-company": "general-construction",
  "landscape-design": "garden-design",
}

_PROJECT_STATUS_ALIASES = {
  "i-already-own-the-plot": "not-started",
  "arsa-bana-ait": "not-started",
  "plot-reserved-under-review": "planning-stage",
  "arsa-rezerve-inceleme-asamasinda": "planning-stage",
  "looking-for-land-options": "planning-stage",
  "arsa-secenekleri-araniyor": "planning-stage",
  "need-advisory-support-on-land-and-feasibility": "other",
  "arsa-ve-fizibilite-danismanligina-ihtiyacim-var": "other",
  "plot-secured": "not-started",
  "existing-apartment-owned": "renovation-needed",
  "land-owned-feasibility-open": "planning-stage",
  "site-under-review": "planning-stage",
  "land-shortlist-in-progress": "planning-stage",
  "land-option-under-negotiation": "planning-stage",
}


def _normalize_text(value) -> str:
  return str(value or "").strip()


def _slugify_value(value) -> str:
  raw = _normalize_text(value).lower()
  raw = raw.replace("ı", "i").replace("İ", "i")
  raw = re.sub(r"[^a-z0-9]+", "-", raw)
  return raw.strip("-")


def _parse_budget_token(token: str) -> int | None:
  match = re.search(r"(\d+(?:\.\d+)?)\s*([kKmM]?)", token or "")
  if not match:
    return None

  amount = float(match.group(1))
  suffix = match.group(2).lower()

  if suffix == "m":
    return round(amount * 1_000_000)
  if suffix == "k":
    return round(amount * 1_000)
  return round(amount)


def normalize_marketplace_category(value, listing_type: str = CLIENT_LISTING_TYPE) -> str:
  slug = _slugify_value(value)
  resolved = _CATEGORY_ALIASES.get(slug, slug)

  if resolved in _CATEGORY_VALUES:
    return resolved

  return DEFAULT_PROFESSIONAL_CATEGORY if listing_type == PROFESSIONAL_LISTING_TYPE else DEFAULT_CLIENT_CATEGORY


def normalize_marketplace_project_status(value) -> str:
  slug = _slugify_value(value)
  resolved = _PROJECT_STATUS_ALIASES.get(slug, slug)

  if resolved in _PROJECT_STATUS_VALUES:
    return resolved

  return "other" if value else "not-started"


def normalize_marketplace_listing_status(value) -> str:
  slug = _slugify_value(value)
  return slug if slug in _LISTING_STATUS_VALUES else DEFAULT_LISTING_STATUS


def normalize_marketplace_bid_status(value) -> str:
  slug = _slugify_value(value)
  return slug if slug in _BID_STATUS_VALUES else DEFAULT_BID_STATUS


def normalize_marketplace_budget_range(value) -> dict | None:
  label = _normalize_text(value)
  if not label:
    return None

  tokens = [item.strip() for item in re.split(r"-|–|—|to", label, flags=re.IGNORECASE) if item.strip()]
  lower = label.lower()
  minimum = _parse_budget_token(tokens[0]) if tokens else None
  maximum = _parse_budget_token(tokens[1]) if len(tokens) > 1 else None

  return {
    "label": label,
    "currency": "EUR" if "eur" in lower else None,
    "minAmount": None if ("under" in lower or "alti" in lower) else minimum,
    "maxAmount": None if "+" in lower else (maximum or minimum),
    "isFlexible": any(token in lower for token in ("tbd", "flex", "custom")),
  }


def normalize_marketplace_desired_timeframe(value) -> dict | None:
  label = _normalize_text(value)
  if not label:
    return None

  return {"label": label, "estimatedDays": None, "unit": "custom"}


def create_marketplace_photo_references(attachments) -> list[dict]:
  items = attachments if isinstance(attachments, list) else []
  refs: list[dict] = []

  for item in items:
    if not isinstance(item, dict) or item.get("kind") != "image":
      continue

    refs.append(
      {
        "id": item.get("id"),
        "name": item.get("name"),
        "mimeType": item.get("mimeType"),
        "kind": item.get("kind") or "image",
      }
    )

    if len(refs) >= 8:
      break

  return refs


def create_developer_profile_reference(source: dict | None = None) -> dict:
  source = source or {}
  raw_specialties = source.get("specialties")
  if isinstance(raw_specialties, list):
    specialties = [_normalize_text(item) for item in raw_specialties if _normalize_text(item)][:6]
  else:
    specialties = [_normalize_text(item) for item in _normalize_text(raw_specialties).split(",") if _normalize_text(item)][:6]

  portfolio_images = source.get("portfolioImages") if isinstance(source.get("portfolioImages"), list) else []
  portfolio_projects = source.get("portfolioProjects") if isinstance(source.get("portfolioProjects"), list) else []

  rating_average = source.get("ratingAverage")
  try:
    rating_average = float(rating_average) if rating_average is not None else None
  except (TypeError, ValueError):
    rating_average = None

  rating_count = source.get("ratingCount")
  try:
    rating_count = int(rating_count) if rating_count is not None else 0
  except (TypeError, ValueError):
    rating_count = 0

  return {
    "userId": _normalize_text(source.get("userId") or source.get("id")) or None,
    "companyName": _normalize_text(source.get("companyName") or source.get("name")) or None,
    "specialties": specialties,
    "ratingAverage": rating_average,
    "ratingCount": rating_count,
    "portfolioImages": portfolio_images[:6],
    "portfolioProjects": portfolio_projects[:4],
  }


def validate_marketplace_listing_payload(payload: dict) -> dict:
  if not isinstance(payload, dict):
    raise ValueError("A marketplace listing payload is required.")

  listing_type = payload.get("type")
  title = _normalize_text(payload.get("title") or payload.get("name"))
  location = _normalize_text(payload.get("location"))
  description = _normalize_text(payload.get("brief") or payload.get("summary") or payload.get("portfolioSummary"))

  if listing_type not in {CLIENT_LISTING_TYPE, PROFESSIONAL_LISTING_TYPE}:
    raise ValueError("A valid marketplace listing type is required.")
  if not title:
    raise ValueError("A listing title is required.")
  if not location:
    raise ValueError("A listing location is required.")
  if not description:
    raise ValueError("A listing description is required.")

  category_seed = (
    payload.get("marketplaceCategory")
    or (payload.get("projectType") if listing_type == CLIENT_LISTING_TYPE else payload.get("specialty"))
    or (payload.get("services") or [None])[0]
  )
  category = normalize_marketplace_category(category_seed, listing_type)
  subcategory = _normalize_text(
    payload.get("marketplaceSubcategory")
    or (payload.get("projectType") if listing_type == CLIENT_LISTING_TYPE else payload.get("specialty"))
    or (payload.get("services") or [None])[0]
  )
  project_status = normalize_marketplace_project_status(payload.get("marketplaceProjectStatus") or payload.get("plotStatus"))
  listing_status = normalize_marketplace_listing_status(payload.get("marketplaceListingStatus") or payload.get("status"))
  budget_range = normalize_marketplace_budget_range(
    (payload.get("marketplaceBudgetRange") or {}).get("label")
    or payload.get("budget")
    or payload.get("startingPrice")
  )
  desired_timeframe = normalize_marketplace_desired_timeframe(
    (payload.get("marketplaceDesiredTimeframe") or {}).get("label")
    or payload.get("timeline")
    or payload.get("startDate")
    or payload.get("deliveryRange")
  )
  photo_references = create_marketplace_photo_references(payload.get("attachments"))
  marketplace_meta = deepcopy(payload.get("marketplaceMeta") or {})
  latest_bids = marketplace_meta.get("latestBids") if isinstance(marketplace_meta.get("latestBids"), list) else []
  bid_count = marketplace_meta.get("bidCount")

  try:
    bid_count = int(bid_count) if bid_count is not None else len(latest_bids)
  except (TypeError, ValueError):
    bid_count = len(latest_bids)

  normalized_payload = dict(payload)
  normalized_payload["marketplaceMeta"] = {
    "schemaVersion": 1,
    "category": category,
    "subcategory": subcategory if _slugify_value(subcategory) != category else "",
    "location": location,
    "budgetRange": budget_range,
    "desiredTimeframe": desired_timeframe,
    "projectStatus": project_status,
    "listingStatus": listing_status,
    "photoReferences": photo_references,
    "latestBids": latest_bids[:BID_PREVIEW_LIMIT],
    "bidCount": bid_count,
    "developerProfileReference": create_developer_profile_reference(
      {
        "userId": payload.get("ownerUserId"),
        "companyName": payload.get("name"),
        "specialties": payload.get("services"),
        "portfolioImages": photo_references,
        "ratingAverage": payload.get("ratingAverage"),
        "ratingCount": payload.get("ratingCount"),
      }
    )
    if listing_type == PROFESSIONAL_LISTING_TYPE
    else None,
  }
  return normalized_payload


def validate_marketplace_bid_payload(payload: dict) -> dict:
  if not isinstance(payload, dict):
    raise ValueError("A bid payload is required.")

  listing_id = _normalize_text(payload.get("listingId"))
  bid_amount = payload.get("bidAmount") if isinstance(payload.get("bidAmount"), dict) else {}
  timeframe = payload.get("estimatedCompletionTimeframe") if isinstance(payload.get("estimatedCompletionTimeframe"), dict) else {}
  bid_amount_label = _normalize_text(bid_amount.get("label") or payload.get("bidAmount"))
  timeframe_label = _normalize_text(timeframe.get("label") or payload.get("estimatedCompletionTimeframe") or payload.get("timeframe"))
  proposal_message = _normalize_text(payload.get("proposalMessage") or payload.get("message"))
  developer_profile_reference = create_developer_profile_reference(
    payload.get("developerProfileReference")
    or {
      "userId": payload.get("developerUserId"),
      "companyName": payload.get("companyName"),
      "specialties": payload.get("specialties"),
      "ratingAverage": payload.get("ratingAverage"),
      "ratingCount": payload.get("ratingCount"),
      "portfolioImages": payload.get("portfolioImages"),
      "portfolioProjects": payload.get("portfolioProjects"),
    }
  )

  if not listing_id or not bid_amount_label or not timeframe_label or not proposal_message or not developer_profile_reference.get("userId"):
    raise ValueError("Listing id, developer reference, bid amount, timeframe, and proposal are required.")

  amount_value = bid_amount.get("amount")
  try:
    amount_value = float(amount_value) if amount_value is not None else None
  except (TypeError, ValueError):
    amount_value = None

  estimated_days = timeframe.get("estimatedDays")
  try:
    estimated_days = int(estimated_days) if estimated_days is not None else None
  except (TypeError, ValueError):
    estimated_days = None

  return {
    "listingId": listing_id,
    "status": normalize_marketplace_bid_status(payload.get("status")),
    "bidAmount": {
      "label": bid_amount_label,
      "currency": _normalize_text(bid_amount.get("currency")) or None,
      "amount": amount_value,
    },
    "estimatedCompletionTimeframe": {
      "label": timeframe_label,
      "estimatedDays": estimated_days,
    },
    "proposalMessage": proposal_message,
    "developerProfileReference": developer_profile_reference,
    "createdAt": _normalize_text(payload.get("createdAt")) or None,
  }
