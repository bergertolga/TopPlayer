import SwiftUI

struct ArmyView: View {
    let userId: String
    @StateObject private var viewModel = ArmyViewModel()
    
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

// Placeholder views - will be implemented
struct TrainTroopsView: View {
    let userId: String
    var body: some View {
        Text("Train Troops - Coming Soon")
            .navigationTitle("Train Troops")
    }
}

struct CreateFormationView: View {
    let userId: String
    let troops: [Troop]
    let onDismiss: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Create Formation - Coming Soon")
                .navigationTitle("Create Formation")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            dismiss()
                            onDismiss()
                        }
                    }
                }
        }
    }
}

