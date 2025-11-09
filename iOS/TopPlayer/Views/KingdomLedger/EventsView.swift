import SwiftUI

struct EventsView: View {
    let userId: String
    @State private var pveNodes: [PveNode] = []
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if isLoading {
                        ProgressView("Loading PvE nodes...")
                            .padding()
                    } else if pveNodes.isEmpty {
                        EmptyStateView(
                            icon: "shield.fill",
                            title: "No PvE Nodes",
                            message: "Check back later for new challenges"
                        )
                    } else {
                        ForEach(pveNodes) { node in
                            PveNodeCard(node: node, userId: userId)
                                .transition(.opacity.combined(with: .scale))
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Events & PvE")
            .refreshable {
                await loadNodes()
            }
            .task {
                await loadNodes()
            }
        }
    }
    
    private func loadNodes() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            pveNodes = try await NetworkService.shared.getPveNodes(regionId: nil)
        } catch {
            // Handle error
        }
    }
}

struct PveNodeCard: View {
    let node: PveNode
    let userId: String
    @State private var isAttacking = false
    @State private var attackResult: AttackNodeResponse?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("⚔️")
                    .font(.title2)
                VStack(alignment: .leading, spacing: 4) {
                    Text(node.name)
                        .font(.headline)
                    Text("Tier \(node.tier)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if node.status == "active" {
                    Text("Active")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                } else {
                    Text("Respawning")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            HStack {
                Text("Power Required: \(node.power_required)")
                    .font(.subheadline)
                Spacer()
            }
            
            if node.status == "active" {
                Button(action: {
                    Task {
                        await attackNode()
                    }
                }) {
                    if isAttacking {
                        ProgressView()
                    } else {
                        Text("Attack")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isAttacking)
            }
            
            if let result = attackResult {
                if result.victory == true {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Victory! 🎉")
                            .font(.headline)
                            .foregroundColor(.green)
                        if let rewards = result.rewards {
                            Text("Rewards:")
                                .font(.subheadline)
                            ForEach(Array(rewards.keys), id: \.self) { key in
                                Text("\(key): \(formatNumber(rewards[key] ?? 0))")
                                    .font(.caption)
                            }
                        }
                    }
                    .padding()
                    .background(Color.green.opacity(0.1) as Color)
                    .cornerRadius(10)
                } else {
                    Text(result.error ?? "Attack failed")
                        .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func attackNode() async {
        isAttacking = true
        defer { isAttacking = false }
        
        do {
            attackResult = try await NetworkService.shared.attackNode(
                userId: userId,
                nodeId: node.id
            )
        } catch {
            attackResult = AttackNodeResponse(
                success: false,
                victory: nil,
                rewards: nil,
                error: error.localizedDescription,
                cityPower: nil,
                required: nil
            )
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
}
