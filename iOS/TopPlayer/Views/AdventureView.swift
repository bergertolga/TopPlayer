import SwiftUI

struct AdventureView: View {
    let userId: String
    @StateObject private var viewModel: AdventureViewModel
    
    init(userId: String) {
        self.userId = userId
        _viewModel = StateObject(wrappedValue: AdventureViewModel(userId: userId))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else {
                        if viewModel.userHeroes.isEmpty && !viewModel.isLoading {
                            VStack(spacing: 16) {
                                Text("🎮")
                                    .font(.system(size: 60))
                                Text("No Heroes Yet")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("You need at least one hero to start adventures. Complete your registration to get your starter hero!")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding()
                            }
                            .padding()
                        }
                        
                        // Army/Formation Selection
                        if !viewModel.formations.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Select Formation")
                                    .font(.headline)
                                    .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(viewModel.formations) { formation in
                                            FormationButton(
                                                formation: formation,
                                                isSelected: viewModel.selectedFormationId == formation.id,
                                                onSelect: {
                                                    viewModel.selectedFormationId = formation.id
                                                }
                                            )
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                        }
                        
                        ForEach(viewModel.adventures) { adventure in
                            AdventureCard(
                                adventure: adventure,
                                progress: viewModel.getProgressForAdventure(adventure.id),
                                isUnlocked: viewModel.isAdventureUnlocked(adventure) && (viewModel.selectedFormationId != nil || !viewModel.userHeroes.isEmpty),
                                isSelected: viewModel.selectedFormationId != nil || viewModel.selectedHeroes.count > 0,
                                onStart: {
                                    Task {
                                        await viewModel.startBattle(adventure: adventure)
                                    }
                                }
                            )
                        }
                    }
                    
                    if let result = viewModel.lastBattleResult {
                        BattleResultView(result: result)
                    }
                }
                .padding()
            }
            .navigationTitle("Adventure Mode")
            .refreshable {
                await viewModel.loadAdventureData()
            }
            .task {
                await viewModel.loadAdventureData()
            }
        }
    }
}

struct AdventureCard: View {
    let adventure: Adventure
    let progress: AdventureProgress?
    let isUnlocked: Bool
    let isSelected: Bool
    let onStart: () -> Void
    
    private var difficultyColor: Color {
        if adventure.enemy_power < 100 { return .green }
        if adventure.enemy_power < 500 { return .yellow }
        if adventure.enemy_power < 1000 { return .orange }
        return .red
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with stage badge
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Text("STAGE")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                        Text("\(adventure.stage_number)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                    
                    Text(adventure.name)
                        .font(.title3)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                // Stars display
                if let progress = progress, progress.stars_earned > 0 {
                    VStack(spacing: 4) {
                        HStack(spacing: 2) {
                            ForEach(0..<3) { index in
                                Image(systemName: index < progress.stars_earned ? "star.fill" : "star")
                                    .font(.caption)
                                    .foregroundColor(index < progress.stars_earned ? .yellow : .gray.opacity(0.3))
                            }
                        }
                        Text("\(progress.stars_earned)/3")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(8)
                    .background(Color.yellow.opacity(0.1))
                    .cornerRadius(8)
                }
            }
            
            // Description
            if let description = adventure.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            Divider()
            
            // Stats Grid
            VStack(spacing: 12) {
                // Enemy Power
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "shield.fill")
                            .foregroundColor(difficultyColor)
                        Text("Enemy Power")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text("\(adventure.enemy_power)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(difficultyColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(difficultyColor.opacity(0.1))
                        .cornerRadius(6)
                }
                
                // Rewards Row
                HStack(spacing: 16) {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .foregroundColor(.yellow)
                        Text("\(adventure.energy_cost)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "bitcoinsign.circle.fill")
                            .foregroundColor(.orange)
                        Text("\(adventure.reward_coins)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    
                    if adventure.reward_gems > 0 {
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "diamond.fill")
                                .foregroundColor(.purple)
                            Text("\(adventure.reward_gems)")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                    }
                }
                .font(.caption)
            }
            
            // Start Button
            Button(action: {
                let impactFeedback = UIImpactFeedbackGenerator(style: .heavy)
                impactFeedback.impactOccurred()
                onStart()
            }) {
                HStack {
                    Image(systemName: isUnlocked ? "play.circle.fill" : "lock.fill")
                        .font(.title3)
                    Text(isUnlocked ? "Start Battle" : "Locked")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    isUnlocked ?
                    LinearGradient(colors: [Color.blue, Color.blue.opacity(0.8)], startPoint: .leading, endPoint: .trailing) :
                    LinearGradient(colors: [Color.gray.opacity(0.5), Color.gray.opacity(0.3)], startPoint: .leading, endPoint: .trailing)
                )
                .foregroundColor(.white)
                .cornerRadius(12)
                .shadow(color: isUnlocked ? Color.blue.opacity(0.3) : Color.clear, radius: 5, x: 0, y: 2)
            }
            .disabled(!isUnlocked)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 15)
                .fill(Color(.systemGray6))
                .overlay(
                    RoundedRectangle(cornerRadius: 15)
                        .stroke(isUnlocked ? Color.blue.opacity(0.2) : Color.clear, lineWidth: 2)
                )
                .shadow(color: isUnlocked ? Color.blue.opacity(0.1) : Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        )
        .opacity(isUnlocked ? 1.0 : 0.6)
    }
}

