"""
db_utils.py — Shared data loader for Ember ML pipelines.

Priority order for each table:
  1. Azure SQL (via pyodbc) — uses DB_CONNECTION_STRING env var or .env file
  2. CSV fallback  — looks in the same directory as this file

Usage inside any notebook:
    import sys, pathlib
    sys.path.insert(0, str(pathlib.Path().resolve()))  # ensure ml-pipelines/ is on path
    import db_utils as db

    supporters = db.load_table('supporters')
    donations   = db.load_table('donations')

The connection string for Azure SQL should be stored as an environment variable:
    DB_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=tcp:<server>.database.windows.net,1433;Database=<db>;Uid=<user>;Pwd=<password>;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;

Or place a .env file in ml-pipelines/ with:
    DB_CONNECTION_STRING=...
"""

from __future__ import annotations
import os
import pathlib
import warnings

import pandas as pd

# ── optional imports ──────────────────────────────────────────────────────────
try:
    import pyodbc
    _PYODBC_AVAILABLE = True
except ImportError:
    _PYODBC_AVAILABLE = False

try:
    from dotenv import load_dotenv
    load_dotenv(pathlib.Path(__file__).parent / ".env")
except ImportError:
    # python-dotenv not installed — still try os.environ
    pass

# ── SQL table name map (Python var name → actual SQL table) ──────────────────
# Matches lighthouse_schema.sql (all snake_case)
TABLE_MAP: dict[str, str] = {
    "supporters":              "supporters",
    "donations":               "donations",
    "donation_allocations":    "donation_allocations",
    "residents":               "residents",
    "safehouses":              "safehouses",
    "safehouse_monthly_metrics": "safehouse_monthly_metrics",
    "process_recordings":      "process_recordings",
    "home_visitations":        "home_visitations",
    "education_records":       "education_records",
    "health_wellbeing_records": "health_wellbeing_records",
    "incident_reports":        "incident_reports",
    "intervention_plans":      "intervention_plans",
    "social_media_posts":      "social_media_posts",
    "in_kind_donation_items":  "in_kind_donation_items",
    "partners":                "partners",
    "partner_assignments":     "partner_assignments",
    "public_impact_snapshots": "public_impact_snapshots",
}

# ── CSV filename overrides (if CSV name differs from table name) ──────────────
CSV_NAME_OVERRIDES: dict[str, str] = {
    "health_wellbeing_records": "health_wellbeing_records",
    "safehouse_monthly_metrics": "safehouse_monthly_metrics",
}

_CSV_DIR = pathlib.Path(__file__).parent  # ml-pipelines/


def _get_connection_string() -> str | None:
    return os.environ.get("DB_CONNECTION_STRING") or os.environ.get("db_connection_string")


def _load_from_sql(table: str) -> pd.DataFrame | None:
    """Return DataFrame from Azure SQL, or None if unavailable."""
    if not _PYODBC_AVAILABLE:
        return None
    conn_str = _get_connection_string()
    if not conn_str:
        return None
    sql_table = TABLE_MAP.get(table, table)
    try:
        with pyodbc.connect(conn_str, timeout=10) as conn:
            df = pd.read_sql(f"SELECT * FROM [{sql_table}]", conn)
        print(f"  [db_utils] ✓ Loaded '{table}' from Azure SQL ({len(df):,} rows)")
        return df
    except Exception as exc:
        warnings.warn(f"[db_utils] SQL load failed for '{table}': {exc}. Falling back to CSV.")
        return None


def _load_from_csv(table: str) -> pd.DataFrame:
    """Return DataFrame from local CSV (always succeeds or raises FileNotFoundError)."""
    csv_name = CSV_NAME_OVERRIDES.get(table, table)
    # Try ml-pipelines/<table>.csv  then  ml-pipelines/data/<table>.csv
    for candidate in [
        _CSV_DIR / f"{csv_name}.csv",
        _CSV_DIR / "data" / f"{csv_name}.csv",
    ]:
        if candidate.exists():
            df = pd.read_csv(candidate)
            print(f"  [db_utils] ✓ Loaded '{table}' from CSV ({len(df):,} rows) — {candidate.name}")
            return df
    raise FileNotFoundError(
        f"[db_utils] Could not find CSV for '{table}'. "
        f"Expected: {_CSV_DIR / csv_name}.csv"
    )


def load_table(table: str) -> pd.DataFrame:
    """Load a table from Azure SQL (if configured) or CSV fallback."""
    df = _load_from_sql(table)
    if df is not None:
        return df
    return _load_from_csv(table)


def load_tables(*tables: str) -> tuple[pd.DataFrame, ...]:
    """Convenience: load multiple tables at once.

    Example:
        supporters, donations = db.load_tables('supporters', 'donations')
    """
    return tuple(load_table(t) for t in tables)


def connection_status() -> str:
    """Return a human-readable string describing the current data source."""
    if not _PYODBC_AVAILABLE:
        return "CSV only (pyodbc not installed)"
    conn_str = _get_connection_string()
    if not conn_str:
        return "CSV only (DB_CONNECTION_STRING not set)"
    return "Azure SQL configured (will attempt SQL, fall back to CSV on error)"


# ── Quick self-test when run directly ────────────────────────────────────────
if __name__ == "__main__":
    print("db_utils self-test")
    print(f"Status: {connection_status()}")
    for tbl in ["supporters", "donations", "residents"]:
        try:
            df = load_table(tbl)
            print(f"  {tbl}: {df.shape}")
        except FileNotFoundError as e:
            print(f"  {tbl}: MISSING — {e}")
