import SwiftUI

struct ContentView: View {
    @State private var userId: String?
    @StateObject private var purchaseService = PurchaseService.shared
    
    var body: some View {
        Group {
            if let userId = userId ?? GameStateService.shared.currentUserId {
                MainTabView(userId: userId)
                    .overlay(alignment: .top) {
                        if purchaseService.showRewardNotification,
                           let rewards = purchaseService.rewardNotification {
                            PurchaseRewardNotification(
                                rewards: rewards,
                                isPresented: $purchaseService.showRewardNotification
                            )
                            .transition(.move(edge: .top).combined(with: .opacity))
                            .animation(.spring(), value: purchaseService.showRewardNotification)
                        }
                    }
            } else {
                LoginView()
            }
        }
        .onAppear {
            userId = GameStateService.shared.currentUserId
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("UserDidLogin"))) { _ in
            userId = GameStateService.shared.currentUserId
        }
    }
}

struct MainTabView: View {
    let userId: String
    
    var body: some View {
        TabView {
            DashboardView(userId: userId)
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }
            
            CityView(userId: userId)
                .tabItem {
                    Label("City", systemImage: "building.2.fill")
                }
            
            MarketView(userId: userId)
                .tabItem {
                    Label("Market", systemImage: "cart.fill")
                }
            
            CouncilView(userId: userId)
                .tabItem {
                    Label("Council", systemImage: "person.3.fill")
                }
            
            MapView(userId: userId)
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }
            
            EventsView(userId: userId)
                .tabItem {
                    Label("Events", systemImage: "calendar")
                }
            
            ArmyView(userId: userId)
                .tabItem {
                    Label("Army", systemImage: "shield.fill")
                }
        }
    }
}

struct PurchaseRewardNotification: View {
    let rewards: PurchaseRewards
    @Binding var isPresented: Bool
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "gift.fill")
                    .font(.title)
                    .foregroundColor(.yellow)
                Text("Purchase Complete!")
                    .font(.headline)
                Spacer()
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
            
            VStack(alignment: .leading, spacing: 8) {
                if let coins = rewards.coins, coins > 0 {
                    RewardRow(icon: "🪙", label: "Coins", amount: "\(coins)")
                }
                if let gems = rewards.gems, gems > 0 {
                    RewardRow(icon: "💎", label: "Gems", amount: "\(gems)")
                }
                if let energy = rewards.energy, energy > 0 {
                    RewardRow(icon: "⚡", label: "Energy", amount: "\(energy)")
                }
                if let heroId = rewards.heroId {
                    RewardRow(icon: "🦸", label: "Hero", amount: heroId)
                }
                if let multiplier = rewards.multiplier, multiplier > 1 {
                    RewardRow(icon: "✨", label: "Multiplier", amount: "\(Int(multiplier))x")
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(radius: 10)
        .padding()
    }
}

struct RewardRow: View {
    let icon: String
    let label: String
    let amount: String
    
    var body: some View {
        HStack {
            Text(icon)
                .font(.title3)
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(amount)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
    }
}

// ArmyViewModel - embedded here to ensure it's in the build target
@MainActor
class ArmyViewModel: ObservableObject {
    @Published var troops: [Troop] = []
    @Published var formations: [Formation] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showCreateFormation = false
    @Published var selectedFormationId: String?
    
