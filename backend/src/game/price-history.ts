/**
 * Price History Aggregation
 * 
 * Aggregates trades into OHLCV (Open, High, Low, Close, Volume) buckets
 * for price history charts
 */

interface OHLCVData {
  resourceId: string;
  bucketStart: number;
  bucket: '15m' | '1h' | '24h';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Calculate bucket start time for a given timestamp and bucket size
 */
function getBucketStart(timestamp: number, bucket: '15m' | '1h' | '24h'): number {
  const date = new Date(timestamp);
  
  switch (bucket) {
    case '15m':
      // Round down to nearest 15 minutes
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 15) * 15;
      date.setMinutes(roundedMinutes, 0, 0);
      return date.getTime();
      
    case '1h':
      // Round down to nearest hour
      date.setMinutes(0, 0, 0);
      return date.getTime();
      
    case '24h':
      // Round down to midnight
      date.setHours(0, 0, 0, 0);
      return date.getTime();
      
    default:
      return timestamp;
  }
}

/**
 * Aggregate trades into OHLCV buckets
 */
export async function aggregatePriceHistory(
  db: D1Database,
  resourceId: string,
  bucket: '15m' | '1h' | '24h',
  startTime: number,
  endTime: number
): Promise<OHLCVData[]> {
  // Get all trades for this resource in the time range
  const trades = await db.prepare(
    `SELECT price, qty, traded_at 
     FROM trades 
     WHERE resource_id = ? AND traded_at >= ? AND traded_at < ?
     ORDER BY traded_at ASC`
  )
    .bind(resourceId, startTime, endTime)
    .all<{ price: number; qty: number; traded_at: number }>();

  if (trades.results.length === 0) {
    return [];
  }

  // Group trades by bucket
  const buckets = new Map<number, {
    open: number | null;
    high: number;
    low: number;
    close: number | null;
    volume: number;
  }>();

  for (const trade of trades.results) {
    const bucketStart = getBucketStart(trade.traded_at, bucket);
    
    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, {
        open: null,
        high: trade.price,
        low: trade.price,
        close: null,
        volume: 0
      });
    }

    const bucketData = buckets.get(bucketStart)!;
    
    if (bucketData.open === null) {
      bucketData.open = trade.price;
    }
    
    bucketData.high = Math.max(bucketData.high, trade.price);
    bucketData.low = Math.min(bucketData.low, trade.price);
    bucketData.close = trade.price;
    bucketData.volume += trade.qty;
  }

  // Convert to array format
  const result: OHLCVData[] = [];
  for (const [bucketStart, data] of buckets.entries()) {
    if (data.open !== null && data.close !== null) {
      result.push({
        resourceId,
        bucketStart,
        bucket,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume
      });
    }
  }

  return result.sort((a, b) => a.bucketStart - b.bucketStart);
}

/**
 * Process price history aggregation for all resources
 * Called from cron job
 */
export async function processPriceHistoryAggregation(db: D1Database): Promise<void> {
  // Get all resources
  const resources = await db.prepare(
    'SELECT id FROM resources'
  )
    .all<{ id: string }>();

  const now = Date.now();
  const buckets: Array<'15m' | '1h' | '24h'> = ['15m', '1h', '24h'];
  
  // Time ranges for each bucket
  const timeRanges: Record<'15m' | '1h' | '24h', number> = {
    '15m': 24 * 60 * 60 * 1000, // 24 hours
    '1h': 7 * 24 * 60 * 60 * 1000, // 7 days
    '24h': 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  for (const resource of resources.results) {
    for (const bucket of buckets) {
      try {
        const startTime = now - timeRanges[bucket];
        const endTime = now;
        
        // Get existing OHLCV data to avoid duplicates
        const existing = await db.prepare(
          `SELECT bucket_start FROM price_ohlcv 
           WHERE resource_id = ? AND bucket = ? 
           ORDER BY bucket_start DESC LIMIT 1`
        )
          .bind(resource.id, bucket)
          .first<{ bucket_start: number }>();

        // Only aggregate new data (after last bucket)
        const actualStartTime = existing 
          ? Math.max(startTime, existing.bucket_start + 1)
          : startTime;

        if (actualStartTime >= endTime) {
          continue; // No new data to aggregate
        }

        const ohlcvData = await aggregatePriceHistory(
          db,
          resource.id,
          bucket,
          actualStartTime,
          endTime
        );

        // Insert or update OHLCV data
        for (const data of ohlcvData) {
          await db.prepare(
            `INSERT INTO price_ohlcv (resource_id, bucket_start, bucket, open, high, low, close, volume)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(resource_id, bucket, bucket_start) DO UPDATE SET
               open = excluded.open,
               high = excluded.high,
               low = excluded.low,
               close = excluded.close,
               volume = excluded.volume`
          )
            .bind(
              data.resourceId,
              data.bucketStart,
              data.bucket,
              data.open,
              data.high,
              data.low,
              data.close,
              data.volume
            )
            .run();
        }
      } catch (error) {
        console.error(`Error aggregating price history for resource ${resource.id}, bucket ${bucket}:`, error);
      }
    }
  }
}

