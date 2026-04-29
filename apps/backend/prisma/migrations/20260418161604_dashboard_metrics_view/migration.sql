-- CreateMaterializedView: dashboard_metrics
-- This view aggregates daily sales metrics for optimized dashboard queries
-- Refreshed via DashboardMetricsRefreshHandler on SaleCreatedEvent and SaleCancelledEvent

CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_sales,
  SUM(total_amount) as total_revenue,
  SUM((
    SELECT SUM(quantity)
    FROM jsonb_to_recordset(items) AS items(quantity INT)
  )) as total_items_sold
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create unique index to enable REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX dashboard_metrics_date_idx ON dashboard_metrics (date);
