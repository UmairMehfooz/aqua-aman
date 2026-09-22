# Aqua Aman — Water Delivery Management

Back-office and driver software for a 19L bottled-water plant. Built on **Payload CMS 3** + **Next.js 15** + **MongoDB**. Forked from [Furqankhanzada/water-plant](https://github.com/Furqankhanzada/water-plant) and extended for Aqua Aman.

## What it does

| Area | Features |
|---|---|
| **Customers** | Profiles, Area → Block zoning, per-bottle rate, security deposit, bottles at home, preferred delivery days, WhatsApp numbers (auto-formatted to `+92`). |
| **Trips** | Create a trip for areas/blocks/day; the system predicts who is about to run out (30-day consumption × Karachi seasonal curve) and auto-adds those customers as stops, tagged URGENT/HIGH/MEDIUM/LOW. Printable PDF with QR code. |
| **Driver App** ⭐ | Each trip has a private link (`/driver/<token>`). The driver opens it on a phone, sees stops grouped by block, taps **+/−** for bottles given/taken, enters cash collected and a note, and marks the stop **Delivered** or **Skip**. Cash is posted automatically as a payment on the customer's latest invoice. "Finish trip" completes the trip. |
| **Transactions** | Every delivery: bottles given/taken, running "bottles at home", amount, paid/unpaid status, driver delivery status. |
| **Sales** | Counter / walk-in sales with a product catalogue, discounts and tax. |
| **Invoices** | Monthly invoice generator; carries forward previous balance, adds lost-bottle charges, tracks cash/online payments, auto-sets paid / partially-paid / unpaid. PDF with company bank details + QR. Send via WhatsApp (needs bridge). |
| **Expenses & Reports** | 18 expense categories, monthly reports, profit. |
| **Dashboard** | Performance overview (revenue, collections by area, expenses, profit, bottles delivered) and **Bottle Inventory** (bottles at customers, out on trips, still on the truck, lost). |
| **Communication** | Delivery Requests and inbound Messages collections. |

## Requirements

- Node.js 20+ (tested on 24)
- pnpm 10 (`npm i -g pnpm`)
- MongoDB 6+ — any of:
  - **Local install** (recommended on Windows): `winget install MongoDB.Server` → runs as a Windows service on port 27017
  - **Docker**: `docker run -d --name aqua-aman-mongo -p 27017:27017 -v aqua-aman-mongo-data:/data/db mongo:7`
  - **MongoDB Atlas** free tier (cloud)

## Setup

```bash
pnpm install
cp .env.example .env      # then edit .env
pnpm dev
```

Open <http://localhost:3000/admin> and create the first user. **Set the role to Admin** — only admins can delete records and manage users.

Suggested order on first run:

1. **Globals → Company** — name, address, contact numbers, bank accounts (printed on invoices).
2. **Customers → Areas**, then **Blocks**.
3. **Customers** — with rate, bottles at home, preferred delivery days, WhatsApp number.
4. **Team → Employees** (drivers).
5. **Operations → Trips → Create** — pick areas, date, driver, bottles loaded. Stops are generated automatically.
6. Open the trip → **Driver App → Share on WhatsApp** to send the link to the driver.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URI` | ✅ | MongoDB connection string |
| `PAYLOAD_SECRET` | ✅ | Long random string for signing auth tokens |
| `URL` | ✅ | Public base URL, used in Driver App links and PDF QR codes |
| `UPLOADTHING_TOKEN` | optional | File storage for the company logo / media |
| `FROM_NAME`, `FROM_EMAIL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | optional | Email delivery receipts |
| `NEXT_PUBLIC_WHATSAPP_API_URL` | optional | Base URL of a WhatsApp bridge service (not included) exposing `/clients/:id/send-message` |

Without SMTP you will see a harmless `Error verifying Nodemailer transport` at startup.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server on :3000 |
| `pnpm build && pnpm start` | Production build / server |
| `pnpm payload invoices` | Generate last month's invoices for all customers |
| `pnpm payload send-pending-invoices` | Push unsent invoices over WhatsApp |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after changing a collection |
| `pnpm generate:importmap` | Regenerate the admin import map after adding admin components |
| `pnpm test:int` / `pnpm test:e2e` | Vitest / Playwright |

## Driver App

- Link: `<URL>/driver/<driverToken>` — the token is generated when a trip is saved. Find it on the trip's edit page (**Driver App** field) or the **Driver App** column in the trips list.
- Anyone with the link can record deliveries for that trip, so share it only with the driver. Regenerate by clearing `driverToken` via the API if a link leaks.
- Editing is locked once the trip is **Complete**.
- Cash entered by the driver is added as a `cash` payment on the customer's **latest** invoice (only the increase since the previous save). If the customer has no invoice yet, the amount stays on the transaction for the office to reconcile.
- Completing a trip removes untouched placeholder stops (0 given / 0 taken), including skipped ones — that is the existing trip behaviour.

## Project structure

```
src/
├── app/(frontend)/            Public site + Driver App (/driver/[token])
├── app/(payload)/             Admin panel & REST/GraphQL API
├── app/invoices, app/trips    PDF routes
├── collections/               Payload collections (Customers, Trips, Transactions, Invoices…)
├── components/                Admin UI components & dashboard cards
├── hooks/                     Collection hooks (business rules)
├── services/                  Delivery prediction, WhatsApp client
├── tasks/                     Cron jobs (email, WhatsApp invoices, dashboard refresh)
└── scripts/, bin/             Invoice generation CLI
```

## License

MIT (inherited from the original project).
