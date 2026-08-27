# Open-Meteo (weather context)

Optional mood hint on **Tonight** planner. No API key.

## Behaviour

- User must opt in (checkbox) and grant browser location
- `GET /api/weather?lat=&lon=` proxies Open-Meteo current conditions
- Soft mood copy only — **never** changes rankings or recommendations
- Preference: `localStorage` key `animenexus.weather-context.v1`

## Code

- `lib/providers/open-meteo.ts`
- `components/WeatherContextHint.tsx`
- `app/tools/tonight/page.tsx`
