# Apple App Review Response — Guideline 2.1

---

## 2. App Purpose / Description

Yapply is a construction marketplace app designed for the Turkish market. It connects property owners (clients) who need construction, renovation, or landscaping work with qualified construction professionals (developers). Clients post detailed project briefs specifying scope, budget, location, timeline, and project status. Professionals browse these briefs and submit competitive bids. The platform enables transparent comparison of bids and facilitates direct communication between clients and professionals. The app supports both Turkish and English languages.

---

## 3. Demo / Test Credentials

**Client Account (to browse marketplace and post listings):**
- Email: testclient@yapply.com
- Password: TestClient2026!

**Developer/Professional Account (to browse marketplace and submit bids):**
- Email: testdeveloper@yapply.com
- Password: TestDeveloper2026!

Both accounts are pre-verified and ready to use. The client account can create project listings, view bids, and manage listings. The developer account can browse client listings, submit bids, and manage a professional profile.

---

## 4. External Services

Yapply uses the following external services:

- **Supabase** (supabase.com): Backend-as-a-service providing PostgreSQL database, user authentication (email/password), and real-time data sync. All user data, listings, bids, and profiles are stored securely in Supabase.
- **Vercel** (vercel.com): Web hosting for the companion website (yapplytr.com) and serverless API endpoints.
- **OpenStreetMap Nominatim** (nominatim.openstreetmap.org): Free reverse geocoding API used solely for auto-detecting the user's city to pre-filter marketplace listings by location. No personal data is sent beyond latitude/longitude coordinates.
- **Apple Push Notification Service (APNs)**: Used via @capacitor/push-notifications for sending bid notifications and listing updates to users.

No paid third-party SDKs, analytics tools, or advertising frameworks are used.

---

## 5. Regional Features / Differences

Yapply is specifically designed for the Turkish construction market. Key regional features include:

- **Turkish city filter**: The marketplace includes a location filter with all 81 Turkish cities (provinces), allowing users to find construction projects in their area.
- **Location auto-detection**: On first visit to the marketplace, the app requests location permission to automatically filter listings by the user's nearest city in Turkey.
- **Bilingual support**: Full Turkish and English language support throughout the app, togglable from the Settings page. Default language is Turkish.
- **Turkish Lira (TL) currency**: All bid amounts and budget ranges are displayed in Turkish Lira.
- **Turkish construction categories**: Project categories are tailored to the Turkish construction industry (e.g., villa construction, pool renovation, landscaping, facade work).

The app is intended for users in Turkey and does not have region-specific restrictions or differences for other countries.

---

## 6. Regulated Industry / Content Moderation

Yapply operates in the construction services marketplace sector. While construction services in Turkey are subject to local regulations and permits, the app itself serves as a listing and bidding platform and does not directly facilitate licensed construction activities.

**Content moderation and user safety measures include:**

- **Report/Block mechanism**: Every listing detail page includes a "Report this listing" button. Users can submit a reason for reporting, which is stored in a moderated reports database and reviewed by the Yapply team at yapplytr@gmail.com.
- **Account deletion**: Users can permanently delete their accounts from the Settings page. This removes all associated data including listings, bids, and profile information.
- **Listing moderation**: Listing owners can deactivate their own listings. The Yapply team reviews reported content and can remove inappropriate listings.
- **Authenticated access**: Only authenticated users can post listings, submit bids, or report content. Guest users can browse the marketplace but cannot interact.

Privacy policy is available at: https://yapplytr.com/privacy.html
