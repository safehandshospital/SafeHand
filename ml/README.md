# Future ML — Random Forest + TensorFlow.js

This folder is intentionally a **stub for Phase 6**.

## Planned work

1. Generate / export historical booking features from Postgres (`department`, hour, weekday, prior load).
2. Train **Random Forest Regression** with Python + scikit-learn.
3. Evaluate with **MAE** and **R²** (academic report metrics).
4. Export for browser inference via **TensorFlow.js** *or* **m2cgen** JS (resolve RF↔TF.js mismatch at implementation time).
5. Serve client-side demand scores alongside / instead of OpenAI narratives.

## v1 behavior (current)

- Demand signals use server-side heuristics (`server/src/services/demand.ts`).
- OpenAI (`gpt-4o-mini`) provides slot recommendations, assistant chat, and staff outlook when `OPENAI_API_KEY` is set.
- Heuristic fallbacks keep the product usable without an API key.

## Suggested layout (when activated)

```text
ml/
  README.md          # this file
  requirements.txt   # scikit-learn, pandas, joblib, …
  data/              # simulated / exported CSVs
  train_rf.py        # train + MAE/R² report
  export_browser.py  # TF.js or m2cgen export
  models/            # artifacts (gitignored binaries)
```

Do not train custom models in v1 — keep OpenAI + heuristics as the production path until proposal requirements lock Phase 6.
