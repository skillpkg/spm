-- Migration: 002_download_counts_view
-- Materialized view for pre-aggregated download counts.
-- Refresh every 5 minutes via Cloudflare Cron Trigger.

CREATE MATERIALIZED VIEW download_counts AS
SELECT
  v.skill_id,
  s.name AS skill_name,
  COUNT(*) AS total_downloads,
  COUNT(*) FILTER (WHERE d.downloaded_at >= NOW() - INTERVAL '7 days') AS weekly_downloads,
  COUNT(*) FILTER (WHERE d.downloaded_at >= NOW() - INTERVAL '30 days') AS monthly_downloads
FROM downloads d
JOIN versions v ON v.id = d.version_id
JOIN skills s ON s.id = v.skill_id
GROUP BY v.skill_id, s.name;

CREATE UNIQUE INDEX ON download_counts(skill_id);

-- Refresh every 5 minutes via Cloudflare Cron Trigger:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY download_counts;
