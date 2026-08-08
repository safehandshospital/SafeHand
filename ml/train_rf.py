"""
Phase 6 stub — Random Forest demand training.

When activated:
  1. Export booking history from Postgres into data/history.csv
  2. Train RandomForestRegressor on features (dept, hour, weekday, prior_load)
  3. Report MAE and R²
  4. Export via m2cgen or a TF.js-compatible surrogate
"""

def main() -> None:
    raise SystemExit(
        "Phase 6 deferred. See ml/README.md — v1 uses OpenAI + server heuristics."
    )


if __name__ == "__main__":
    main()
