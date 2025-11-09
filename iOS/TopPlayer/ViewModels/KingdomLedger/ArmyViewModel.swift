import Foundation
import SwiftUI

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


