import SwiftUI

struct CityView: View {
    let userId: String
    @StateObject private var viewModel = CityViewModel()
    @State private var showGovernorAssignment = false
    @State private var availableGovernors: [Governor] = []
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else if let cityState = viewModel.cityState {
                        // Buildings List
                        BuildingsList(
                            buildings: cityState.buildings,
                            onUpgrade: { buildingCode in
                                Task {
                                    await viewModel.upgradeBuilding(buildingCode)
                                }
                            },
                            onCollect: { buildingId in
                                Task {
                                    await viewModel.collectFromBuilding(buildingId: buildingId)
                                }
                            }
                        )
                        
                        // Governors Section
                        GovernorsSection(
                            governors: cityState.governors,
                            onAssign: {
                                Task {
                                    await loadAvailableGovernors()
                                    showGovernorAssignment = true
                                }
                            },
                            onUnassign: { governorId in
                                Task {
                                    await viewModel.unassignGovernor(governorId: governorId)
                        }
                            }
                        )
                    } else if let error = viewModel.errorMessage {
                        VStack(spacing: 16) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.orange)
                            Text("Error Loading City")
                                .font(.headline)
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Button("Retry") {
                                Task {
                                    await viewModel.loadCity()
                                }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                    } else {
                        VStack(spacing: 16) {
                            ProgressView()
                            Text("Loading city...")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("City")
            .refreshable {
                await viewModel.loadCity()
            }
            .task {
                viewModel.userId = userId
                await viewModel.loadCity()
            }
            .onReceive(Timer.publish(every: 5.0, on: .main, in: .common).autoconnect()) { _ in
                // Auto-refresh every 5 seconds
                Task {
                    await viewModel.loadCity()
                }
            }
            .sheet(isPresented: $showGovernorAssignment) {
                GovernorAssignmentSheet(
                    availableGovernors: availableGovernors,
                    assignedGovernors: viewModel.cityState?.governors ?? [],
                    buildings: viewModel.cityState?.buildings ?? [],
                    onAssign: { governorId, slot, buildingId in
                        Task {
                            await viewModel.assignGovernor(
                                governorId: governorId,
                                slot: slot,
                                buildingId: buildingId
                            )
                            showGovernorAssignment = false
                        }
                    }
                )
            }
            .overlay(alignment: .top) {
                if viewModel.showCollectNotification,
                   let collectResult = viewModel.collectResult {
                    CollectResultNotification(
                        result: collectResult,
                        isPresented: $viewModel.showCollectNotification
                    )
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .animation(.spring(response: 0.3), value: viewModel.showCollectNotification)
                }
                
                if viewModel.showUpgradeSuccess,
                   let buildingCode = viewModel.upgradedBuilding {
                    UpgradeSuccessNotification(
                        buildingCode: buildingCode,
                        isPresented: $viewModel.showUpgradeSuccess
                    )
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .animation(.spring(response: 0.3), value: viewModel.showUpgradeSuccess)
                }
            }
        }
    }
    
    private func loadAvailableGovernors() async {
        do {
            availableGovernors = try await NetworkService.shared.getAvailableGovernors(userId: userId)
        } catch {
            viewModel.errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

struct BuildingsList: View {
    let buildings: [CityBuilding]
    let onUpgrade: (String) -> Void
    let onCollect: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Buildings")
                .font(.headline)
                .padding(.horizontal)
            
            ForEach(buildings, id: \.code) { building in
                BuildingRow(
                    building: building,
                    onUpgrade: { onUpgrade(building.code) },
                    onCollect: building.hasResourcesToCollect ? { 
                        onCollect(building.code)
                    } : nil
                )
            }
        }
    }
}

struct BuildingRow: View {
    let building: CityBuilding
    let onUpgrade: () -> Void
    let onCollect: (() -> Void)?
    @State private var showDetails = false
    @State private var animateCollect = false
    
