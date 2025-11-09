import SwiftUI

struct MarketView: View {
    let userId: String
    @StateObject private var viewModel = MarketViewModel()
    @State private var selectedSide: MarketSide = .buy
    @State private var orderPrice: String = ""
    @State private var orderQty: String = ""
    @State private var showAdvanced = false
    @State private var selectedTab: MarketTab = .browse
    
    enum MarketSide {
        case buy, sell
    }
    
    enum MarketTab {
        case browse, myOrders, stats
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("Tab", selection: $selectedTab) {
                    Text("Browse").tag(MarketTab.browse)
                    Text("My Orders").tag(MarketTab.myOrders)
                    Text("Stats").tag(MarketTab.stats)
                }
                .pickerStyle(.segmented)
                .padding()
                
                ScrollView {
                    VStack(spacing: 20) {
                        if selectedTab == .browse {
                            browseContent
                        } else if selectedTab == .myOrders {
                            myOrdersContent
                        } else {
                            statsContent
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Market")
            .refreshable {
                await refreshData()
            }
            .task {
                await refreshData()
            }
            .onChange(of: selectedTab) { oldValue, newValue in
                Task {
                    await refreshData()
                }
            }
        }
    }
    
    private var browseContent: some View {
        VStack(spacing: 20) {
            // Resource Selector
            Picker("Resource", selection: $viewModel.selectedResource) {
                Text("Wood").tag("WOOD")
                Text("Stone").tag("STONE")
                Text("Food").tag("FOOD")
                Text("Ore").tag("ORE")
                Text("Iron").tag("IRON")
                Text("Gold").tag("GOLD")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .onChange(of: viewModel.selectedResource) { _ in
                Task {
                await viewModel.loadOrderBook(resource: viewModel.selectedResource)
                }
            }
                    
                    if viewModel.isLoading && viewModel.orderBook == nil {
                        ProgressView("Loading market...")
                .padding()
                    } else if let orderBook = viewModel.orderBook {
                        // Market Price Display
                        MarketPriceCard(orderBook: orderBook, resource: viewModel.selectedResource)
                        
                        // Quick Buy/Sell at Market Price
                        QuickTradeButtons(
                            orderBook: orderBook,
                            resource: viewModel.selectedResource,
                    userId: userId,
                            viewModel: viewModel
                        )
                        
                        // Order Placement (Inline)
                        OrderPlacementCard(
                            side: $selectedSide,
                            price: $orderPrice,
                            qty: $orderQty,
                            orderBook: orderBook,
                    resource: viewModel.selectedResource,
                            userId: userId,
                    viewModel: viewModel
                        )
                        
                        // Order Book - Show packages available to buy
                        OrderBookCard(
                            orderBook: orderBook,
                            resource: viewModel.selectedResource,
                            userId: userId,
                            viewModel: viewModel,
                            onPriceTap: { price, side in
                                orderPrice = String(format: "%.2f", price)
                                selectedSide = side
                            }
                        )
                    } else if let error = viewModel.errorMessage {
                        ErrorStateView(
                            error: error,
                            onRetry: {
                                Task {
                                    await viewModel.loadOrderBook(resource: viewModel.selectedResource)
                                }
                            }
                        )
                    }
        }
    }
    
    private var myOrdersContent: some View {
        VStack(spacing: 20) {
            if viewModel.isLoading {
                ProgressView("Loading your orders...")
                    .padding()
            } else if viewModel.myOrders.isEmpty {
                EmptyStateView(
                    icon: "list.bullet.rectangle",
                    title: "No Active Orders",
                    message: "You don't have any active orders. Place an order in the Browse tab!"
                )
            } else {
                // Resource filter for my orders
                Picker("Resource", selection: $viewModel.selectedResource) {
                    Text("All").tag("ALL")
                    Text("Wood").tag("WOOD")
                    Text("Stone").tag("STONE")
                    Text("Food").tag("FOOD")
                    Text("Ore").tag("ORE")
                    Text("Iron").tag("IRON")
                    Text("Gold").tag("GOLD")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                
                ForEach(viewModel.myOrders) { order in
                    MyOrderRow(
                        order: order,
                        onCancel: {
                            Task {
                                await viewModel.cancelOrder(userId: userId, orderId: order.id)
                                await viewModel.loadMyOrders(userId: userId)
                            }
                        }
                    )
                }
            }
        }
    }
    
    private var statsContent: some View {
        VStack(spacing: 20) {
            if let orderBook = viewModel.orderBook {
                MarketStatsCard(orderBook: orderBook, resource: viewModel.selectedResource)
            }
            
            if viewModel.priceHistory != nil {
                PriceHistoryCard(history: viewModel.priceHistory!)
            } else {
                Button("Load Price History") {
                    Task {
                        await viewModel.loadPriceHistory(resource: viewModel.selectedResource)
                    }
                }
                .buttonStyle(.bordered)
            }
        }
    }
    
    private func refreshData() async {
        await viewModel.loadOrderBook(resource: viewModel.selectedResource)
        if selectedTab == .myOrders {
            await viewModel.loadMyOrders(userId: userId)
        }
        if selectedTab == .stats {
            await viewModel.loadPriceHistory(resource: viewModel.selectedResource)
        }
    }
}

struct MarketPriceCard: View {
    let orderBook: MarketBook
    let resource: String
    
    private var bestBid: Double? {
        orderBook.bids.first?.price
    }
    
    private var bestAsk: Double? {
        orderBook.asks.first?.price
    }
    
    private var spread: Double? {
        guard let bid = bestBid, let ask = bestAsk else { return nil }
        return ask - bid
    }
    
    private var spreadPercent: Double? {
        guard let bid = bestBid, let spread = spread else { return nil }
        return (spread / bid) * 100
    }
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Market Price")
                    .font(.headline)
                Spacer()
                Text(resource)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: 20) {
                // Best Bid
                VStack(alignment: .leading, spacing: 4) {
                    Text("Best Buy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let bid = bestBid {
                        Text(formatNumber(bid))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    } else {
                        Text("--")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Spread
                if let spread = spread, let percent = spreadPercent {
                    VStack(spacing: 4) {
                        Text("Spread")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(formatNumber(spread))
                    .font(.headline)
                            .foregroundColor(.orange)
                        Text("\(String(format: "%.1f", percent))%")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Best Ask
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Best Sell")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let ask = bestAsk {
                        Text(formatNumber(ask))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.red)
                    } else {
                        Text("--")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct QuickTradeButtons: View {
    let orderBook: MarketBook
    let resource: String
    let userId: String
    @ObservedObject var viewModel: MarketViewModel
    @State private var isBuying = false
    @State private var isSelling = false
    
    private var bestBid: Double? {
        orderBook.bids.first?.price
    }
    
    private var bestAsk: Double? {
        orderBook.asks.first?.price
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Quick Buy Button
            Button(action: {
                guard let price = bestBid else { return }
                Task {
                    isBuying = true
                    defer { isBuying = false }
                    
                    do {
                        let _ = try await viewModel.placeOrder(
                            userId: userId,
                            side: "buy",
                            resource: resource,
                            price: price,
                            qty: 1.0
                        )
                        await viewModel.loadOrderBook(resource: resource)
                    } catch {
                        // Handle error
                    }
                }
            }) {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.title2)
                    Text("Buy Now")
                        .font(.caption)
                    if let price = bestBid {
                        Text(formatNumber(price))
                            .font(.caption2)
                            .opacity(0.8)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(bestBid != nil ? Color.green : Color.gray.opacity(0.3))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(bestBid == nil || isBuying || isSelling)
            
            // Quick Sell Button
            Button(action: {
                guard let price = bestAsk else { return }
                Task {
                    isSelling = true
                    defer { isSelling = false }
                    
                    do {
                        let _ = try await viewModel.placeOrder(
                            userId: userId,
                            side: "sell",
                            resource: resource,
                            price: price,
                            qty: 1.0
                        )
                        await viewModel.loadOrderBook(resource: resource)
                    } catch {
                        // Handle error
                    }
                }
            }) {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                    Text("Sell Now")
                .font(.caption)
                    if let price = bestAsk {
                        Text(formatNumber(price))
                            .font(.caption2)
                            .opacity(0.8)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(bestAsk != nil ? Color.red : Color.gray.opacity(0.3))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(bestAsk == nil || isBuying || isSelling)
        }
    }
}

struct OrderPlacementCard: View {
    @Binding var side: MarketView.MarketSide
    @Binding var price: String
    @Binding var qty: String
    let orderBook: MarketBook
    let resource: String
    let userId: String
    @ObservedObject var viewModel: MarketViewModel
    @State private var isPlacing = false
    @State private var selectedMultiplier = 1
    
    private var suggestedPrice: Double {
        switch side {
        case .buy:
            return orderBook.bids.first?.price ?? 0
        case .sell:
            return orderBook.asks.first?.price ?? 0
        }
    }
    
    private let multipliers = [1, 10, 100, 1000]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Side Selector
            Picker("Side", selection: $side) {
                Text("Buy").tag(MarketView.MarketSide.buy)
                Text("Sell").tag(MarketView.MarketSide.sell)
            }
            .pickerStyle(.segmented)
            
            // Price Input
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Price")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("Use \(side == .buy ? "Best Buy" : "Best Sell")") {
                        price = String(format: "%.2f", suggestedPrice)
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
                
                TextField("0.00", text: $price)
                        .keyboardType(.decimalPad)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(10)
            }
            
            // Quantity Multiplier Selector
            VStack(alignment: .leading, spacing: 8) {
                Text("Quantity")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                // Multiplier buttons
                HStack(spacing: 8) {
                    ForEach(multipliers, id: \.self) { multiplier in
                        Button(action: {
                            selectedMultiplier = multiplier
                            qty = String(multiplier)
                        }) {
                            Text("\(multiplier)")
                                .font(.subheadline)
                                .fontWeight(selectedMultiplier == multiplier ? .bold : .regular)
                                .foregroundColor(selectedMultiplier == multiplier ? .white : .primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(selectedMultiplier == multiplier ? (side == .buy ? Color.green : Color.red) : Color(.systemGray5))
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
                
                // Manual quantity input (optional)
                TextField("Or enter custom amount", text: $qty)
                    .keyboardType(.numberPad)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(10)
                    .onChange(of: qty) { oldValue, newValue in
                        if let value = Int(newValue), multipliers.contains(value) {
                            selectedMultiplier = value
                        } else {
                            selectedMultiplier = 0 // Custom value
                        }
                    }
            }
            
            // Total Value
            if let priceValue = Double(price), let qtyValue = Double(qty), qtyValue > 0 {
                HStack {
                    Text("Total:")
                        .font(.subheadline)
                    Spacer()
                    Text(formatNumber(priceValue * qtyValue))
                        .font(.headline)
                        .foregroundColor(side == .buy ? .green : .red)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
            
            // Place Order Button
                Button(action: {
                    Task {
                        await placeOrder()
                    }
                }) {
                HStack {
                    if isPlacing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: side == .buy ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                        Text("Place \(side == .buy ? "Buy" : "Sell") Order")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    side == .buy ? Color.green : Color.red
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(price.isEmpty || qty.isEmpty || isPlacing || Double(price) == nil || Double(qty) == nil)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func placeOrder() async {
        guard let priceValue = Double(price),
              let qtyValue = Double(qty),
              qtyValue > 0 else {
            return
        }
        
        isPlacing = true
        defer { isPlacing = false }
        
        do {
            let _ = try await viewModel.placeOrder(
                userId: userId,
                side: side == .buy ? "buy" : "sell",
                resource: resource,
                price: priceValue,
                qty: qtyValue
            )
            
            // Clear form
            price = ""
            qty = ""
            selectedMultiplier = 1
            
            // Reload order book
            await viewModel.loadOrderBook(resource: resource)
        } catch {
            // Handle error
        }
    }
}

struct OrderBookCard: View {
    let orderBook: MarketBook
    let resource: String
    let userId: String
    @ObservedObject var viewModel: MarketViewModel
    let onPriceTap: (Double, MarketView.MarketSide) -> Void
    
    @State private var buyingOrderId: String?
    @State private var isBuying = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Available Packages")
                .font(.headline)
            
            // Sell Orders (Asks) - These are packages you can buy
            if !orderBook.asks.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Packages for Sale")
                        .font(.subheadline)
                        .foregroundColor(.red)
                        .padding(.top, 4)
                    
                    ForEach(orderBook.asks.prefix(20), id: \.id) { order in
                        OrderRow(
                            order: order,
                            isBuy: false,
                            onTap: {
                                onPriceTap(order.price, .sell)
                            },
                            onBuy: {
                                Task {
                                    await buyOrder(order: order)
                                }
                            }
                        )
                    }
                }
            }
            
            Divider()
            
            // Buy Orders (Bids) - These are what others want to buy
            if !orderBook.bids.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Buy Orders")
                        .font(.subheadline)
                        .foregroundColor(.green)
                        .padding(.top, 4)
                    
                    ForEach(orderBook.bids.prefix(10), id: \.id) { order in
                        OrderRow(
                            order: order,
                            isBuy: true,
                            onTap: {
                                onPriceTap(order.price, .buy)
                            },
                            onBuy: nil
                        )
                    }
                }
            }
            
            if orderBook.asks.isEmpty && orderBook.bids.isEmpty {
                Text("No orders available. Be the first to list a package!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func buyOrder(order: MarketOrder) async {
        guard !isBuying else { return }
        
        buyingOrderId = order.id
        isBuying = true
        defer {
            isBuying = false
            buyingOrderId = nil
        }
        
        // Create a buy order at the sell order's price to match it
        do {
            let _ = try await viewModel.placeOrder(
                userId: userId,
                side: "buy",
                resource: resource,
                price: order.price,
                qty: order.remainingQty
            )
            
            // Reload order book
            await viewModel.loadOrderBook(resource: resource)
        } catch {
            // Handle error - could show alert
        }
    }
}

struct OrderRow: View {
    let order: MarketOrder
    let isBuy: Bool
    let onTap: () -> Void
    let onBuy: (() -> Void)?
    
    var body: some View {
        HStack(spacing: 12) {
            // Order Info (tappable to fill price)
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(formatNumber(order.price))
                            .font(.headline)
                            .foregroundColor(isBuy ? .green : .red)
                        Text("per unit")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack(spacing: 8) {
                        Text("\(formatNumber(order.remainingQty)) units")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text("•")
                            .foregroundColor(.secondary)
                        Text("Total: \(formatNumber(order.price * order.remainingQty))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            
            // Buy Button (only for sell orders)
            if !isBuy, let onBuy = onBuy {
                Button(action: {
                    let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                    impactFeedback.impactOccurred()
                    onBuy()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "cart.fill")
                        Text("Buy")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        LinearGradient(
                            colors: [Color.green, Color.green.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isBuy ? Color.green.opacity(0.2) : Color.red.opacity(0.2), lineWidth: 1)
        )
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text(title)
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

struct MyOrderRow: View {
    let order: MarketOrder
    let onCancel: () -> Void
    @State private var isCancelling = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: order.isBuy ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                        .foregroundColor(order.isBuy ? .green : .red)
                        .font(.title3)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(order.isBuy ? "Buy Order" : "Sell Order")
                            .font(.headline)
                        Text("\(formatNumber(order.price)) per unit")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(formatNumber(order.remainingQty)) / \(formatNumber(order.qty))")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("\(Int((order.qty_filled / order.qty) * 100))% filled")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 6)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(order.isBuy ? Color.green : Color.red)
                        .frame(width: geometry.size.width * (order.qty_filled / order.qty), height: 6)
                        .animation(.spring(), value: order.qty_filled)
                }
            }
            .frame(height: 6)
            
            // Cancel button
            if order.status == "open" {
                Button(action: {
                    isCancelling = true
                    onCancel()
                }) {
                    HStack {
                        Image(systemName: "xmark.circle.fill")
                        Text("Cancel Order")
                    }
                    .font(.subheadline)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                }
                .disabled(isCancelling)
            } else {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text(order.status.capitalized)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct MarketStatsCard: View {
    let orderBook: MarketBook
    let resource: String
    
    private var totalVolume: Double {
        orderBook.asks.reduce(0) { $0 + $1.remainingQty } + 
        orderBook.bids.reduce(0) { $0 + $1.remainingQty }
    }
    
    private var avgPrice: Double {
        let allPrices = orderBook.asks.map { $0.price } + orderBook.bids.map { $0.price }
        guard !allPrices.isEmpty else { return 0 }
        return allPrices.reduce(0, +) / Double(allPrices.count)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Market Statistics")
                .font(.headline)
            
            HStack(spacing: 20) {
                StatItem(
                    icon: "chart.bar.fill",
                    label: "Total Volume",
                    value: formatNumber(totalVolume),
                    color: .blue
                )
                
                StatItem(
                    icon: "dollarsign.circle.fill",
                    label: "Avg Price",
                    value: formatNumber(avgPrice),
                    color: .green
                )
                
                StatItem(
                    icon: "list.bullet.rectangle",
                    label: "Active Orders",
                    value: "\(orderBook.asks.count + orderBook.bids.count)",
                    color: .orange
                )
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct StatItem: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct PriceHistoryCard: View {
    let history: MarketHistory
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Price History")
                .font(.headline)
            
            if history.history.isEmpty {
                Text("No price history available")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                // Simple price chart representation
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(history.history.prefix(10).reversed()), id: \.bucket_start) { candle in
                        HStack {
                            Text(formatTime(candle.bucket_start))
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .frame(width: 80, alignment: .leading)
                            
                            HStack(spacing: 4) {
                                Text("O: \(formatNumber(candle.open))")
                                Text("H: \(formatNumber(candle.high))")
                                Text("L: \(formatNumber(candle.low))")
                                Text("C: \(formatNumber(candle.close))")
                            }
                            .font(.caption2)
                            
                            Spacer()
                            
                            Text("Vol: \(formatNumber(candle.volume))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func formatTime(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct ErrorStateView: View {
    let error: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundColor(.orange)
            
            Text("Error")
                .font(.headline)
            
            Text(error)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Retry", action: onRetry)
                .buttonStyle(.borderedProminent)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

// Shared utility function for formatting numbers
private func formatNumber(_ value: Double) -> String {
    if value >= 1_000_000 {
        return String(format: "%.2fM", value / 1_000_000)
    } else if value >= 1_000 {
        return String(format: "%.2fK", value / 1_000)
    }
    return String(format: "%.2f", value)
}
