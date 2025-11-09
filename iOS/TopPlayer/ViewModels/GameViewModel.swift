import Foundation
import SwiftUI

@MainActor
class GameViewModel: ObservableObject {
    @Published var userProgress: UserProgress?
    @Published var userHeroes: [UserHero] = []
    @Published var allHeroes: [Hero] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var offlineEarnings: OfflineEarnings?
    
    private let userId: String
    
    init(userId: String) {
        self.userId = userId
        AnalyticsService.shared.setUserId(userId)
    }
    
    func loadGameState() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Load progress (includes offline earnings calculation)
            let progressResponse = try await NetworkService.shared.getProgress(userId: userId)
            userProgress = progressResponse.progress
            offlineEarnings = progressResponse.offlineEarnings
            
            // Load user heroes
            userHeroes = try await NetworkService.shared.getUserHeroes(userId: userId)
            
            // Load all heroes (for shop/unlocks)
            allHeroes = try await NetworkService.shared.getAllHeroes()
            
            // Save locally
            if let progress = userProgress {
                GameStateService.shared.saveProgress(progress)
            }
            
            AnalyticsService.shared.trackScreenView("main_game")
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
            print("Error loading game state: \(error)")
        }
    }
    
    func upgradeHero(userHeroId: String) async {
        do {
            let result = try await NetworkService.shared.upgradeHero(
                userId: userId,
                userHeroId: userHeroId
            )
            
            if result.success {
                // Update local state
                if let index = userHeroes.firstIndex(where: { $0.id == userHeroId }) {
                    userHeroes[index].level = result.newLevel
                }
                
                // Refresh progress
                if var progress = userProgress {
                    progress.total_currency = result.remainingCurrency
                    userProgress = progress
                    GameStateService.shared.saveProgress(progress)
                }
                
                AnalyticsService.shared.trackHeroUpgrade(
                    heroId: userHeroId,
                    newLevel: result.newLevel
                )
            }
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func saveProgress() async {
        guard let progress = userProgress else { return }
        
        do {
            try await NetworkService.shared.saveProgress(userId: userId, progress: progress)
            GameStateService.shared.saveProgress(progress)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