    private var buildingIcon: String {
        switch building.category.lowercased() {
        case "production": return "🏭"
        case "military": return "⚔️"
        case "infrastructure": return "🏗️"
        case "resource": return "⛏️"
        default: return "🏛️"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with icon and level badge
            HStack(alignment: .top, spacing: 12) {
                // Building Icon
                Text(buildingIcon)
                    .font(.system(size: 40))
                    .frame(width: 50, height: 50)
                    .background(
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: building.hasResourcesToCollect ? [Color.green.opacity(0.3), Color.green.opacity(0.1)] : [Color.blue.opacity(0.2), Color.blue.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .overlay(
                        Circle()
                            .stroke(building.hasResourcesToCollect ? Color.green : Color.blue.opacity(0.3), lineWidth: 2)
                    )
                    .scaleEffect(animateCollect ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3), value: animateCollect)
                
                VStack(alignment: .leading, spacing: 6) {
        HStack {
                Text(building.name)
                    .font(.headline)
                        Spacer()
                        // Level Badge
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                            Text("\(building.level)")
                                .font(.caption)
                                .fontWeight(.bold)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(8)
                    }
                    
                Text(building.category.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    
                    if building.is_active == 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "pause.circle.fill")
                                .font(.caption2)
                            Text("Paused")
                                .font(.caption)
                        }
                        .foregroundColor(.red)
                    }
                }
            }
            
            // Storage Display with visual indicator
            if let storage = building.storage, !storage.isEmpty, let capacity = building.storageCapacity {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "archivebox.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                        Text("Storage")
                            .font(.subheadline)
                            .fontWeight(.semibold)
            Spacer()
                        Text("\(Int(building.totalStorageAmount)) / \(Int(capacity))")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor((building.storagePercent ?? 0) > 0.9 ? .red : .primary)
                    }
                    
                    // Visual progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(.systemGray5))
                                .frame(height: 8)
                            
                            RoundedRectangle(cornerRadius: 4)
                                .fill(
                                    LinearGradient(
                                        colors: (building.storagePercent ?? 0) > 0.9 ? [Color.red, Color.orange] : [Color.green, Color.blue],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geometry.size.width * (building.storagePercent ?? 0), height: 8)
                                .animation(.spring(), value: building.storagePercent)
                        }
                    }
                    .frame(height: 8)
                    
                    // Resource chips
                    if building.hasResourcesToCollect {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(Array(storage.keys.sorted()), id: \.self) { resource in
                                    if let amount = storage[resource], amount > 0 {
                                        HStack(spacing: 4) {
                                            Text(resourceEmoji(resource))
                                                .font(.caption2)
                                            Text("\(Int(amount))")
                                                .font(.caption)
                                                .fontWeight(.semibold)
                                        }
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(
                                            LinearGradient(
                                                colors: [Color.green.opacity(0.3), Color.green.opacity(0.1)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .foregroundColor(.green)
                                        .cornerRadius(6)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 6)
                                                .stroke(Color.green.opacity(0.5), lineWidth: 1)
                                        )
                                    }
                                }
                            }
                        }
                        
