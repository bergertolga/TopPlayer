import Foundation

struct Purchase: Codable, Identifiable {
    let id: String
    let user_id: String
    let product_id: String
    let transaction_id: String
    let receipt_data: String?
    let amount: Double
    let currency: String
    let verified: Bool
    let created_at: Int64
}

struct PurchaseVerification: Codable {
    let productId: String
    let transactionId: String
    let receiptData: String
    let amount: Double
}

struct PurchaseResult: Codable {
    let success: Bool
    let purchaseId: String?
    let error: String?
    let rewards: PurchaseRewards?
    let message: String?
}

struct PurchaseRewards: Codable {
    let coins: Int?
    let gems: Int?
    let energy: Int?
    let heroId: String?
    let multiplier: Double?
    let multiplierDuration: Int?
}

