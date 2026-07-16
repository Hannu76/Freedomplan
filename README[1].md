# My £456 to ₹7L Freedom Plan

A mobile-first personal finance tracker for saving £456/month in the UK
toward a ₹7,00,000 yearly loan pre-payment in India — over 3 years.

## Features

- **Dashboard** — income, expenses, monthly savings target, money left over,
  progress bars, and a signature "UK → India" route visual for the yearly target.
- **Savings Tracker** — a 36-month table (editable "Saved £" per month),
  auto status (✅ Done / ⏳ Pending), running total, % complete, CSV export.
- **Currency Converter** — GBP → INR with an editable exchange rate, and a
  warning if the rate drops below ₹125.
- **Loan Balance Tracker** — starting balance, monthly EMI deduction, a
  ₹7,00,000 pre-payment every December, full 3-year schedule.
- **Reminders & Notes** — "did you transfer this month?" checkbox, free-form
  notes (fees / rate used), and a countdown to the next Dec 31 payment.
- Dark / light mode, all data saved to `localStorage` (nothing leaves your browser).

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Configuration

All the numbers from the plan live in one place: **`src/config.js`**.
Edit `PLAN`, `LOAN`, or `CURRENCY` there if your income, expenses, EMI,
or target ever change — nothing else in the app hardcodes these values.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import** your repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` — Vercel fills these in automatically.
4. Deploy. That's it — no environment variables needed.

Or, from the command line:

```bash
npm i -g vercel
vercel
```

## Notes on data storage

All entries (monthly savings, transfer checkboxes, notes, your chosen
exchange rate, dark mode preference) are stored in your browser's
`localStorage` under keys prefixed `freedomPlan.*`. Clearing your browser
data will reset the tracker. There is no backend and no data is sent
anywhere.