struct FormationButton: View {
    let formation: Formation
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 4) {
                Text(formation.name)
                    .font(.caption)
                    .fontWeight(.semibold)
                Text("\(Int(formation.totalPower))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(8)
        }
    }
}

struct HeroSelectionView: View {
    let heroes: [UserHero]
    @Binding var selectedHeroes: Set<String>
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(heroes) { hero in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(hero.name ?? "Unknown")
                                .font(.headline)
                            Text("Power: \(hero.currentPower)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        if selectedHeroes.contains(hero.id) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        if selectedHeroes.contains(hero.id) {
                            selectedHeroes.remove(hero.id)
                        } else {
                            selectedHeroes.insert(hero.id)
                        }
                    }
                }
            }
            .navigationTitle("Select Heroes")
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

struct BattleResultView: View {
    let result: BattleResult
    @State private var isPresented = true
    @State private var animateStars = false
    @State private var animateRewards = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Victory/Defeat Header
            VStack(spacing: 12) {
                Text(result.victory ? "🎉" : "💀")
                    .font(.system(size: 60))
                    .scaleEffect(animateStars ? 1.2 : 1.0)
                    .animation(.spring(response: 0.5), value: animateStars)
                
                Text(result.victory ? "VICTORY!" : "DEFEAT")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(result.victory ? .green : .red)
            }
            .padding(.top)
            
            if result.victory {
                // Stars Display
                HStack(spacing: 8) {
                    ForEach(0..<3) { index in
                        Image(systemName: index < result.stars ? "star.fill" : "star")
                            .font(.title)
                            .foregroundColor(index < result.stars ? .yellow : .gray.opacity(0.3))
                            .scaleEffect(index < result.stars && animateStars ? 1.3 : 1.0)
                            .animation(.spring(response: 0.4, dampingFraction: 0.6).delay(Double(index) * 0.1), value: animateStars)
                    }
                }
                .padding(.vertical, 8)
                
                // Rewards Card
                VStack(spacing: 16) {
                    Text("Rewards")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            Image(systemName: "bitcoinsign.circle.fill")
                                .font(.title2)
                                .foregroundColor(.orange)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(result.rewards.coins)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("Coins")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(10)
                        
                        if result.rewards.gems > 0 {
                            HStack(spacing: 12) {
                                Image(systemName: "diamond.fill")
                                    .font(.title2)
                                    .foregroundColor(.purple)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(result.rewards.gems)")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                    Text("Gems")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                            .padding()
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(10)
                        }
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 15)
                        .fill(
                            LinearGradient(
                                colors: [Color.green.opacity(0.2), Color.green.opacity(0.05)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 15)
                                .stroke(Color.green.opacity(0.3), lineWidth: 2)
                        )
                )
                .scaleEffect(animateRewards ? 1.0 : 0.9)
                .opacity(animateRewards ? 1.0 : 0.0)
                .animation(.spring(response: 0.6).delay(0.3), value: animateRewards)
            } else {
                Text("Try again with a stronger formation!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: {
                isPresented = false
            }) {
                Text("Continue")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(result.victory ? Color.green : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.2), radius: 20, x: 0, y: 10)
        )
        .padding()
        .onAppear {
            animateStars = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                animateRewards = true
            }
        }
        .background(Color.gray.opacity(0.1))
        .cornerRadius(15)
    }
}