                        if let onCollect = onCollect {
                            Button(action: {
                                animateCollect = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    animateCollect = false
                                }
                                let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                                impactFeedback.impactOccurred()
                                onCollect()
                            }) {
                                HStack {
                                    Image(systemName: "arrow.down.circle.fill")
                                        .font(.title3)
                                    Text("Collect All")
                                        .fontWeight(.semibold)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(
                                    LinearGradient(
                                        colors: [Color.green, Color.green.opacity(0.8)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .foregroundColor(.white)
                                .cornerRadius(10)
                                .shadow(color: Color.green.opacity(0.3), radius: 5, x: 0, y: 2)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
            }
            
            // Production/Consumption Display - Compact visual chips
            if let production = building.productionRate, !production.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                        Text("Production")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                    }
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Array(production.keys.sorted()), id: \.self) { resource in
                                if let amount = production[resource], amount > 0 {
                                    HStack(spacing: 3) {
                                        Text("+")
                                            .font(.caption2)
                                            .foregroundColor(.green)
                                        Text("\(Int(amount))/min")
                                            .font(.caption2)
                                            .fontWeight(.medium)
                                        Text(resource)
                                            .font(.caption2)
                                    }
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Color.green.opacity(0.1))
                                    .foregroundColor(.green)
                                    .cornerRadius(4)
                                }
                            }
                        }
                    }
                }
            }
            
            if let consumption = building.consumptionRate, !consumption.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.circle.fill")
                            .foregroundColor(.orange)
                            .font(.caption)
                        Text("Consumption")
                        .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                    }
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Array(consumption.keys.sorted()), id: \.self) { resource in
                                if let amount = consumption[resource], amount > 0 {
                                    HStack(spacing: 3) {
                                        Text("-")
                                            .font(.caption2)
                                            .foregroundColor(.orange)
                                        Text("\(Int(amount))/min")
                                            .font(.caption2)
                                            .fontWeight(.medium)
                                        Text(resource)
                                            .font(.caption2)
                                    }
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Color.orange.opacity(0.1))
                                    .foregroundColor(.orange)
                                    .cornerRadius(4)
                                }
                            }
                        }
                    }
                }
            }
            
            // Action Buttons Row
            HStack(spacing: 8) {
                Button(action: { showDetails = true }) {
                    HStack(spacing: 4) {
                        Image(systemName: "info.circle.fill")
                        Text("Details")
                    }
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                Button(action: {
                    let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                    impactFeedback.impactOccurred()
                    onUpgrade()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                Text("Upgrade")
                        if let cost = building.upgradeCost {
                            Text("\(Int(cost))💰")
                                .fontWeight(.bold)
                        }
                    }
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        building.canUpgrade == false ? Color.gray.opacity(0.3) : 
                        LinearGradient(colors: [Color.blue, Color.blue.opacity(0.8)], startPoint: .leading, endPoint: .trailing)
                    )
                    .foregroundColor(.white)
                    .cornerRadius(8)
                    .shadow(radius: building.canUpgrade == false ? 0 : 3)
                }
                .disabled(building.canUpgrade == false)
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 15)
                .fill(Color(.systemGray6))
                .shadow(color: building.hasResourcesToCollect ? Color.green.opacity(0.2) : Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(building.hasResourcesToCollect ? Color.green.opacity(0.3) : Color.clear, lineWidth: 2)
        )
        .sheet(isPresented: $showDetails) {
            BuildingDetailSheet(building: building)
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

struct BuildingDetailSheet: View {
    let building: CityBuilding
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Building Info
                    VStack(alignment: .leading, spacing: 8) {
                        Text(building.name)
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(building.category.capitalized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text("Level \(building.level)")
                            .font(.headline)
                    }
                    
                    Divider()
                    
                    // Production
                    if let production = building.productionRate, !production.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Production")
                                .font(.headline)
                            ForEach(Array(production.keys.sorted()), id: \.self) { resource in
                                if let amount = production[resource], amount > 0 {
                                    HStack {
                                        Text(resource)
                                        Spacer()
                                        Text("+\(Int(amount))/min")
                                            .foregroundColor(.green)
                                            .fontWeight(.semibold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Consumption
                    if let consumption = building.consumptionRate, !consumption.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Consumption")
                                .font(.headline)
                            ForEach(Array(consumption.keys.sorted()), id: \.self) { resource in
                                if let amount = consumption[resource], amount > 0 {
                                    HStack {
                                        Text(resource)
                                        Spacer()
                                        Text("-\(Int(amount))/min")
                                            .foregroundColor(.orange)
                                            .fontWeight(.semibold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Output
                    if let output = building.outputRate, !output.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Output")
                                .font(.headline)
                            ForEach(Array(output.keys.sorted()), id: \.self) { resource in
                                if let amount = output[resource], amount > 0 {
                                    HStack {
                                        Text(resource)
                                        Spacer()
                                        Text("+\(Int(amount))/min")
                                            .foregroundColor(.blue)
                                            .fontWeight(.semibold)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Upgrade Info
                    if let upgradeCost = building.upgradeCost, let canUpgrade = building.canUpgrade, let maxLevel = building.maxLevel {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Upgrade")
                                .font(.headline)
                            HStack {
                                Text("Cost:")
                                Spacer()
                                Text("\(upgradeCost) 💰")
                                    .fontWeight(.semibold)
                            }
                            HStack {
                                Text("Max Level:")
                                Spacer()
                                Text("\(maxLevel)")
                            }
                            if !canUpgrade {
                                Text("Building at max level")
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    // Status
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Status")
                            .font(.headline)
                        HStack {
                            Text("Active:")
                            Spacer()
                            Text(building.is_active == 1 ? "Yes" : "No")
                                .foregroundColor(building.is_active == 1 ? .green : .red)
                        }
                        HStack {
                            Text("Workers:")
                            Spacer()
                            Text("\(building.workers)")
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Building Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct GovernorsSection: View {
    let governors: [CityGovernor]
    let onAssign: () -> Void
    let onUnassign: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
            Text("Governors")
                .font(.headline)
                Spacer()
                Button(action: onAssign) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.blue)
                }
            }
                .padding(.horizontal)
            
            if governors.isEmpty {
                Text("No governors assigned")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            } else {
                ForEach(governors, id: \.governor_id) { governor in
                    GovernorRow(
                        governor: governor,
                        onUnassign: { onUnassign(governor.governor_id) }
                    )
                }
            }
        }
    }
}

struct GovernorRow: View {
    let governor: CityGovernor
    let onUnassign: () -> Void
    
    var body: some View {
        HStack {
            Text("👤")
                .font(.title2)
            VStack(alignment: .leading, spacing: 4) {
                Text(governor.name)
                    .font(.headline)
                Text(governor.rarity.capitalized)
                    .font(.caption)
                    .foregroundColor(rarityColor(governor.rarity))
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
            Text(governor.slot.capitalized)
                .font(.caption)
                .foregroundColor(.secondary)
                Button(action: onUnassign) {
                    Text("Remove")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
    
    private func rarityColor(_ rarity: String) -> Color {
        switch rarity {
        case "legendary": return .orange
        case "epic": return .purple
        case "rare": return .blue
        default: return .gray
        }
    }
}

struct GovernorAssignmentSheet: View {
    let availableGovernors: [Governor]
    let assignedGovernors: [CityGovernor]
    let buildings: [CityBuilding]
    let onAssign: (String, String, String?) -> Void
    
    @State private var selectedGovernor: Governor?
    @State private var selectedSlot: String = "city"
    @State private var selectedBuilding: CityBuilding?
    @Environment(\.dismiss) private var dismiss
    
    private var unassignedGovernors: [Governor] {
        let assignedIds = Set(assignedGovernors.map { $0.governor_id })
        return availableGovernors.filter { !assignedIds.contains($0.id) }
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Select Governor") {
                    if unassignedGovernors.isEmpty {
                        Text("All governors are assigned")
                            .foregroundColor(.secondary)
                    } else {
                        Picker("Governor", selection: $selectedGovernor) {
                            Text("None").tag(Optional<Governor>.none)
                            ForEach(unassignedGovernors) { governor in
                                Text(governor.name).tag(Optional<Governor>.some(governor))
                            }
                        }
                    }
                }
                
                if selectedGovernor != nil {
                    Section("Assignment Type") {
                        Picker("Slot", selection: $selectedSlot) {
                            Text("City").tag("city")
                            Text("Building").tag("building")
                        }
                    }
                    
                    if selectedSlot == "building" {
                        Section("Select Building") {
                            Picker("Building", selection: $selectedBuilding) {
                                Text("None").tag(Optional<CityBuilding>.none)
                                ForEach(buildings, id: \.code) { building in
                                    Text("\(building.name) (Level \(building.level))").tag(Optional<CityBuilding>.some(building))
                                }
                            }
                        }
                    }
                    
                    Section {
                        Button("Assign Governor") {
                            if let governor = selectedGovernor {
                                onAssign(
                                    governor.id,
                                    selectedSlot,
                                    selectedBuilding?.code
                                )
                            }
                        }
                        .disabled(selectedGovernor == nil || (selectedSlot == "building" && selectedBuilding == nil))
                    }
                }
            }
            .navigationTitle("Assign Governor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct CollectResultNotification: View {
    let result: CollectResult
    @Binding var isPresented: Bool
    @State private var animateChanges = false
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: result.success ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                    .font(.title)
                    .foregroundColor(result.success ? .green : .red)
                Text(result.success ? "Collected!" : "Collection Failed")
                    .font(.headline)
                Spacer()
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
            
            if result.success && !result.collected.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Resources Collected:")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    ForEach(Array(result.collected.keys.sorted()), id: \.self) { resource in
                        if let amount = result.collected[resource], amount > 0 {
                            HStack {
                                Text(resourceEmoji(resource))
                                    .font(.title3)
                                Text(resource)
                                    .font(.caption)
                                Spacer()
                                Text("+\(formatNumber(amount))")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.green)
                                    .scaleEffect(animateChanges ? 1.2 : 1.0)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
                .onAppear {
                    withAnimation(.spring(response: 0.3).repeatCount(1, autoreverses: true)) {
                        animateChanges = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        animateChanges = false
                    }
                }
            }
            
            if result.warehouseFull {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Warehouse is full!")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            
            if let error = result.error {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(radius: 10)
        .padding()
    }
    
    private func formatNumber(_ value: Double) -> String {
        if abs(value) >= 1000 {
            return String(format: "%.1fk", value / 1000)
        }
        return String(format: "%.0f", value)
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
    
    private func happinessColor(_ happiness: Double) -> Color {
        if happiness >= 0.8 { return .green }
        if happiness >= 0.6 { return .yellow }
        return .red
    }
}

struct UpgradeSuccessNotification: View {
    let buildingCode: String
    @Binding var isPresented: Bool
    @State private var animate = false
    
    var body: some View {
        HStack {
            Image(systemName: "checkmark.circle.fill")
                .font(.title2)
                .foregroundColor(.green)
                .scaleEffect(animate ? 1.2 : 1.0)
            Text("\(buildingCode) upgraded successfully! 🎉")
                .font(.headline)
            Spacer()
            Button(action: { isPresented = false }) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal)
        .onAppear {
            withAnimation(.spring(response: 0.3).repeatCount(2, autoreverses: true)) {
                animate = true
            }
        }
    }
}


