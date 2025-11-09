import SwiftUI

struct DashboardView: View {
    let userId: String
    @StateObject private var viewModel = CityViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if let cityState = viewModel.cityState {
                        // Collect All Button - PRIMARY ACTION (Most Prominent)
                        let hasResourcesToCollect = cityState.buildings.contains { $0.hasResourcesToCollect }
                        let totalStorageAmount = cityState.buildings.reduce(0) { $0 + $1.totalStorageAmount }
                        
                        Button(action: {
                            // Haptic feedback
                            let impactFeedback = UIImpactFeedbackGenerator(style: .heavy)
                            impactFeedback.impactOccurred()
                            
                            Task {
                                await viewModel.collectFromBuilding(buildingId: nil)
                            }
                        }) {
                            HStack(spacing: 16) {
                                Image(systemName: hasResourcesToCollect ? "arrow.down.circle.fill" : "checkmark.circle.fill")
                                    .font(.system(size: 32))
                                    .symbolEffect(.bounce, value: hasResourcesToCollect)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Collect All Resources")
                                        .font(.title3)
                                        .fontWeight(.bold)
                                    
                                    if hasResourcesToCollect {
                                        Text("\(formatNumber(totalStorageAmount)) resources ready")
                                            .font(.subheadline)
                                            .opacity(0.9)
                                    } else {
                                        Text("All resources collected")
                                            .font(.subheadline)
                                            .opacity(0.8)
                                    }
                                }
                                
                                Spacer()
                                
                                if hasResourcesToCollect {
                                    Image(systemName: "arrow.right.circle.fill")
                                        .font(.title2)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(20)
                            .background(
                                LinearGradient(
                                    colors: hasResourcesToCollect ? [Color.green, Color.green.opacity(0.8)] : [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(20)
                            .shadow(color: hasResourcesToCollect ? Color.green.opacity(0.3) : Color.clear, radius: 10, x: 0, y: 5)
                        }
                        .disabled(viewModel.isLoading || !hasResourcesToCollect)
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                        
                        // Production Preview
                        ProductionPreviewCard(buildings: cityState.buildings, population: cityState.city.population)
                        
                        // City Overview Card
                        CityOverviewCard(city: cityState.city)
                        
                        // Resources Summary
                        ResourcesSummaryCard(resources: cityState.resources)
                        
                        // Warehouse Capacity
                        if let warehouse = cityState.warehouse {
                            WarehouseCapacityCard(
                                capacity: warehouse.capacity,
                                level: warehouse.level,
                                currentResources: cityState.resources
                            )
                        }
                        
                        // Key Metrics
                        KeyMetricsCard(
                            population: cityState.city.population,
                            happiness: cityState.city.happiness,
                            level: cityState.city.level
                        )
                        
                        // Recent Activity
                        RecentActivityCard(viewModel: viewModel)
                        
                        // Tips Card
                        TipsCard()
                        
                        // Loading overlay (subtle, doesn't hide content)
                        if viewModel.isLoading {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Refreshing...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(Color(.systemGray6).opacity(0.8))
                            .cornerRadius(10)
                        }
                    } else if viewModel.errorMessage != nil {
                        // Show error banner at top, but keep showing last known state if available
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text(viewModel.errorMessage ?? "Error loading data")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Button("Retry") {
                                    Task {
                                        await viewModel.loadCity()
                                    }
                                }
                                .font(.caption)
                                .buttonStyle(.bordered)
                            }
                            .padding()
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(10)
                            
                            if viewModel.cityState == nil {
                                // Only show full loading state if we have no data at all
                                VStack(spacing: 16) {
                                    ProgressView()
                                    Text("Loading city data...")
                                        .foregroundColor(.secondary)
                                }
                                .padding()
                            }
                        }
                    } else {
                        // Initial loading state
                        VStack(spacing: 16) {
                            ProgressView()
                            Text("Loading city data...")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadCity()
            }
            .task {
                viewModel.userId = userId
                await viewModel.loadCity()
            }
            .onReceive(Timer.publish(every: 30.0, on: .main, in: .common).autoconnect()) { _ in
                // Silent background refresh every 30 seconds (doesn't show loading)
                Task {
                    // Only refresh if not already loading
                    if !viewModel.isLoading {
                        await viewModel.loadCity(showLoading: false)
                    }
                }
            }
        }
    }
}

struct CityOverviewCard: View {
    let city: City
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("🏛️")
                    .font(.system(size: 40))
                VStack(alignment: .leading) {
                    Text(city.name)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(city.region_name ?? "Unknown Region")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("Level \(city.level)")
                        .font(.headline)
                    Text("\(city.population) pop")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Happiness bar
            HStack {
                Text("Happiness:")
                    .font(.caption)
                ProgressView(value: city.happiness, total: 1.0)
                    .tint(happinessColor(city.happiness))
                Text("\(Int(city.happiness * 100))%")
                    .font(.caption)
                    .frame(width: 40)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func happinessColor(_ happiness: Double) -> Color {
        if happiness >= 0.8 { return .green }
        if happiness >= 0.6 { return .yellow }
        return .red
    }
}

struct ResourcesSummaryCard: View {
    let resources: [CityResource]
    @State private var showAll = false
    
    var displayedResources: [CityResource] {
        showAll ? resources : Array(resources.prefix(6))
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Resources")
                    .font(.headline)
                Spacer()
                if resources.count > 6 {
                    Button(action: { showAll.toggle() }) {
                        Text(showAll ? "Show Less" : "Show All")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(displayedResources, id: \.code) { resource in
                    ResourceChip(resource: resource)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct ResourceChip: View {
    let resource: CityResource
    @State private var animateChange = false
    
    var body: some View {
        VStack(spacing: 4) {
            Text(resourceEmoji(resource.code))
                .font(.title3)
                .scaleEffect(animateChange ? 1.2 : 1.0)
                .animation(.spring(response: 0.3), value: animateChange)
            Text(formatNumber(resource.amount))
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(animateChange ? .green : .primary)
            Text(resource.code)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .onChange(of: resource.amount) { oldValue, newValue in
            if newValue > oldValue {
                animateChange = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    animateChange = false
                }
            }
        }
    }
    
    private func resourceEmoji(_ code: String) -> String {
        switch code {
        case "WOOD": return "🪵"
        case "STONE": return "🪨"
        case "ORE": return "⛏️"
        case "FOOD": return "🌾"
        case "FIBER": return "🧵"
        case "CLAY": return "🏺"
        case "COINS": return "💰"
        case "PLANKS": return "🪵"
        case "INGOTS": return "⚙️"
        case "BRICKS": return "🧱"
        case "FABRIC": return "🧵"
        case "TOOLS": return "🔧"
        default: return "📦"
        }
    }
}

struct KeyMetricsCard: View {
    let population: Int
    let happiness: Double
    let level: Int
    
    var body: some View {
        HStack(spacing: 20) {
            MetricItem(icon: "👥", label: "Population", value: "\(population)")
            MetricItem(icon: "😊", label: "Happiness", value: "\(Int(happiness * 100))%")
            MetricItem(icon: "⭐", label: "Level", value: "\(level)")
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct MetricItem: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(icon)
                .font(.title2)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct RecentActivityCard: View {
    @StateObject private var viewModel: CityViewModel
    
    init(viewModel: CityViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Activity")
                .font(.headline)
            
            if let collectResult = viewModel.collectResult {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Last Collection:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if !collectResult.collected.isEmpty {
                        ForEach(Array(collectResult.collected.keys.sorted().prefix(3)), id: \.self) { resource in
                            if let amount = collectResult.collected[resource], amount > 0 {
                                HStack {
                                    Text(resource)
                                        .font(.caption2)
                                    Spacer()
                                    Text("+\(Int(amount))")
                                        .font(.caption2)
                                        .foregroundColor(.green)
                                }
                            }
                        }
                    }
                    if collectResult.warehouseFull {
                        Text("⚠️ Warehouse Full")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
            } else {
                Text("No recent activity")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct ProductionPreviewCard: View {
    let buildings: [CityBuilding]
    let population: Int
    
    private var totalProduction: [String: Double] {
        var totals: [String: Double] = [:]
        for building in buildings {
            if let production = building.productionRate {
                for (resource, amount) in production {
                    totals[resource] = (totals[resource] ?? 0) + amount
                }
            }
            if let output = building.outputRate {
                for (resource, amount) in output {
                    totals[resource] = (totals[resource] ?? 0) + amount
                }
            }
        }
        return totals
    }
    
    private var totalConsumption: [String: Double] {
        var totals: [String: Double] = [:]
        // Building consumption
        for building in buildings {
            if let consumption = building.consumptionRate {
                for (resource, amount) in consumption {
                    totals[resource] = (totals[resource] ?? 0) + amount
                }
            }
        }
        // Population consumption (FOOD: 0.1 per pop, FABRIC: 0.05 per pop per minute)
        totals["FOOD"] = (totals["FOOD"] ?? 0) + Double(population) * 0.1
        totals["FABRIC"] = (totals["FABRIC"] ?? 0) + Double(population) * 0.05
        return totals
    }
    
    private var netProduction: [String: Double] {
        var net: [String: Double] = [:]
        let allResources = Set(totalProduction.keys).union(Set(totalConsumption.keys))
        for resource in allResources {
            let prod = totalProduction[resource] ?? 0
            let cons = totalConsumption[resource] ?? 0
            net[resource] = prod - cons
        }
        return net
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Production Per Minute")
                .font(.headline)
            
            if !totalProduction.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Producing:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    ForEach(Array(totalProduction.keys.sorted()), id: \.self) { resource in
                        if let amount = totalProduction[resource], amount > 0 {
                            HStack {
                                Text(resource)
                                    .font(.caption)
                                Spacer()
                                Text("+\(Int(amount))/min")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }
            }
            
            if !totalConsumption.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Consuming:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    ForEach(Array(totalConsumption.keys.sorted()), id: \.self) { resource in
                        if let amount = totalConsumption[resource], amount > 0 {
                            HStack {
                                Text(resource)
                                    .font(.caption)
                                Spacer()
                                Text("-\(Int(amount))/min")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                }
            }
            
            // Net Production
            if !netProduction.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Net Change:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    ForEach(Array(netProduction.keys.sorted()), id: \.self) { resource in
                        if let change = netProduction[resource], change != 0 {
                            HStack {
                                Text(resource)
                                    .font(.caption)
                                Spacer()
                                Text(change > 0 ? "+\(Int(change))/min" : "\(Int(change))/min")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(change > 0 ? .green : .red)
                            }
                        }
                    }
                }
            }
            
            if totalProduction.isEmpty && totalConsumption.isEmpty {
                Text("No active production")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title3)
                Text(label)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(10)
        }
    }
}

struct TipsCard: View {
    @State private var currentTip = 0
    
    private let tips = [
        "💡 Tip: Upgrade buildings to increase production rates",
        "💡 Tip: Keep your population fed and clothed for maximum happiness",
        "💡 Tip: Assign governors to boost production",
        "💡 Tip: Trade on the market to get resources you need",
        "💡 Tip: Create routes to transport resources between regions",
        "💡 Tip: Join a council to benefit from public works",
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("💡 Tips")
                    .font(.headline)
                Spacer()
                Button(action: {
                    withAnimation {
                        currentTip = (currentTip + 1) % tips.count
                    }
                }) {
                    Image(systemName: "arrow.right.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            
            Text(tips[currentTip])
                .font(.subheadline)
                .foregroundColor(.secondary)
                .animation(.easeInOut, value: currentTip)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
        .onAppear {
            // Rotate tips every 10 seconds
            Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { _ in
                withAnimation {
                    currentTip = (currentTip + 1) % tips.count
                }
            }
        }
    }
}

struct WarehouseCapacityCard: View {
    let capacity: Double
    let level: Int
    let currentResources: [CityResource]
    
    private var currentTotal: Double {
        currentResources.reduce(0) { $0 + max(0, $1.amount) }
    }
    
    private var usagePercent: Double {
        min(1.0, currentTotal / capacity)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("📦 Warehouse")
                    .font(.headline)
                Spacer()
                Text("Level \(level)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Capacity:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(formatNumber(currentTotal)) / \(formatNumber(capacity))")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                
                ProgressView(value: usagePercent, total: 1.0)
                    .tint(usagePercent > 0.9 ? .red : (usagePercent > 0.7 ? .orange : .green))
                    .scaleEffect(x: 1, y: 2, anchor: .center)
                
                if usagePercent > 0.9 {
                    Text("⚠️ Warehouse nearly full! Upgrade to increase capacity")
                        .font(.caption)
                        .foregroundColor(.red)
                } else if usagePercent > 0.7 {
                    Text("⚠️ Warehouse getting full")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

private func formatNumber(_ value: Double) -> String {
    if value >= 1_000_000 {
        return String(format: "%.1fM", value / 1_000_000)
    } else if value >= 1_000 {
        return String(format: "%.1fK", value / 1_000)
    }
    return String(format: "%.0f", value)
}
