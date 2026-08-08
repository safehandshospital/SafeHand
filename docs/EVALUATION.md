# Evaluation metrics (Phase 5)

Staff-only endpoint: `GET /api/metrics/evaluation`

| Metric | Meaning |
|--------|---------|
| `bookingCompletionActive` | Count of currently `BOOKED` appointments |
| `cancellations` | Cancelled appointments |
| `aiRecommendationAcceptance` | Bookings flagged `aiRecommended` |
| `slotFillRatio` | Aggregate booked / capacity |
| `slotDistributionVariance` | Variance of mean fill across hour buckets (lower ≈ more balanced) |
| `aiCallSuccessRate` | Recent OpenAI call success ratio |
| `notes.maeR2` | Placeholder for Phase 6 Random Forest MAE / R² |

Unit tests: `server/src/services/demand.test.ts` (heuristic demand scoring).

Usability checklist (manual):

- [ ] Phone: tabs + book flow
- [ ] Tablet: department list + detail pane
- [ ] Desktop: sidebar navigation
- [ ] Assistant fallback without OpenAI key
- [ ] Staff admin outlook + metrics
