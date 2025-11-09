import SwiftUI

struct IdleView: View {
    let userId: String
    @StateObject private var viewModel: GameViewModel
    
    init(userId: String) {
        self.userId = userId
        _viewModel = StateObject(wrappedValue: GameViewModel(userId: userId))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Currency Display
                    if let progress = viewModel.userProgress {
                        CurrencyDisplay(progress: progress)
                    }
                    
                    // Offline Earnings Banner
                    if let earnings = viewModel.offlineEarnings, 
                       (earnings.coins > 0 || earnings.gems > 0) {
                        OfflineEarningsBanner(earnings: earnings)
                    }
                    
                    // Heroes Section
                    HeroesSection(
                        heroes: viewModel.userHeroes,
                        onUpgrade: { heroId in
                            Task {
                                await viewModel.upgradeHero(userHeroId: heroId)
                            }
                        }
                    )
                    
                    // All Heroes (for unlocking)
                    if !viewModel.allHeroes.isEmpty {
                        AllHeroesSection(heroes: viewModel.allHeroes)
                    }
                }
                .padding()
            }
            .navigationTitle("Idle Adventure")
            .refreshable {
                await viewModel.loadGameState()
            }
            .task {
                await viewModel.loadGameState()
            }
        }
    }
}

struct CurrencyDisplay: View {
    let progress: UserProgress
    
    var body: some View {
        HStack(spacing: 30) {
            VStack {
                Text("💰")
                    .font(.system(size: 40))
                Text("\(formatNumber(progress.total_currency))")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Coins")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            VStack {
                Text("💎")
                    .font(.system(size: 40))
                Text("\(formatNumber(progress.premium_currency))")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Gems")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            VStack {
                Text("⚡")
                    .font(.system(size: 40))
                Text("\(progress.energy)/\(progress.max_energy)")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Energy")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(15)
    }
    
    private func formatNumber(_ number: Int) -> String {
        if number >= 1_000_000 {
            return String(format: "%.1fM", Double(number) / 1_000_000)
        } else if number >= 1_000 {
            return String(format: "%.1fK", Double(number) / 1_000)
        }
        return "\(number)"
    }
}

struct OfflineEarningsBanner: View {
    let earnings: OfflineEarnings
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🎁")
                    .font(.title2)
                Text("Offline Earnings")
                    .font(.headline)
                Spacer()
            }
            
            HStack {
                if earnings.coins > 0 {
                    Label("\(formatNumber(earnings.coins)) coins", systemImage: "bitcoinsign.circle")
                }
                if earnings.gems > 0 {
                    Label("\(earnings.gems) gems", systemImage: "diamond")
                }
            }
            .font(.subheadline)
            
            Text("You were away for \(formatTime(earnings.timeOffline))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.2), Color.purple.opacity(0.2)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(15)
    }
    
    private func formatNumber(_ number: Int) -> String {
        if number >= 1_000_000 {
            return String(format: "%.1fM", Double(number) / 1_000_000)
        } else if number >= 1_000 {
            return String(format: "%.1fK", Double(number) / 1_000)
        }
        return "\(number)"
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

struct HeroesSection: View {
    let heroes: [UserHero]
    let onUpgrade: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your Heroes")
                .font(.title2)
                .fontWeight(.bold)
            
            if heroes.isEmpty {
                Text("No heroes yet. Complete adventures or purchase hero packs!")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                ForEach(heroes) { hero in
                    HeroCard(hero: hero, onUpgrade: { onUpgrade(hero.id) })
                }
            }
        }
    }
}

struct HeroCard: View {
    let hero: UserHero
    let onUpgrade: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(hero.name ?? "Unknown")
                        .font(.headline)
                    if let rarity = hero.rarity {
                        Text(rarity.emoji)
                    }
                }
                
                HStack {
                    Text("Level \(hero.level)")
                    if hero.stars > 0 {
                        Text("⭐ \(hero.stars)")
                    }
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                
                Text("Power: \(hero.currentPower)")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            
            Spacer()
            
            Button(action: onUpgrade) {
                Text("Upgrade")
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct AllHeroesSection: View {
    let heroes: [Hero]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Heroes")
                .font(.title2)
                .fontWeight(.bold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(heroes) { hero in
                        HeroPreviewCard(hero: hero)
                    }
                }
            }
        }
    }
}

struct HeroPreviewCard: View {
    let hero: Hero
    
    var body: some View {
        VStack(spacing: 8) {
            Text(hero.rarity.emoji)
                .font(.system(size: 50))
            
            Text(hero.name)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
            
            Text("Power: \(hero.base_power)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(width: 100)
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}


