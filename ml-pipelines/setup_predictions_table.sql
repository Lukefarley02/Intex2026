-- ml_predictions table
-- Stores the latest per-entity predictions from each nightly pipeline run.
-- The nightly job DELETES all rows for a pipeline before re-inserting so
-- the table always holds current predictions only (no history bloat).
-- Run this once against the Azure SQL (EmberApp) database.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'ml_predictions'
)
BEGIN
    CREATE TABLE ml_predictions (
        prediction_id     INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
        pipeline_id       NVARCHAR(50)  NOT NULL,   -- e.g. 'churn', 'capacity', 'outcomes'
        entity_type       NVARCHAR(20)  NOT NULL,   -- 'donor' | 'resident' | 'safehouse'
        entity_id         INT           NOT NULL,
        score             FLOAT         NULL,        -- continuous score (0-1 prob, or dollar amount)
        label             NVARCHAR(50)  NULL,        -- tier/risk class: 'High'/'Low', 'Major', etc.
        model_name        NVARCHAR(100) NULL,
        model_metric      FLOAT         NULL,        -- AUC or R² of the model used
        run_date          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_ml_predictions_pipeline ON ml_predictions (pipeline_id, entity_type, entity_id);
END
GO
