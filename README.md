# PreDict-Chef

A responsive four-page frontend prototype for Team Amaterasu’s USM pitch. Built on the existing React/Vite starter. No backend or credentials required.

## Run locally

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. `npm run build` creates the production bundle; `npm run preview` previews it. `npm test` checks calculation consistency; `npm run lint` checks source quality.

## Pitch demo (about 90 seconds)

1. **Overview:** introduce the kitchen and 230-portion Saturday baseline.
2. **Demand Insights:** switch to rain (184 portions), then the campus festival (300 portions). Explain these are deterministic mock scenarios, not live AI.
3. **Smart Prep Sheet:** adjust the 0–30% confidence buffer, override a dish, and approve. Change a quantity to demonstrate that approval is invalidated. Export a CSV of the current plan.
4. **Impact Dashboard:** show simulated waste prevented, Ringgit cost avoided and forecast accuracy. Change between three and five completed services.

## Data and assumptions

- All forecasts, sales, external conditions, integrations and impact metrics are explicitly simulated. No POS, weather, event or AI services are connected.
- Four menu baselines total 230 portions. Rain multiplies dish demand by 0.8; festival by 1.3. Each dish forecast rounds to the nearest whole portion, so festival totals 300 rather than the unrounded 299. Safety portions round up after the buffer is applied.
- Chef overrides accept whole numbers from 0–999. Overrides take precedence over suggested portions. Buffer changes preserve overrides but invalidate approval; scenario changes clear overrides and approval.
- State survives navigation in the current session but resets on reload. Approval is a demonstration only and sends no kitchen order. Hash links support direct navigation and browser back/forward.
- Historical impact is independent of today's unserved plan. Five completed services total 108 kg baseline waste and 60 kg demo waste: 48 kg avoided, valued at an illustrative RM18/kg = RM864. Three services show 31 kg / RM558.
- Forecast accuracy = 100 × (1 − sum absolute forecast error / sum actual sales), using the same completed-service rows shown in Demand Insights. Five services: 95.3%. This is illustrative weighted absolute percentage accuracy, not measured model performance.
- Avoided cost is not verified profit, subscription-adjusted savings or proven causal impact. SDG 12.3 alignment describes the intended contribution.
- Fonts optionally load from Google Fonts; system sans-serif fallbacks keep the app usable offline.

## Requirements provenance

Implemented from the current four-page request and recovered `Pitch Deck 2026 USM.docx`, including both initial and Grand Final scripts. The archived conversation returned reference markers instead of the earlier assistant implementation plan; its exact text could not be recovered.

## Validation

Automated calculation tests, production build and lint pass. Browser review verified page rendering, chef override, approval and invalidation after buffer changes. Responsive CSS covers desktop, tablet and mobile; exhaustive automated viewport testing was unavailable in this environment.