    func loadTroops(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            troops = try await NetworkService.shared.getTroops(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func loadFormations(userId: String) async {
        do {
            formations = try await NetworkService.shared.getFormations(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

// Army View - embedded here to ensure it's in the build target
struct ArmyView: View {
    let userId: String
    @StateObject private var viewModel = ArmyViewModel()
    
    init(userId: String) {
        self.userId = userId
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else {
                        // Troops Section
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Your Army")
                                    .font(.headline)
                                Spacer()
                                Button(action: {
                                    Task {
                                        await viewModel.loadTroops(userId: userId)
                                    }
                                }) {
                                    Image(systemName: "arrow.clockwise")
                                }
                            }
                            
                            if viewModel.troops.isEmpty {
                                EmptyStateView(
                                    icon: "person.3.fill",
                                    title: "No Troops",
                                    message: "Train troops at the Barracks to build your army"
                                )
                            } else {
                                ForEach(viewModel.troops, id: \.id) { troop in
                                    TroopRow(troop: troop)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(15)
                        
                        // Formations Section
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Formations")
                                    .font(.headline)
                                Spacer()
                                Button(action: {
                                    viewModel.showCreateFormation = true
                                }) {
                                    Image(systemName: "plus.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                            
                            if viewModel.formations.isEmpty {
                                Text("No formations yet. Create one to use in adventures!")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(viewModel.formations, id: \.id) { formation in
                                    FormationRow(
                                        formation: formation,
                                        onSelect: {
                                            viewModel.selectedFormationId = formation.id
                                        },
                                        isSelected: viewModel.selectedFormationId == formation.id
                                    )
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(15)
                        
                        // Train Troops Button
                        NavigationLink(destination: TrainTroopsView(userId: userId)) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Train Troops")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(15)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Army")
            .refreshable {
                await viewModel.loadTroops(userId: userId)
                await viewModel.loadFormations(userId: userId)
            }
            .task {
                await viewModel.loadTroops(userId: userId)
                await viewModel.loadFormations(userId: userId)
            }
            .sheet(isPresented: $viewModel.showCreateFormation) {
                CreateFormationView(
                    userId: userId,
                    troops: viewModel.troops,
                    onDismiss: {
                        viewModel.showCreateFormation = false
                        Task {
                            await viewModel.loadFormations(userId: userId)
                        }
                    }
                )
            }
        }
    }
}

struct TroopRow: View {
    let troop: Troop
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(troop.troopName)
                    .font(.headline)
                Text(troop.category.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(troop.quantity)")
                    .font(.title3)
                    .fontWeight(.bold)
                Text("Level \(troop.level)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(Int(troop.totalPower)) Power")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
}

struct FormationRow: View {
    let formation: Formation
    let onSelect: () -> Void
    let isSelected: Bool
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(formation.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("\(Int(formation.totalPower)) Total Power")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(isSelected ? Color.green.opacity(0.1) : Color(.systemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
    }
}

struct TrainTroopsView: View {
    let userId: String
    @StateObject private var viewModel = TrainTroopsViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView("Loading troop types...")
                            .padding()
                    } else if viewModel.troopTypes.isEmpty {
                        EmptyStateView(
                            icon: "person.3.fill",
                            title: "No Troop Types",
                            message: "Troop types are being loaded..."
                        )
                    } else {
                        ForEach(viewModel.troopTypes) { troopType in
                            TroopTypeCard(
                                troopType: troopType,
                                onTrain: { quantity in
                                    Task {
                                        await viewModel.trainTroops(
                                            userId: userId,
                                            troopTypeId: troopType.id,
                                            quantity: quantity
                                        )
                                    }
                                }
                            )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Train Troops")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await viewModel.loadTroopTypes()
            }
        }
    }
}

struct TroopTypeCard: View {
    let troopType: TroopType
    let onTrain: (Int) -> Void
    @State private var quantity: String = "1"
    @State private var isTraining = false
    
    private var totalCostCoins: Int {
        (Int(quantity) ?? 0) * troopType.baseCostCoins
    }
    
    private var totalCostResources: [String: Int] {
        var costs: [String: Int] = [:]
        for (resource, amount) in troopType.baseCostResources {
            costs[resource] = (Int(quantity) ?? 0) * amount
        }
        return costs
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(troopType.name)
                        .font(.headline)
                    Text(troopType.category.capitalized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let desc = troopType.description {
                        Text(desc)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(troopType.basePower) Power")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                    Text("\(troopType.trainingTimeSeconds)s")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            // Costs
            VStack(alignment: .leading, spacing: 8) {
                Text("Cost per unit:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack {
                    Text("💰 \(troopType.baseCostCoins)")
                        .font(.caption)
                    if !troopType.baseCostResources.isEmpty {
                        ForEach(Array(troopType.baseCostResources.keys.sorted()), id: \.self) { resource in
                            Text("\(resource): \(troopType.baseCostResources[resource] ?? 0)")
                                .font(.caption)
                        }
                    }
                }
            }
            
            // Quantity Input
            HStack {
                Text("Quantity:")
                    .font(.subheadline)
                
                TextField("1", text: $quantity)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 80)
                
                Spacer()
                
                if let qty = Int(quantity), qty > 0 {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Total: 💰 \(totalCostCoins)")
                            .font(.caption)
                            .fontWeight(.semibold)
                        if !totalCostResources.isEmpty {
                            ForEach(Array(totalCostResources.keys.sorted()), id: \.self) { resource in
                                Text("\(resource): \(totalCostResources[resource] ?? 0)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            
            // Train Button
            Button(action: {
                guard let qty = Int(quantity), qty > 0 else { return }
                let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                impactFeedback.impactOccurred()
                onTrain(qty)
            }) {
                HStack {
                    if isTraining {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                        Text("Train \(quantity) \(troopType.name)")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background((Int(quantity) ?? 0) > 0 ? Color.green : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled((Int(quantity) ?? 0) <= 0 || isTraining)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct CreateFormationView: View {
    let userId: String
    let troops: [Troop]
    let onDismiss: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var formationName: String = ""
    @State private var selectedTroops: [String: Int] = [:] // troopTypeId -> quantity
    @State private var isCreating = false
    
    private var totalPower: Double {
        troops.reduce(0) { total, troop in
            let qty = selectedTroops[troop.troopTypeId] ?? 0
            return total + (troop.totalPower * Double(qty) / Double(troop.quantity))
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Formation Name
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Formation Name")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        TextField("My Formation", text: $formationName)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Available Troops
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Available Troops")
                            .font(.headline)
                        
                        if troops.isEmpty {
                            Text("No troops available. Train troops first!")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            ForEach(troops) { troop in
                                TroopSelectionRow(
                                    troop: troop,
                                    selectedQuantity: selectedTroops[troop.troopTypeId] ?? 0,
                                    onQuantityChange: { qty in
                                        if qty > 0 {
                                            selectedTroops[troop.troopTypeId] = qty
                                        } else {
                                            selectedTroops.removeValue(forKey: troop.troopTypeId)
                                        }
                                    }
                                )
                            }
                        }
                    }
                    
                    // Total Power
                    if !selectedTroops.isEmpty {
                        HStack {
                            Text("Total Power:")
                                .font(.headline)
                            Spacer()
                            Text("\(Int(totalPower))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                    }
                    
                    // Create Button
                    Button(action: {
                        Task {
                            await createFormation()
                        }
                    }) {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Create Formation")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(formationName.isEmpty || selectedTroops.isEmpty ? Color.gray : Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(formationName.isEmpty || selectedTroops.isEmpty || isCreating)
                }
                .padding()
            }
            .navigationTitle("Create Formation")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func createFormation() async {
        guard !formationName.isEmpty, !selectedTroops.isEmpty else { return }
        
        isCreating = true
        defer { isCreating = false }
        
        do {
            let _ = try await NetworkService.shared.createFormation(
                userId: userId,
                name: formationName,
                troopQuantities: selectedTroops
            )
            dismiss()
            onDismiss()
        } catch {
            // Handle error
        }
    }
}

struct TroopSelectionRow: View {
    let troop: Troop
    let selectedQuantity: Int
    let onQuantityChange: (Int) -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(troop.troopName)
                    .font(.headline)
                Text("\(troop.quantity) available • \(Int(troop.totalPower)) total power")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Stepper(value: Binding(
                get: { selectedQuantity },
                set: { onQuantityChange($0) }
            ), in: 0...troop.quantity) {
                Text("\(selectedQuantity)")
                    .font(.headline)
                    .frame(width: 40)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
}

@MainActor
class TrainTroopsViewModel: ObservableObject {
    @Published var troopTypes: [TroopType] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func loadTroopTypes() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            troopTypes = try await NetworkService.shared.getTroopTypes()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func trainTroops(userId: String, troopTypeId: String, quantity: Int) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await NetworkService.shared.trainTroops(
                userId: userId,
                troopTypeId: troopTypeId,
                quantity: quantity
            )
            // Reload troops after training
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

