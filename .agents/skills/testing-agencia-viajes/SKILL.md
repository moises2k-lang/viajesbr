---
name: Testing the agencia-viajes Next.js app
description: How to run end-to-end tests and demos against the local agencia-viajes dev server on Windows, including Chrome, Playwright, and key gotchas.
---

## Quick start

1. Repo root: `C:\Users\Administrator\repos\agencia-viajes`.
2. Start dev server: `npm run dev` (runs on `http://localhost:3000`).
3. Chrome for Testing binary: `C:\devin\chrome\chrome-win64\chrome.exe`.
4. Playwright resolves correctly when the script is placed in the `npx` cache directory (`C:\Users\Administrator\AppData\Local\npm-cache\_npx\e41f203b7505f1fb\`).

## Devin secrets needed

- `DUFFEL_API_TOKEN`
- `LITEAPI_API_KEY`
- `DATABASE_URL`
- `ADMIN_USUARIO` / `ADMIN_CONTRASENA` (only if testing protected `/admin` or `/api` routes)

## Test data

- Passenger: `Juan Perez`, `juan@example.com`, `+52 1234567890`, DOB `1990-01-01`.
- Hotel booking: `ACC_CREDIT_CARD`.

## Key API behaviors

- `POST /api/itinerarios` returns **201** (not 200) on success. Test scripts must accept any 2xx response.
- `/api/itinerarios/{id}/pdf` streams a PDF after an itinerary is saved.
- Hotel booking via LiteAPI is sandbox; offerIds can expire, so a fresh search may be needed.

## Known UI/testing pitfalls

- `LanguageSwitcher` hydration mismatch was fixed by initializing `I18nProvider` with `DEFAULT_LOCALE` and letting `useEffect` sync the detected locale after hydration.
- `FormularioReserva` and `FormularioReservaHotel` use `t("form.saveQuote")`; `form.saveQuote` now exists in `src/lib/i18n.ts` for `es`, `en` and `fr`.
- The flight package search mode must be in “Tarifas completas” before clicking `Elegir`; otherwise Playwright may click the mode toggle instead of an offer.

## Recommended golden-path flow

1. Language switcher (en/es/fr) with flag check.
2. Flight round-trip `MEX → CUN` → select offer → scroll to passenger form → save quote → verify PDF.
3. Hotel `Cancún`, 1 adult → choose room → complete LiteAPI reservation → verify `bookingId`.
4. Package `MEX → CUN` round trip → choose flight → choose hotel → combined total → save quote.
