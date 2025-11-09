import SwiftUI

struct MapView: View {
    let userId: String
    @State private var routes: [Route] = []
    @State private var isLoading = false
    @State private var showCreateRoute = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if isLoading {
                        ProgressView()
                            .padding()
                    } else if routes.isEmpty {
                        VStack(spacing: 16) {
                            Text("No Active Routes")
                                .font(.headline)
                            Text("Create routes to transport resources between regions")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button("Create Route") {
                                showCreateRoute = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                    } else {
                        ForEach(routes) { route in
                            RouteCard(route: route)
                        }
                        
                        Button("Create Route") {
                            showCreateRoute = true
                        }
                        .buttonStyle(.bordered)
                        .padding(.top)
                    }
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Map & Routes")
            .refreshable {
                await loadRoutes()
            }
            .task {
                await loadRoutes()
            }
            .sheet(isPresented: $showCreateRoute) {
                CreateRouteSheet(
                    userId: userId,
                    onRouteCreated: {
                        showCreateRoute = false
                        Task {
                            await loadRoutes()
                        }
                    }
                )
            }
        }
    }
    
    private func loadRoutes() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            routes = try await NetworkService.shared.getRoutes(userId: userId)
        } catch {
            // Handle error
        }
    }
}

struct RouteCard: View {
    let route: Route
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("🚚")
                    .font(.title2)
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(route.from_region_name ?? "Unknown") → \(route.to_region_name ?? "Unknown")")
                        .font(.headline)
                    Text(route.resource_name ?? (route.resource_code ?? "Unknown"))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            
            HStack {
                Text("\(formatNumber(route.qty_per_trip)) per trip")
                Spacer()
                Text("Next: \(formatTime(route.next_departure))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func formatTime(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatNumber(_ value: Double) -> String {
        if value >= 1000 {
            return String(format: "%.1fk", value / 1000)
        }
        return String(format: "%.0f", value)
    }
}

struct CreateRouteSheet: View {
    let userId: String
    let onRouteCreated: () -> Void
    
    @State private var fromRegion: String = ""
    @State private var toRegion: String = ""
    @State private var resource: String = ""
    @State private var qtyPerTrip: String = ""
    @State private var repeats: Int? = nil
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss
    
    // Hardcoded for now - in production, fetch from API
    private let regions = ["Heartlands", "Highlands", "Coast"]
    private let resources = ["WOOD", "STONE", "ORE", "FOOD", "FIBER", "CLAY", "PLANKS", "BRICKS", "INGOTS", "FABRIC", "TOOLS", "COAL", "CHARCOAL", "SPICES", "GEMS", "MANA", "COINS"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Origin Region") {
                    Picker("From", selection: $fromRegion) {
                        Text("Select").tag("")
                        ForEach(regions, id: \.self) { region in
                            Text(region).tag(region)
                        }
                    }
                }
                
                Section("Destination Region") {
                    Picker("To", selection: $toRegion) {
                        Text("Select").tag("")
                        ForEach(regions, id: \.self) { region in
                            Text(region).tag(region)
                        }
                    }
                }
                
                Section("Resource") {
                    Picker("Resource", selection: $resource) {
                        Text("Select").tag("")
                        ForEach(resources, id: \.self) { res in
                            Text(res).tag(res)
                        }
                    }
                }
                
                Section("Quantity Per Trip") {
                    TextField("Amount", text: $qtyPerTrip)
                        .keyboardType(.decimalPad)
                }
                
                Section("Repeats (Optional)") {
                    TextField("Number of trips (-1 for infinite)", value: $repeats, format: .number)
                        .keyboardType(.numberPad)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                
                Section {
                    Button("Create Route") {
                        Task {
                            await createRoute()
                        }
                    }
                    .disabled(!isFormValid || isLoading)
                }
            }
            .navigationTitle("Create Route")
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
    
    private var isFormValid: Bool {
        !fromRegion.isEmpty &&
        !toRegion.isEmpty &&
        fromRegion != toRegion &&
        !resource.isEmpty &&
        !qtyPerTrip.isEmpty &&
        Double(qtyPerTrip) != nil &&
        Double(qtyPerTrip)! > 0
    }
    
    private func createRoute() async {
        guard let qty = Double(qtyPerTrip), qty > 0 else {
            errorMessage = "Invalid quantity"
            return
        }
        
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let request = CreateRouteRequest(
                fromRegion: fromRegion,
                toRegion: toRegion,
                resource: resource,
                qtyPerTrip: qty,
                repeats: repeats
            )
            
            _ = try await NetworkService.shared.createRoute(userId: userId, request: request)
            onRouteCreated()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

