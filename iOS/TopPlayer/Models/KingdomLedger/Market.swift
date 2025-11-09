import Foundation

struct MarketOrder: Codable, Identifiable, Equatable {
    let id: String
    let city_id: String
    let resource_id: String
    let side: String // "buy" or "sell"
    let price: Double
    let qty: Double
    var qty_filled: Double
    let status: String
    let created_at: Int64
    let expires_at: Int64?
    
    // Joined data
    let city_name: String?
    
    var remainingQty: Double {
        qty - qty_filled
    }
    
    var isBuy: Bool {
        side == "buy"
    }
}

struct MarketBook: Codable, Equatable {
    let resource: String
    let bids: [MarketOrder]
    let asks: [MarketOrder]
}

struct PriceOHLCV: Codable {
    let resource_id: String
    let bucket_start: Int64
    let bucket: String
    let open: Double
    let high: Double
    let low: Double
    let close: Double
    let volume: Double
}

struct MarketHistory: Codable {
    let resource: String
    let bucket: String
    let history: [PriceOHLCV]
}

struct PlaceOrderRequest: Codable {
    let side: String
    let resource: String
    let price: Double
    let qty: Double
    let tif: Int? // time in force (seconds)
}

struct PlaceOrderResponse: Codable {
    let orderId: String
    let status: String
    let filled: Double
}

struct CancelOrderRequest: Codable {
    let orderId: String
}


