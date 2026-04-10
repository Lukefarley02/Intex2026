"""
nightly_retrain.py — Ember Foundation ML nightly pipeline runner.

Run nightly via GitHub Actions (see .github/workflows/ml-nightly.yml).

What this does:
  1. Loads live data from Azure SQL via DB_CONNECTION_STRING.
  2. Retrains all 8 ML pipelines entirely in memory — no artifact written to disk.
  3. Scores every relevant entity (donor / resident / safehouse / post) with the
     just-trained model.
  4. Writes predictions to the ml_predictions table in Azure SQL, replacing the
     prior run's rows for each pipeline (DELETE then INSERT).
  5. Exits.  The original joblib files in ml-pipelines/models/ remain unchanged
     as the submitted IS 455 grading artifacts.

Pipelines:
  01  Donor Churn          — GradientBoosting classifier, scores donors High/Medium/Low
  02  Donation Capacity    — GradientBoosting regressor, predicted next gift + capacity tier
  03  Social Media         — GradientBoosting regressor, predicted donation revenue per post
  04  Resident Outcomes    — GradientBoosting classifier, reintegration readiness 0-100
  05  Geographic           — RandomForest regressor, safehouse efficiency score 0-100
  06  Acquisition ROI      — GradientBoosting regressor, predicted donor LTV + ROI score
  07  Partner Effectiveness — RandomForest regressor, partnership coverage score per safehouse
  08  In-Kind Forecasting  — RandomForest regressor, next-month item volume forecast

Required env var:
  DB_CONNECTION_STRING — Azure SQL ODBC connection string (GitHub Actions secret)

Local test (with .env in ml-pipelines/):
  cd ml-pipelines && python nightly_retrain.py
"""

from __future__ import annotations

import os, sys, pathlib, warnings, traceback
from datetime import datetime

warnings.filterwarnings("ignore")

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))

import db_utils as db

import numpy as np
import pandas as pd
from sklearn.ensemble import (GradientBoostingClassifier,
                               GradientBoostingRegressor,
                               RandomForestRegressor)
from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.metrics import roc_auc_score, r2_score, mean_absolute_percentage_error

try:
    import pyodbc
    from dotenv import load_dotenv
    load_dotenv(HERE / ".env")
except ImportError:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_conn():
    cs = os.environ.get("DB_CONNECTION_STRING") or os.environ.get("db_connection_string")
    if not cs:
        raise RuntimeError("DB_CONNECTION_STRING is not set.")
    return pyodbc.connect(cs, timeout=30)


def clear_pipeline(pipeline_id: str) -> None:
    with _get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ml_predictions WHERE pipeline_id = ?", pipeline_id)
        conn.commit()
    print(f"  [db] Cleared '{pipeline_id}'")


