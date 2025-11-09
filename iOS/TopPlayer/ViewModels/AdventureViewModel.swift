import Foundation
import SwiftUI

@MainActor
class AdventureViewModel: ObservableObject {
    @Published var adventures: [Adventure] = []
    @Published var adventureProgress: [AdventureProgress] = []
    @Published var userHeroes: [UserHero] = []
    @Published var selectedHeroes: Set<String> = []
    @Published var formations: [Formation] = []
    @Published var selectedFormationId: String?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastBattleResult: BattleResult?
    
    private let userId: String
    
    init(userId: String) {
        self.userId = userId
    }
    
    func loadAdventureData() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            async let adventuresTask = NetworkService.shared.getAdventureStages()
            async let progressTask = NetworkService.shared.getAdventureProgress(userId: userId)
            async let heroesTask = NetworkService.shared.getUserHeroes(userId: userId)
            async let formationsTask = NetworkService.shared.getFormations(userId: userId)
            
            (adventures, adventureProgress, userHeroes, formations) = try await (adventuresTask, progressTask, heroesTask, formationsTask)
            
            // Auto-select first formation if available
            if selectedFormationId == nil && !formations.isEmpty {
                selectedFormationId = formations.first?.id
            }
            
            AnalyticsService.shared.trackScreenView("adventure")
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func startBattle(adventure: Adventure) async {
        // Use formation if selected, otherwise fall back to heroes
        if selectedFormationId == nil {
            // Auto-select all heroes if none selected
            if selectedHeroes.isEmpty {
                selectedHeroes = Set(userHeroes.map { $0.id })
            }
            
            guard !selectedHeroes.isEmpty else {
                errorMessage = "You need either a formation or heroes to start an adventure. Train troops in the Army tab or complete your registration to get your starter hero!"
                return
            }
        }
        
        isLoading = true
        defer { isLoading = false }
        
        do {
            let result = try await NetworkService.shared.completeAdventure(
                userId: userId,
                adventureId: adventure.id,
                heroIds: selectedHeroes.isEmpty ? nil : Array(selectedHeroes),
                formationId: selectedFormationId
            )
            
            lastBattleResult = result
            
            if result.victory {
                // Reload progress to get updated currency/energy
                await loadAdventureData()
                
                AnalyticsService.shared.trackAdventureComplete(
                    stageNumber: adventure.stage_number,
                    stars: result.stars
                )
            }
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func getProgressForAdventure(_ adventureId: String) -> AdventureProgress? {
        return adventureProgress.first { $0.adventure_id == adventureId }
    }
    
    func isAdventureUnlocked(_ adventure: Adventure) -> Bool {
        // Check if previous stage is completed
        if adventure.stage_number == 1 {
            return true
        }
        
        let previousStage = adventure.stage_number - 1
        return adventureProgress.contains { progress in
            guard let adv = adventures.first(where: { $0.id == progress.adventure_id }) else {
                return false
            }
            return adv.stage_number == previousStage && progress.stars_earned > 0
        }
    }
}

