import SwiftUI

struct DailyRewardsView: View {
    let userId: String
    @StateObject private var viewModel = DailyRewardsViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else {
                        // Streak Display
                        StreakDisplay(
                            currentStreak: viewModel.status?.currentStreak ?? 0,
                            longestStreak: viewModel.status?.longestStreak ?? 0
                        )
                        
                        // Daily Rewards Grid
                        DailyRewardsGrid(
                            currentStreak: viewModel.status?.currentStreak ?? 0,
                            canClaim: viewModel.status?.canClaim ?? false,
                            onClaim: {
                                Task {
                                    await viewModel.claimReward(userId: userId)
                                }
                            }
                        )
                        
                        // Claim Button
                        if viewModel.status?.canClaim == true {
                            Button(action: {
                                Task {
                                    await viewModel.claimReward(userId: userId)
                                }
                            }) {
                                HStack {
                                    Text("🎁")
                                    Text("Claim Daily Reward")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        colors: [Color.blue, Color.purple],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .foregroundColor(.white)
                                .font(.headline)
                                .cornerRadius(15)
                            }
                            .padding(.horizontal)
                        } else if let lastClaim = viewModel.status?.lastClaimDate {
                            VStack(spacing: 8) {
                                Text("Already claimed today!")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                
                                Text("Come back tomorrow for your next reward")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                        }
                        
                        // Last Claim Result
                        if let claimResult = viewModel.lastClaimResult {
                            ClaimResultView(result: claimResult)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Daily Rewards")
            .refreshable {
                await viewModel.loadStatus(userId: userId)
            }
            .task {
                await viewModel.loadStatus(userId: userId)
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
        }
    }
}

@MainActor
class DailyRewardsViewModel: ObservableObject {
    @Published var status: DailyRewardStatus?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastClaimResult: DailyRewardClaim?
    
    func loadStatus(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            status = try await NetworkService.shared.getDailyRewardStatus(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func claimReward(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let result = try await NetworkService.shared.claimDailyReward(userId: userId)
            lastClaimResult = result
            
            if result.success {
                // Reload status to update streak
                await loadStatus(userId: userId)
                
                AnalyticsService.shared.trackEvent("daily_reward_claimed", parameters: [
                    "streak": result.streak ?? 0
                ])
            } else {
                errorMessage = result.error ?? "Failed to claim reward"
            }
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

struct StreakDisplay: View {
    let currentStreak: Int
    let longestStreak: Int
    
    var body: some View {
        VStack(spacing: 12) {
            Text("🔥")
                .font(.system(size: 50))
            
            Text("\(currentStreak) Day Streak")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Best: \(longestStreak) days")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.2), Color.red.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(15)
    }
}

struct DailyRewardsGrid: View {
    let currentStreak: Int
    let canClaim: Bool
    let onClaim: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("7-Day Reward Cycle")
                .font(.headline)
                .padding(.horizontal)
            
            HStack(spacing: 8) {
                ForEach(1...7, id: \.self) { day in
                    DailyRewardDay(
                        day: day,
                        isClaimed: day <= currentStreak % 7 || (day == (currentStreak % 7) + 1 && canClaim),
                        isToday: day == (currentStreak % 7) + 1 && canClaim
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

struct DailyRewardDay: View {
    let day: Int
    let isClaimed: Bool
    let isToday: Bool
    
    var body: some View {
        VStack(spacing: 4) {
            Text("Day \(day)")
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Text(day == 7 ? "🎁" : day % 3 == 0 ? "💎" : "💰")
                .font(.title2)
            
            if isClaimed {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.caption)
            } else if isToday {
                Text("!")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isToday ? Color.orange.opacity(0.2) : (isClaimed ? Color.green.opacity(0.1) : Color.gray.opacity(0.1)))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isToday ? Color.orange : Color.clear, lineWidth: 2)
        )
    }
}

struct ClaimResultView: View {
    let result: DailyRewardClaim
    
    var body: some View {
        if result.success, let reward = result.reward {
            VStack(spacing: 12) {
                Text("🎉 Reward Claimed!")
                    .font(.title2)
                    .fontWeight(.bold)
                
                HStack {
                    Text(reward.type == "coins" ? "💰" : "💎")
                        .font(.title)
                    Text("\(reward.value) \(reward.type == "coins" ? "Coins" : "Gems")")
                        .font(.headline)
                }
                
                if let streak = result.streak {
                    Text("\(streak) day streak!")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color.green.opacity(0.1))
            .cornerRadius(15)
        }
    }
}

