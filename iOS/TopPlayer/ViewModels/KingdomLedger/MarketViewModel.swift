import Foundation
import SwiftUI

@MainActor
class MarketViewModel: ObservableObject {
    @Published var orderBook: MarketBook?
    @Published var priceHistory: MarketHistory?
    @Published var myOrders: [MarketOrder] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedResource: String = "WOOD"
    
    func loadOrderBook(resource: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            orderBook = try await NetworkService.shared.getMarketBook(resource: resource)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func loadPriceHistory(resource: String, bucket: String = "1h") async {
        do {
            priceHistory = try await NetworkService.shared.getMarketHistory(
                resource: resource,
                bucket: bucket
            )
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func placeOrder(userId: String, side: String, resource: String, price: Double, qty: Double) async throws -> PlaceOrderResponse {
        return try await NetworkService.shared.placeOrder(
            userId: userId,
            request: PlaceOrderRequest(
                side: side,
                resource: resource,
                price: price,
                qty: qty,
                tif: nil
            )
        )
    }
    
    func cancelOrder(userId: String, orderId: String) async {
        do {
            try await NetworkService.shared.cancelOrder(userId: userId, orderId: orderId)
            await loadOrderBook(resource: selectedResource)
            await loadMyOrders(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func loadMyOrders(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            myOrders = try await NetworkService.shared.getMyOrders(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}


