import SwiftUI
import StoreKit

struct ShopView: View {
    let userId: String
    @StateObject private var purchaseService = PurchaseService.shared
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Currency Packs
                    ShopSection(title: "💰 Currency Packs", products: currencyProducts)
                    
                    // Hero Packs
                    ShopSection(title: "⚔️ Hero Packs", products: heroProducts)
                    
                    // Boosters
                    ShopSection(title: "⚡ Boosters", products: boosterProducts)
                }
                .padding()
            }
            .navigationTitle("Shop")
            .task {
                await purchaseService.loadProducts()
            }
        }
    }
    
    private var currencyProducts: [Product] {
        purchaseService.products.filter { $0.id.contains("gems") || $0.id.contains("coins") }
    }
    
    private var heroProducts: [Product] {
        purchaseService.products.filter { $0.id.contains("hero_pack") }
    }
    
    private var boosterProducts: [Product] {
        purchaseService.products.filter { $0.id.contains("boost") || $0.id.contains("energy") }
    }
}

struct ShopSection: View {
    let title: String
    let products: [Product]
    @StateObject private var purchaseService = PurchaseService.shared
    @State private var isLoading = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title2)
                .fontWeight(.bold)
            
            if products.isEmpty {
                Text("No products available")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                ForEach(products) { product in
                    ProductCard(
                        product: product,
                        isLoading: isLoading,
                        onPurchase: {
                            Task {
                                await purchaseProduct(product)
                            }
                        }
                    )
                }
            }
        }
    }
    
    private func purchaseProduct(_ product: Product) async {
        isLoading = true
        defer { isLoading = false }
        
        guard let userId = GameStateService.shared.currentUserId else { return }
        
        do {
            _ = try await purchaseService.purchase(product, userId: userId)
        } catch {
            print("Purchase failed: \(error)")
        }
    }
}

struct ProductCard: View {
    let product: Product
    let isLoading: Bool
    let onPurchase: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(product.displayName)
                    .font(.headline)
                Text(product.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(product.displayPrice)
                    .font(.title3)
                    .fontWeight(.bold)
                
                Button(action: onPurchase) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Buy")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}


