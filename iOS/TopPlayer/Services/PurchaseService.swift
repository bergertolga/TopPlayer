import Foundation
import StoreKit

@MainActor
class PurchaseService: ObservableObject {
    static let shared = PurchaseService()
    
    @Published var products: [Product] = []
    @Published var purchasedProducts: Set<String> = []
    @Published var isLoading = false
    @Published var showRewardNotification = false
    @Published var rewardNotification: PurchaseRewards?
    
    private var updateListenerTask: Task<Void, Error>?
    
    init() {
        updateListenerTask = listenForTransactions()
        
        Task {
            await loadProducts()
            await updatePurchasedProducts()
        }
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    func loadProducts() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let productIds = [
                "com.idleadventure.gems_small",
                "com.idleadventure.gems_medium",
                "com.idleadventure.gems_large",
                "com.idleadventure.gems_epic",
                "com.idleadventure.coins_small",
                "com.idleadventure.coins_medium",
                "com.idleadventure.coins_large",
                "com.idleadventure.hero_pack_1",
                "com.idleadventure.hero_pack_2",
                "com.idleadventure.energy_refill",
                "com.idleadventure.boost_2x",
                "com.idleadventure.boost_5x",
            ]
            
            products = try await Product.products(for: productIds)
        } catch {
            print("Failed to load products: \(error)")
        }
    }
    
    func purchase(_ product: Product, userId: String) async throws -> Transaction? {
        let result = try await product.purchase()
        
        switch result {
        case .success(let verification):
            let transaction = try checkVerification(verification)
            
            // Verify with backend
            await verifyPurchaseWithBackend(
                transaction: transaction,
                product: product,
                userId: userId
            )
            
            await transaction.finish()
            await updatePurchasedProducts()
            
            return transaction
        case .userCancelled:
            throw PurchaseError.userCancelled
        case .pending:
            throw PurchaseError.pending
        @unknown default:
            throw PurchaseError.unknown
        }
    }
    
    private func checkVerification<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw PurchaseError.unverified
        case .verified(let safe):
            return safe
        }
    }
    
    private func verifyPurchaseWithBackend(
        transaction: Transaction,
        product: Product,
        userId: String
    ) async {
        // For StoreKit 2, transactions are already verified by Apple
        // We use the transaction ID and other metadata as receipt data
        // In production, you would verify with Apple's App Store Server API
        let receiptData = String(transaction.id)
        
        let verification = PurchaseVerification(
            productId: product.id,
            transactionId: String(transaction.id),
            receiptData: receiptData,
            amount: product.price.doubleValue
        )
        
        do {
            let result = try await NetworkService.shared.verifyPurchase(
                userId: userId,
                verification: verification
            )
            
            if result.success {
                AnalyticsService.shared.trackPurchase(
                    productId: product.id,
                    amount: product.price.doubleValue
                )
                
                // Show rewards if any
                if let rewards = result.rewards {
                    rewardNotification = rewards
                    showRewardNotification = true
                    
                    // Auto-hide after 5 seconds
                    Task {
                        try? await Task.sleep(nanoseconds: 5_000_000_000)
                        showRewardNotification = false
                    }
                }
            }
        } catch {
            print("Failed to verify purchase with backend: \(error)")
        }
    }
    
    @MainActor
    private func updatePurchasedProducts() async {
        var purchased: Set<String> = []
        
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerification(result)
                purchased.insert(transaction.productID)
            } catch {
                print("Failed to verify transaction: \(error)")
            }
        }
        
        purchasedProducts = purchased
    }
    
    private func listenForTransactions() -> Task<Void, Error> {
        return Task { @MainActor in
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerification(result)
                    await transaction.finish()
                    await self.updatePurchasedProducts()
                } catch {
                    print("Transaction verification failed: \(error)")
                }
            }
        }
    }
}

enum PurchaseError: Error {
    case userCancelled
    case pending
    case unverified
    case unknown
}

extension Decimal {
    var doubleValue: Double {
        return NSDecimalNumber(decimal: self).doubleValue
    }
}