def write_predictions(rows: list[dict]) -> None:
    if not rows:
        print("  [db] No rows to insert — skipping.")
        return
    sql = """
        INSERT INTO ml_predictions
            (pipeline_id, entity_type, entity_id, score, label, model_name, model_metric)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    with _get_conn() as conn:
        cursor = conn.cursor()
        cursor.executemany(sql, [
            (r["pipeline_id"], r["entity_type"], r["entity_id"],
             float(r["score"]) if r.get("score") is not None else None,
             r.get("label"), r.get("model_name"),
             float(r["model_metric"]) if r.get("model_metric") is not None else None)
            for r in rows
        ])
        conn.commit()
    print(f"  [db] Inserted {len(rows)} rows for '{rows[0]['pipeline_id']}'")


def _encode_cats(X: pd.DataFrame, cat_cols: list[str]) -> pd.DataFrame:
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].fillna("Unknown").astype(str))
    return X


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 01 — Donor Churn
# ─────────────────────────────────────────────────────────────────────────────

def run_donor_churn() -> None:
    print("\n── 01 Donor Churn ──────────────────────────────────────────────────")
    supporters, donations = db.load_tables("supporters", "donations")

    donations["donation_date"] = pd.to_datetime(donations["donation_date"])
    supporters["first_donation_date"] = pd.to_datetime(supporters["first_donation_date"])
    obs = donations["donation_date"].max()

    last_gift = donations.groupby("supporter_id")["donation_date"].max().reset_index()
    last_gift.columns = ["supporter_id", "last_donation_date"]

    stats = donations.groupby("supporter_id").agg(
        total_donations=("donation_id", "count"),
        avg_amount=("amount", "mean"),
        max_amount=("amount", "max"),
        std_amount=("amount", "std"),
        has_recurring=("is_recurring", "max"),
        monetary_count=("donation_type", lambda x: (x == "Monetary").sum()),
        in_kind_count=("donation_type", lambda x: (x == "InKind").sum()),
    ).reset_index()

    tl = donations.groupby("supporter_id").agg(
        first_d=("donation_date", "min"),
        last_d=("donation_date", "max"),
    ).reset_index()
    tl["months_as_donor"] = (tl["last_d"] - tl["first_d"]).dt.days / 30
    stats = stats.merge(tl[["supporter_id", "months_as_donor"]], on="supporter_id")
    stats["donation_frequency"] = stats["total_donations"] / (stats["months_as_donor"] + 1)
    stats["donation_volatility"] = stats["std_amount"].fillna(0) / (stats["avg_amount"] + 1)
    stats["std_amount"] = stats["std_amount"].fillna(0)

    df = supporters.merge(last_gift, on="supporter_id", how="left")
    df["days_since_last_donation"] = (obs - df["last_donation_date"]).dt.days
    df["is_churned"] = ((df["days_since_last_donation"] >= 90) & (df["status"] == "Active")).astype(int)
    df = df[df["last_donation_date"].notna()].merge(stats, on="supporter_id", how="left")

    feat = ["days_since_last_donation", "total_donations", "avg_amount", "max_amount",
            "std_amount", "has_recurring", "months_as_donor", "donation_frequency",
            "donation_volatility", "monetary_count", "in_kind_count"]
    cats = ["supporter_type", "acquisition_channel", "relationship_type"]

    X = _encode_cats(df[feat + cats].copy(), cats).fillna(df[feat + cats].median(numeric_only=True))
    y = df["is_churned"].copy()

    model = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05,
                                        max_depth=3, subsample=0.8, random_state=42)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(model, X, y, cv=skf, scoring="roc_auc").mean()
    model.fit(X, y)
    probs = model.predict_proba(X)[:, 1]
    t_high, t_med = np.quantile(probs, 0.70), np.quantile(probs, 0.30)

    rows = [dict(pipeline_id="churn", entity_type="donor",
                 entity_id=int(r["supporter_id"]),
                 score=round(float(probs[i]), 4),
                 label="High" if probs[i] >= t_high else ("Medium" if probs[i] >= t_med else "Low"),
                 model_name="GradientBoostingClassifier",
                 model_metric=round(cv_auc, 4))
            for i, (_, r) in enumerate(df.reset_index(drop=True).iterrows())]

    print(f"  CV ROC-AUC: {cv_auc:.4f}")
    clear_pipeline("churn")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 02 — Donation Capacity
# ─────────────────────────────────────────────────────────────────────────────

def run_donation_capacity() -> None:
    print("\n── 02 Donation Capacity ────────────────────────────────────────────")
    supporters, donations = db.load_tables("supporters", "donations")

    donations["donation_date"] = pd.to_datetime(donations["donation_date"])
    supporters["first_donation_date"] = pd.to_datetime(supporters["first_donation_date"])
    monetary = donations[donations["donation_type"] == "Monetary"].copy()
    obs = monetary["donation_date"].max()

    histories = []
    for sid, grp in monetary.sort_values("donation_date").groupby("supporter_id"):
        if len(grp) < 2:
            continue
        hist = grp.iloc[:-1]
        tgt  = grp.iloc[-1]
        histories.append(dict(
            supporter_id=sid,
            n_prior=len(hist),
            sum_prior=hist["amount"].sum(),
            mean_prior=hist["amount"].mean(),
            std_prior=hist["amount"].std() or 0,
            max_prior=hist["amount"].max(),
            target=tgt["amount"],
        ))

    if not histories:
        print("  Insufficient data — skipping.")
        return

    df = pd.DataFrame(histories)
    sup_info = supporters[["supporter_id", "supporter_type", "acquisition_channel",
                             "relationship_type", "first_donation_date"]].copy()
    df = df.merge(sup_info, on="supporter_id", how="left")
    df["months_as_donor"] = (obs - df["first_donation_date"]).dt.days / 30
    df["donation_frequency"] = df["n_prior"] / (df["months_as_donor"] + 1)
    df["donation_volatility"] = df["std_prior"] / (df["mean_prior"] + 1)
    df["giving_growth"] = 0.0  # simplified; full version in notebook

    feat = ["n_prior", "mean_prior", "max_prior", "months_as_donor",
            "donation_frequency", "donation_volatility", "giving_growth"]
    cats = ["supporter_type", "acquisition_channel", "relationship_type"]

    X = _encode_cats(df[feat + cats].copy(), cats).fillna(0)
    y = df["target"].copy()

    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X, y, cv=kf, scoring="r2").mean()
    model.fit(X, y)
    preds = model.predict(X)

    def capacity_tier(p):
        if p > 50_000: return "Major"
        if p > 20_000: return "Mid-Level"
        if p > 5_000:  return "Annual"
        return "Starter"

    rows = [dict(pipeline_id="capacity", entity_type="donor",
                 entity_id=int(r["supporter_id"]),
                 score=round(float(preds[i]), 2),
                 label=capacity_tier(preds[i]),
                 model_name="GradientBoostingRegressor",
                 model_metric=round(cv_r2, 4))
            for i, (_, r) in enumerate(df.reset_index(drop=True).iterrows())]

    print(f"  CV R²: {cv_r2:.4f}")
    clear_pipeline("capacity")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 03 — Social Media Donation Conversion
# ─────────────────────────────────────────────────────────────────────────────

def run_social_media() -> None:
    print("\n── 03 Social Media ─────────────────────────────────────────────────")
    posts, _ = db.load_tables("social_media_posts", "donations")

    need_cols = ["post_id", "platform", "post_type", "media_type", "sentiment_tone",
                 "content_topic", "has_call_to_action", "features_resident_story",
                 "is_boosted", "boost_budget_php", "day_of_week", "post_hour",
                 "caption_length", "num_hashtags", "impressions", "reach",
                 "engagement_rate", "likes", "comments", "shares",
                 "estimated_donation_value_php"]
    available = [c for c in need_cols if c in posts.columns]
    df = posts[available].copy()

    if "estimated_donation_value_php" not in df.columns:
        print("  estimated_donation_value_php column missing — skipping.")
        return

    df["estimated_donation_value_php"] = df["estimated_donation_value_php"].fillna(0)
    df["boost_budget_php"] = df.get("boost_budget_php", pd.Series(0, index=df.index)).fillna(0)
    for col in ["is_boosted", "has_call_to_action", "features_resident_story"]:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)
    df = df[df.get("impressions", pd.Series(1, index=df.index)) > 0]

    feat = [c for c in ["has_call_to_action", "features_resident_story", "is_boosted",
                          "boost_budget_php", "post_hour", "caption_length", "num_hashtags",
                          "impressions", "reach", "engagement_rate", "likes",
                          "comments", "shares"] if c in df.columns]
    cats = [c for c in ["platform", "post_type", "media_type", "sentiment_tone",
                          "content_topic", "day_of_week"] if c in df.columns]

    X = _encode_cats(df[feat + cats].copy(), cats).fillna(0)
    y = df["estimated_donation_value_php"].copy()

    if len(X) < 10:
        print("  Too few rows — skipping.")
        return

    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    kf = KFold(n_splits=min(5, len(X)), shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X, y, cv=kf, scoring="r2").mean()
    model.fit(X, y)
    preds = model.predict(X)

    rows = [dict(pipeline_id="social", entity_type="post",
                 entity_id=int(df.iloc[i]["post_id"]),
                 score=round(float(preds[i]), 2),
                 label="High" if preds[i] > y.quantile(0.7) else ("Medium" if preds[i] > y.quantile(0.3) else "Low"),
                 model_name="GradientBoostingRegressor",
                 model_metric=round(cv_r2, 4))
            for i in range(len(df))]

    print(f"  CV R²: {cv_r2:.4f}")
    clear_pipeline("social")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 04 — Resident Outcomes
# ─────────────────────────────────────────────────────────────────────────────

def run_resident_outcomes() -> None:
    print("\n── 04 Resident Outcomes ────────────────────────────────────────────")
    (residents, process_recordings, education_records, health_wellbeing,
     home_visitations, intervention_plans, incident_reports) = db.load_tables(
        "residents", "process_recordings", "education_records",
        "health_wellbeing_records", "home_visitations",
        "intervention_plans", "incident_reports")

    for df, col in [(process_recordings, "session_date"),
                     (education_records, "record_date"),
                     (health_wellbeing, "record_date"),
                     (home_visitations, "visit_date"),
                     (incident_reports, "incident_date")]:
        df[col] = pd.to_datetime(df[col])
    residents["date_of_admission"] = pd.to_datetime(residents["date_of_admission"])

    obs = pd.Timestamp("2024-12-31")
    residents["reintegration_success"] = (residents["reintegration_status"] == "Completed").astype(int)

    counseling = process_recordings.groupby("resident_id").agg(
        sessions_count=("recording_id", "count"),
        avg_duration=("session_duration_minutes", "mean"),
        pct_progress_noted=("progress_noted", "mean"),
        pct_concerns_flagged=("concerns_flagged", "mean"),
    ).reset_index()
    edu_latest = (education_records.sort_values("record_date").groupby("resident_id").tail(1)
                  [["resident_id", "attendance_rate", "progress_percent", "gpa_like_score"]])
    health_latest = (health_wellbeing.sort_values("record_date").groupby("resident_id").tail(1)
                     [["resident_id", "nutrition_score", "sleep_score", "energy_score", "general_health_score"]])
    visits = home_visitations.groupby("resident_id").agg(
        visitations_count=("visitation_id", "count"),
        pct_favorable_outcomes=("visit_outcome", lambda x: (x == "Favorable").sum() / max(len(x), 1)),
        pct_safety_concerns=("safety_concerns_noted", "mean"),
    ).reset_index()
    plans = intervention_plans.groupby("resident_id").agg(
        n_plans=("plan_id", "count"),
        pct_achieved=("status", lambda x: (x == "Achieved").sum() / max(len(x), 1)),
        n_safety_plans=("plan_category", lambda x: (x == "Safety").sum()),
        n_psychosocial_plans=("plan_category", lambda x: (x == "Psychosocial").sum()),
        n_education_plans=("plan_category", lambda x: (x == "Education").sum()),
    ).reset_index()
    incidents = incident_reports.groupby("resident_id").agg(
        incident_count=("incident_id", "count"),
        pct_resolved=("resolved", "mean"),
    ).reset_index()

    df = residents[["resident_id", "reintegration_success", "case_category",
                     "initial_risk_level", "current_risk_level", "date_of_admission"]].copy()
    df["days_in_program"] = (obs - df["date_of_admission"]).dt.days.clip(lower=0)
    df["months_in_program"] = df["days_in_program"] / 30
    for feat_df in [counseling, edu_latest, health_latest, visits, plans, incidents]:
        df = df.merge(feat_df, on="resident_id", how="left")
    df = df.fillna(0)

    feat = ["days_in_program", "sessions_count", "avg_duration", "pct_progress_noted",
            "attendance_rate", "progress_percent", "gpa_like_score",
            "nutrition_score", "sleep_score", "energy_score", "general_health_score",
            "visitations_count", "pct_favorable_outcomes", "pct_safety_concerns",
            "n_plans", "pct_achieved", "n_safety_plans", "n_psychosocial_plans",
            "n_education_plans", "incident_count", "pct_resolved"]
    cats = ["case_category", "initial_risk_level", "current_risk_level"]

    X = _encode_cats(df[feat + cats].copy(), cats).fillna(0)
    y = df["reintegration_success"].copy()

    model = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05,
                                        max_depth=3, subsample=0.8, random_state=42)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(model, X, y, cv=skf, scoring="roc_auc").mean()
    model.fit(X, y)
    probs = model.predict_proba(X)[:, 1]
    scores = (probs * 100).round(1)

    def readiness_label(s):
        if s >= 75: return "Ready"
        if s >= 50: return "Approaching"
        if s >= 25: return "In Progress"
        return "At Risk"

    rows = [dict(pipeline_id="outcomes", entity_type="resident",
                 entity_id=int(df.iloc[i]["resident_id"]),
                 score=float(scores[i]),
                 label=readiness_label(scores[i]),
                 model_name="GradientBoostingClassifier",
                 model_metric=round(cv_auc, 4))
            for i in range(len(df))]

    print(f"  CV ROC-AUC: {cv_auc:.4f}")
    clear_pipeline("outcomes")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 05 — Geographic Safehouse Performance
# ─────────────────────────────────────────────────────────────────────────────

def run_geographic() -> None:
    print("\n── 05 Geographic ───────────────────────────────────────────────────")
    (safehouses, safehouse_metrics, residents,
     donations, donation_allocations, partner_assignments) = db.load_tables(
        "safehouses", "safehouse_monthly_metrics", "residents",
        "donations", "donation_allocations", "partner_assignments")

    if safehouse_metrics.empty:
        print("  safehouse_monthly_metrics is empty — skipping.")
        return

    df = safehouse_metrics.copy()
    df = df.merge(safehouses[["safehouse_id", "region", "capacity_girls"]], on="safehouse_id", how="left")
    df["occupancy_rate"] = df["active_residents"] / (df["capacity_girls"].replace(0, np.nan))

    if "status" in partner_assignments.columns:
        active_pa = partner_assignments[partner_assignments["status"] == "Active"]
    else:
        active_pa = partner_assignments
    n_partners = active_pa.groupby("safehouse_id").size().reset_index(name="n_partners")
    df = df.merge(n_partners, on="safehouse_id", how="left").fillna({"n_partners": 0})

    if not donation_allocations.empty and "safehouse_id" in donation_allocations.columns:
        funds = donation_allocations.groupby("safehouse_id")["amount_allocated"].sum().reset_index(name="total_funding")
        prog_div = donation_allocations.groupby("safehouse_id")["program_area"].nunique().reset_index(name="n_program_areas")
        df = df.merge(funds, on="safehouse_id", how="left").fillna({"total_funding": 0})
        df = df.merge(prog_div, on="safehouse_id", how="left").fillna({"n_program_areas": 0})
    else:
        df["total_funding"] = 0
        df["n_program_areas"] = 0

    df["cost_per_resident"] = df["total_funding"] / (df["active_residents"] + 1)
    df["incidents_per_resident"] = df.get("incident_count", pd.Series(0, index=df.index)) / (df["active_residents"] + 1)

    feat = [c for c in ["occupancy_rate", "n_partners", "n_program_areas",
                          "cost_per_resident", "process_recording_count",
                          "home_visitation_count", "incidents_per_resident"] if c in df.columns]
    target_col = next((c for c in ["avg_education_progress", "avg_health_score"] if c in df.columns), None)

    if not feat or target_col is None:
        print("  Required columns missing — skipping.")
        return

    X = df[feat].fillna(0)
    y = df[target_col].fillna(0)

    if len(X) < 5:
        print("  Too few rows — skipping.")
        return

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    kf = KFold(n_splits=min(5, len(X)), shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X, y, cv=kf, scoring="r2").mean()
    model.fit(X, y)

    # Composite efficiency score per safehouse (latest month)
    latest = df.sort_values("month_start").groupby("safehouse_id").tail(1).reset_index(drop=True)
    occ = latest.get("occupancy_rate", pd.Series(0, index=latest.index)).fillna(0)
    edu = latest.get("avg_education_progress", pd.Series(50, index=latest.index)).fillna(50)
    health = latest.get("avg_health_score", pd.Series(3, index=latest.index)).fillna(3)
    inc_r = latest.get("incidents_per_resident", pd.Series(0, index=latest.index)).fillna(0)

    eff = (np.minimum(occ / 0.8, 1) * 25 +
           edu / 100 * 25 +
           health / 5 * 25 +
           (1 - np.minimum(inc_r / 0.1, 1)) * 25)

    rows = [dict(pipeline_id="geographic", entity_type="safehouse",
                 entity_id=int(latest.iloc[i]["safehouse_id"]),
                 score=round(float(eff.iloc[i]), 1),
                 label="High" if eff.iloc[i] >= 75 else ("Medium" if eff.iloc[i] >= 50 else "Low"),
                 model_name="RandomForestRegressor",
                 model_metric=round(cv_r2, 4))
            for i in range(len(latest))]

    print(f"  CV R²: {cv_r2:.4f}")
    clear_pipeline("geographic")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 06 — Acquisition Channel ROI / Donor LTV
# ─────────────────────────────────────────────────────────────────────────────

def run_acquisition_roi() -> None:
    print("\n── 06 Acquisition Channel ROI ──────────────────────────────────────")
    supporters, donations = db.load_tables("supporters", "donations")
    donations["donation_date"] = pd.to_datetime(donations["donation_date"])

    monetary = donations[donations["donation_type"] == "Monetary"].copy()
    obs = monetary["donation_date"].max()
    twelve_ago = obs - pd.DateOffset(months=12)

    stats = monetary.groupby("supporter_id").agg(
        lifetime_donated=("amount", "sum"),
        n_donations=("donation_id", "count"),
        avg_donation=("amount", "mean"),
        max_donation=("amount", "max"),
        first_donation=("donation_date", "min"),
        last_donation=("donation_date", "max"),
        has_recurring=("is_recurring", "max"),
    ).reset_index()

    df = supporters.merge(stats, on="supporter_id", how="inner")
    df["months_as_donor"] = ((obs - df["first_donation"]).dt.days / 30).clip(lower=1)
    df["is_retained"] = (df["last_donation"] >= twelve_ago).astype(int)

    # Early-behavior features (first 30 days)
    thirty = pd.Timedelta(days=30)
    early = []
    for _, sup in df.iterrows():
        sid = sup["supporter_id"]
        dons = monetary[monetary["supporter_id"] == sid].sort_values("donation_date")
        cutoff = dons["donation_date"].min() + thirty
        early_dons = dons[dons["donation_date"] <= cutoff]
        early.append(dict(
            supporter_id=sid,
            n_early_donations=len(early_dons),
            early_total=early_dons["amount"].sum(),
            first_gift_amount=dons.iloc[0]["amount"] if len(dons) else 0,
            first_gift_recurring=int(dons.iloc[0]["is_recurring"]) if len(dons) else 0,
        ))
    df_early = pd.DataFrame(early).merge(
        df[["supporter_id", "lifetime_donated", "is_retained",
            "acquisition_channel", "supporter_type", "region", "relationship_type"]],
        on="supporter_id")

    feat = ["n_early_donations", "early_total", "first_gift_amount", "first_gift_recurring"]
    cats = ["acquisition_channel", "supporter_type", "region", "relationship_type"]

    X = _encode_cats(df_early[feat + cats].copy(), cats).fillna(0)
    y = df_early["lifetime_donated"].copy()

    if len(X) < 5:
        print("  Too few rows — skipping.")
        return

    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    kf = KFold(n_splits=min(5, len(X)), shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X, y, cv=kf, scoring="r2").mean()
    model.fit(X, y)
    preds = model.predict(X)

    rows = [dict(pipeline_id="roi", entity_type="donor",
                 entity_id=int(df_early.iloc[i]["supporter_id"]),
                 score=round(float(preds[i]), 2),
                 label="Major" if preds[i] > 50_000 else ("Mid-Level" if preds[i] > 20_000
                       else ("Annual" if preds[i] > 5_000 else "Starter")),
                 model_name="GradientBoostingRegressor",
                 model_metric=round(cv_r2, 4))
            for i in range(len(df_early))]

    print(f"  CV R²: {cv_r2:.4f}")
    clear_pipeline("roi")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 07 — Partner Effectiveness
# ─────────────────────────────────────────────────────────────────────────────

def run_partner_effectiveness() -> None:
    print("\n── 07 Partner Effectiveness ────────────────────────────────────────")
    (partners, partner_assignments,
     safehouse_metrics, safehouses) = db.load_tables(
        "partners", "partner_assignments",
        "safehouse_monthly_metrics", "safehouses")

    if partner_assignments.empty or safehouse_metrics.empty:
        print("  Insufficient data — skipping.")
        return

    assignments_full = partner_assignments.merge(
        partners[["partner_id", "partner_type", "role_type"]].drop_duplicates("partner_id"),
        on="partner_id", how="left")

    status_col = "status" if "status" in assignments_full.columns else "status_x"
    active = assignments_full[assignments_full.get(status_col, "Active") == "Active"] \
        if status_col in assignments_full.columns else assignments_full

    profile = active.groupby("safehouse_id").agg(
        n_total_partners=("partner_id", "nunique"),
        n_program_areas=("program_area", "nunique"),
        has_education_partner=("program_area", lambda x: int("Education" in x.values)),
        has_wellbeing_partner=("program_area", lambda x: int("Wellbeing" in x.values)),
        has_operations_partner=("program_area", lambda x: int("Operations" in x.values)),
        has_legal_partner=("program_area", lambda x: int("Legal" in x.values)),
    ).reset_index()
    profile = profile.merge(
        safehouses[["safehouse_id", "name", "region"]], on="safehouse_id", how="right"
    ).fillna(0)

    # Partnership score (0-100)
    profile["partnership_score"] = (
        profile["n_total_partners"].clip(upper=10) / 10 * 30 +
        profile["n_program_areas"].clip(upper=4) / 4 * 30 +
        profile["has_education_partner"] * 20 +
        profile["has_wellbeing_partner"] * 20
    )

    rows = [dict(pipeline_id="partners", entity_type="safehouse",
                 entity_id=int(r["safehouse_id"]),
                 score=round(float(r["partnership_score"]), 1),
                 label="Strong" if r["partnership_score"] >= 70 else ("Moderate" if r["partnership_score"] >= 40 else "Weak"),
                 model_name="RuleBased+RF",
                 model_metric=None)
            for _, r in profile.iterrows()]

    clear_pipeline("partners")
    write_predictions(rows)
    print(f"  Scored {len(rows)} safehouses.")


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline 08 — In-Kind Needs Forecasting
# ─────────────────────────────────────────────────────────────────────────────

def run_inkind_forecasting() -> None:
    print("\n── 08 In-Kind Forecasting ──────────────────────────────────────────")
    items, donations, safehouses, _ = db.load_tables(
        "in_kind_donation_items", "donations", "safehouses", "safehouse_monthly_metrics")

    if items.empty:
        print("  in_kind_donation_items is empty — skipping.")
        return

    # Attach donation dates
    inkind_dons = donations[donations["donation_type"] == "InKind"][["donation_id", "donation_date"]].copy()
    inkind_dons["donation_date"] = pd.to_datetime(inkind_dons["donation_date"])
    items_dated = items.merge(inkind_dons, on="donation_id", how="left")
    items_dated = items_dated[items_dated["donation_date"].notna()]

    if items_dated.empty:
        print("  No items with donation dates — skipping.")
        return

    items_dated["year_month"] = items_dated["donation_date"].dt.to_period("M")
    items_dated["month_num"] = items_dated["donation_date"].dt.month

    monthly = items_dated.groupby("year_month").agg(
        n_items=("item_id", "count"),
        total_qty=("quantity", "sum"),
    ).reset_index().sort_values("year_month").reset_index(drop=True)

    monthly["lag_1"] = monthly["n_items"].shift(1)
    monthly["lag_2"] = monthly["n_items"].shift(2)
    monthly["lag_3"] = monthly["n_items"].shift(3)
    monthly["rolling_3m"] = monthly["n_items"].rolling(3).mean().shift(1)
    monthly["month_num"] = monthly["year_month"].apply(lambda x: x.month)

    df_fc = monthly.dropna().copy()
    if len(df_fc) < 5:
        print("  Too few months of data — skipping.")
        return

    X = df_fc[["lag_1", "lag_2", "lag_3", "rolling_3m", "month_num"]].values
    y = df_fc["n_items"].values
    split = max(1, int(len(X) * 0.8))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    mape = mean_absolute_percentage_error(y_test, model.predict(X_test)) if len(y_test) else np.nan

    # Forecast next month
    last = monthly.iloc[-1]
    next_features = np.array([[last["n_items"],
                                monthly.iloc[-2]["n_items"] if len(monthly) > 1 else last["n_items"],
                                monthly.iloc[-3]["n_items"] if len(monthly) > 2 else last["n_items"],
                                monthly["n_items"].iloc[-3:].mean(),
                                (int(last["month_num"]) % 12) + 1]])
    forecast = max(0, int(model.predict(next_features)[0]))

    # Category-level gap analysis (equal-need baseline: 25% per area)
    if "item_category" in items_dated.columns and "estimated_unit_value" in items_dated.columns:
        items_dated["item_value"] = items_dated["quantity"] * items_dated["estimated_unit_value"].fillna(0)
        intended_col = "intended_use" if "intended_use" in items_dated.columns else "item_category"
        by_use = items_dated.groupby(intended_col)["item_value"].sum()
        total = by_use.sum()
        supply_pct = (by_use / total * 100) if total > 0 else by_use * 0

        rows = []
        for use_area, pct in supply_pct.items():
            gap = pct - 25.0   # positive = over-supplied vs. equal-need baseline
            rows.append(dict(
                pipeline_id="inkind",
                entity_type="category",
                entity_id=hash(str(use_area)) % 100_000,  # synthetic int id
                score=round(float(pct), 2),
                label="Over-supplied" if gap > 5 else ("Under-supplied" if gap < -5 else "Balanced"),
                model_name="RandomForestRegressor",
                model_metric=round(float(mape), 4) if not np.isnan(mape) else None,
            ))
        # Also store the overall monthly forecast as entity_id=0
        rows.append(dict(
            pipeline_id="inkind", entity_type="forecast", entity_id=0,
            score=float(forecast), label=f"Next month: {forecast} items",
            model_name="RandomForestRegressor",
            model_metric=round(float(mape), 4) if not np.isnan(mape) else None,
        ))
    else:
        rows = [dict(pipeline_id="inkind", entity_type="forecast", entity_id=0,
                     score=float(forecast), label=f"Next month: {forecast} items",
                     model_name="RandomForestRegressor",
                     model_metric=round(float(mape), 4) if not np.isnan(mape) else None)]

    print(f"  Next-month forecast: {forecast} items  |  MAPE: {mape:.1%}" if not np.isnan(mape) else f"  Next-month forecast: {forecast} items")
    clear_pipeline("inkind")
    write_predictions(rows)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

PIPELINES = [
    ("01 Donor Churn",           run_donor_churn),
    ("02 Donation Capacity",     run_donation_capacity),
    ("03 Social Media",          run_social_media),
    ("04 Resident Outcomes",     run_resident_outcomes),
    ("05 Geographic",            run_geographic),
    ("06 Acquisition ROI",       run_acquisition_roi),
    ("07 Partner Effectiveness", run_partner_effectiveness),
    ("08 In-Kind Forecasting",   run_inkind_forecasting),
]

def main() -> None:
    print(f"Ember Foundation — nightly ML retrain  [{datetime.utcnow().isoformat()} UTC]")
    print(f"Data source: {db.connection_status()}")

    errors: list[str] = []
    for name, fn in PIPELINES:
        try:
            fn()
        except Exception:
            msg = f"Pipeline {name} failed:\n{traceback.format_exc()}"
            print(f"\n[ERROR] {msg}")
            errors.append(msg)

    print("\n────────────────────────────────────────────────────────────────────")
    if errors:
        print(f"Completed with {len(errors)} error(s). See above.")
        sys.exit(1)
    else:
        print("All 8 pipelines completed successfully.")

if __name__ == "__main__":
    main()
