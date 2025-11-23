const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS request_metrics (
  name TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  total_duration REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (name, bucket)
)`;

export type MetricRecord = {
  name: string;
  durationMs: number;
  ok: boolean;
  bucketSizeSeconds?: number;
};

export async function ensureMetricsTable(db: D1Database): Promise<void> {
  await db.prepare(TABLE_SQL).run();
}

export async function recordMetric(db: D1Database, record: MetricRecord): Promise<void> {
  const bucketSize = record.bucketSizeSeconds ?? 60;
  const bucket = Math.floor(Date.now() / 1000 / bucketSize) * bucketSize;

  await ensureMetricsTable(db);

  await db
    .prepare(
      `INSERT INTO request_metrics (name, bucket, count, error_count, total_duration)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(name, bucket) DO UPDATE SET
         count = request_metrics.count + excluded.count,
         error_count = request_metrics.error_count + excluded.error_count,
         total_duration = request_metrics.total_duration + excluded.total_duration`
    )
    .bind(
      record.name,
      bucket,
      1,
      record.ok ? 0 : 1,
      record.durationMs
    )
    .run();
}

