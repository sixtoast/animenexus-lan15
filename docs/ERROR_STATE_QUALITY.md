# Error state quality (Creative Sprint 46)

## Kinds

| Kind | Tone | Recovery |
|------|------|----------|
| `network` | Connection failed | Retry |
| `rate_limit` | Provider throttle | Wait + retry |
| `auth` | Sign-in / token | Account / re-auth |
| `empty` | No results | Adjust filters |
| `unsupported` | Feature gated | Use alternate path |
| `media` | Image/video failed | Continue without media |
| `generic` | Unknown | Retry if possible |

## Rules

1. Serious, helpful — not cute.
2. Warning SFX (`error` cue) only for real failures when sound is on — not for empty search.
3. OutcomeMark error tone for failures; empty uses SignalEmpty elsewhere.
4. Always offer a recovery action when one exists.

## API

```ts
classifySignalError(raw)
SignalError({ kind, onRetry, ... })
```
