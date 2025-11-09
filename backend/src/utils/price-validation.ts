/**
 * Price Band Validation Utilities
 * 
 * Validates market order prices against historical trading data
 * Uses VWAP (Volume Weighted Average Price) for accurate price bands
 */

// Market configuration constants
const MARKET_CONFIG = {
  priceBandPercent: 40,
  priceBandWindowHours: 24
};

interface PriceValidationResult {
  valid: boolean;
  minPrice?: number;
  maxPrice?: number;
  referencePrice?: number;
  error?: string;
}

/**
 * Calculate Volume Weighted Average Price (VWAP) from trades
 * 
 * @param trades - Array of trades with price and qty
 * @returns VWAP value
 */
function calculateVWAP(trades: Array<{ price: number; qty: number }>): number {
  if (trades.length === 0) {
    return 0;
  }
  
  let totalValue = 0;
  let totalVolume = 0;
  
  for (const trade of trades) {
    totalValue += trade.price * trade.qty;
    totalVolume += trade.qty;
  }
  
  return totalVolume > 0 ? totalValue / totalVolume : 0;
}

/**
 * Calculate simple average price from trades
 * 
 * @param trades - Array of trades with price
 * @returns Average price
 */
function calculateAveragePrice(trades: Array<{ price: number }>): number {
  if (trades.length === 0) {
    return 0;
  }
  
  const sum = trades.reduce((acc, trade) => acc + trade.price, 0);
  return sum / trades.length;
}

/**
 * Validate price against price band rules
 * 
 * @param price - Price to validate
 * @param trades - Recent trades for VWAP calculation
 * @param baseValue - Base resource value as fallback
 * @param windowHours - Time window for price band (default 24h)
 * @returns Validation result
 */
export function validatePriceBand(
  price: number,
  trades: Array<{ price: number; qty: number; traded_at: number }>,
  baseValue: number,
  windowHours: number = MARKET_CONFIG.priceBandWindowHours
): PriceValidationResult {
  const priceBandPercent = MARKET_CONFIG.priceBandPercent / 100; // Convert to decimal
  const windowMs = windowHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - windowMs;
  
  // Filter trades within the time window
  const recentTrades = trades.filter(t => t.traded_at >= cutoffTime);
  
  let referencePrice = 0;
  
  // Calculate reference price using VWAP if we have trades
  if (recentTrades.length > 0) {
    // Calculate VWAP (Volume Weighted Average Price) for more accuracy
    referencePrice = calculateVWAP(recentTrades);
    
    // Fallback to simple average if VWAP is 0 (shouldn't happen, but safety check)
    if (referencePrice === 0) {
      referencePrice = calculateAveragePrice(recentTrades);
    }
  } else {
    // No recent trades - use base resource value as reference
    referencePrice = baseValue;
  }
  
  // If still no reference price, reject (shouldn't happen)
  if (referencePrice === 0) {
    return {
      valid: false,
      error: 'Unable to determine reference price. No trading history and no base value.'
    };
  }
  
  // Calculate price band
  const priceBand = referencePrice * priceBandPercent;
  const minPrice = referencePrice - priceBand;
  const maxPrice = referencePrice + priceBand;
  
  // Validate price is within band
  if (price < minPrice || price > maxPrice) {
    return {
      valid: false,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      referencePrice: Math.round(referencePrice * 100) / 100,
      error: `Price must be within ${Math.round(minPrice)}-${Math.round(maxPrice)} (±${MARKET_CONFIG.priceBandPercent}% of ${recentTrades.length > 0 ? 'VWAP' : 'base value'}: ${Math.round(referencePrice)})`
    };
  }
  
  return {
    valid: true,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    referencePrice: Math.round(referencePrice * 100) / 100
  };
}

/**
 * Get reference price for a resource (VWAP or base value)
 * 
 * @param trades - Recent trades
 * @param baseValue - Base resource value
 * @param windowHours - Time window for VWAP calculation
 * @returns Reference price
 */
export function getReferencePrice(
  trades: Array<{ price: number; qty: number; traded_at: number }>,
  baseValue: number,
  windowHours: number = MARKET_CONFIG.priceBandWindowHours
): number {
  const windowMs = windowHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - windowMs;
  
  const recentTrades = trades.filter(t => t.traded_at >= cutoffTime);
  
  if (recentTrades.length > 0) {
    const vwap = calculateVWAP(recentTrades);
    return vwap > 0 ? vwap : calculateAveragePrice(recentTrades);
  }
  
  return baseValue;
}

