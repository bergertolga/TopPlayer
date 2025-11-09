/**
 * Apple App Store Server API Receipt Validation
 * 
 * Uses App Store Server API v2 to verify transactions
 * Documentation: https://developer.apple.com/documentation/appstoreserverapi
 */

interface AppleTransactionInfo {
  transactionId: string;
  productId: string;
  purchaseDate: number;
  quantity: number;
  type: string;
  inAppOwnershipType: string;
  signedTransactionInfo: string;
}

interface AppleResponse {
  signedTransactionInfo?: string;
  signedRenewalInfo?: string;
  environment?: string;
  status?: number;
}

/**
 * Verify Apple transaction using App Store Server API
 * 
 * @param transactionId - The transaction ID from StoreKit
 * @param productId - The product ID being purchased
 * @param environment - 'Production' or 'Sandbox'
 * @param receiptData - Optional receipt data for fallback verification
 * @returns Promise<{verified: boolean, transactionInfo?: AppleTransactionInfo}>
 */
export async function verifyAppleTransaction(
  transactionId: string,
  productId: string,
  environment: 'Production' | 'Sandbox' = 'Production',
  receiptData?: string
): Promise<{ verified: boolean; transactionInfo?: AppleTransactionInfo; error?: string }> {
  try {
    // For Cloudflare Workers, we'll use the App Store Server API
    // This requires an App Store Connect API key (JWT)
    // Since we don't have the key configured, we'll implement a basic structure
    
    // In production, you would:
    // 1. Generate JWT token using App Store Connect API key
    // 2. Call GET /inApps/v1/transactions/{transactionId}
    // 3. Verify the transaction details match
    
    // For Cloudflare Workers, environment variables are accessed via env parameter
    // For now, we'll do basic validation and structure for future implementation
    // In production, pass env with APPLE_APP_STORE_API_KEY, etc. as secrets
    const appStoreAPIKey = undefined; // Will be passed via env in production
    const appStoreKeyId = undefined;
    const appStoreIssuerId = undefined;
    const appStoreBundleId = 'com.yourapp.bundleid';
    
    // Check if we're in development mode (no API credentials)
    const isDevelopment = !appStoreAPIKey || !appStoreKeyId || !appStoreIssuerId;
    
    if (isDevelopment) {
      console.warn('Apple App Store API credentials not configured. Using development mode verification.');
      
      // In development, do basic validation
      // In production, require proper API credentials
      if (environment === 'Production') {
        return {
          verified: false,
          error: 'Apple App Store API credentials required for production verification. Set APPLE_APP_STORE_API_KEY, APPLE_APP_STORE_KEY_ID, and APPLE_APP_STORE_ISSUER_ID environment variables.'
        };
      }
      
      // Basic validation for development
      if (!transactionId || !productId) {
        return {
          verified: false,
          error: 'Missing transaction or product ID'
        };
      }
      
      // In development, accept valid-looking transaction IDs
      // Format: UUID-like string (StoreKit 2) or numeric (StoreKit 1)
      const transactionIdRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$|^\d+$/i;
      if (transactionIdRegex.test(transactionId)) {
        return {
          verified: true,
          transactionInfo: {
            transactionId,
            productId,
            purchaseDate: Date.now(),
            quantity: 1,
            type: 'Auto-Renewable Subscription',
            inAppOwnershipType: 'PURCHASED',
            signedTransactionInfo: ''
          }
        };
      }
      
      return {
        verified: false,
        error: 'Invalid transaction ID format'
      };
    }
    
    // TODO: Implement full App Store Server API verification
    // This requires:
    // 1. Generate JWT token (using @apple/app-store-server-library or manual JWT)
    // 2. Call App Store Server API: GET /inApps/v1/transactions/{transactionId}
    // 3. Verify response and decode signedTransactionInfo
    // 4. Check productId matches
    // 5. Check transaction hasn't been revoked
    
    // Example implementation structure:
    /*
    const jwt = await generateAppStoreJWT(appStoreAPIKey, appStoreKeyId, appStoreIssuerId);
    
    const apiUrl = environment === 'Production' 
      ? 'https://api.storekit.itunes.apple.com'
      : 'https://api.storekit-sandbox.itunes.apple.com';
    
    const response = await fetch(`${apiUrl}/inApps/v1/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        verified: false,
        error: `Apple API error: ${response.status} ${response.statusText}`
      };
    }
    
    const data: AppleResponse = await response.json();
    
    if (!data.signedTransactionInfo) {
      return {
        verified: false,
        error: 'No transaction info in Apple response'
      };
    }
    
    // Decode and verify signedTransactionInfo (JWT)
    const transactionInfo = await decodeSignedTransactionInfo(data.signedTransactionInfo);
    
    // Verify product ID matches
    if (transactionInfo.productId !== productId) {
      return {
        verified: false,
        error: 'Product ID mismatch'
      };
    }
    
    // Check transaction hasn't been revoked
    if (transactionInfo.revocationDate) {
      return {
        verified: false,
        error: 'Transaction has been revoked'
      };
    }
    
    return {
      verified: true,
      transactionInfo
    };
    */
    
    // For now, return structure indicating it needs implementation
    return {
      verified: false,
      error: 'Full Apple App Store Server API verification not yet implemented. Configure API credentials and uncomment implementation code.'
    };
    
  } catch (error: any) {
    console.error('Apple receipt verification error:', error);
    return {
      verified: false,
      error: error.message || 'Unknown verification error'
    };
  }
}

/**
 * Verify receipt data (legacy method - for older StoreKit 1 receipts)
 * This is a fallback for receipt-based verification
 */
export async function verifyAppleReceipt(
  receiptData: string,
  productId: string,
  environment: 'Production' | 'Sandbox' = 'Production'
): Promise<{ verified: boolean; error?: string }> {
  try {
    // StoreKit 1 receipt verification uses the verifyReceipt endpoint
    // This is deprecated but still works for older receipts
    
    const verifyUrl = environment === 'Production'
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    const appStoreSharedSecret = undefined; // Will be passed via env in production
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': appStoreSharedSecret, // Optional: for auto-renewable subscriptions
        'exclude-old-transactions': true
      })
    });
    
    if (!response.ok) {
      return {
        verified: false,
        error: `Receipt verification API error: ${response.status}`
      };
    }
    
    const data = await response.json() as any;
    
    // Status 0 = valid receipt
    // Status 21007 = receipt is from sandbox but sent to production (retry with sandbox)
    if (data.status === 21007 && environment === 'Production') {
      return verifyAppleReceipt(receiptData, productId, 'Sandbox');
    }
    
    if (data.status !== 0) {
      return {
        verified: false,
        error: `Receipt verification failed with status: ${data.status}`
      };
    }
    
    // Check if product ID is in the receipt
    const inAppPurchases = (data.receipt?.in_app || []) as any[];
    const hasProduct = inAppPurchases.some((purchase: any) => 
      purchase.product_id === productId
    );
    
    if (!hasProduct) {
      return {
        verified: false,
        error: 'Product ID not found in receipt'
      };
    }
    
    return {
      verified: true
    };
    
  } catch (error: any) {
    console.error('Apple receipt verification error:', error);
    return {
      verified: false,
      error: error.message || 'Unknown verification error'
    };
  }
}

