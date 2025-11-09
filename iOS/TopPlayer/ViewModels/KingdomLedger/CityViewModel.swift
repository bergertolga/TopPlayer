import Foundation
import SwiftUI

@MainActor
class CityViewModel: ObservableObject {
    @Published var cityState: CityState?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showCollectNotification = false
    @Published var collectResult: CollectResult?
    @Published var showUpgradeSuccess = false
    @Published var upgradedBuilding: String?
    
    var userId: String = ""
    
    func loadCity(showLoading: Bool = true) async {
        if showLoading {
            isLoading = true
        }
        errorMessage = nil
        defer { 
            if showLoading {
                isLoading = false 
            }
        }
        
        do {
            let newState = try await NetworkService.shared.getCity(userId: userId)
            
            // Animate resource changes if state exists
            if let oldState = cityState {
                animateResourceChanges(old: oldState.resources, new: newState.resources)
            }
            
            cityState = newState
            errorMessage = nil // Clear any previous errors
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
            // Don't clear state on error - keep showing last known state
        }
    }
    
    private func animateResourceChanges(old: [CityResource], new: [CityResource]) {
        // Resource changes are handled by ResourceChip's onChange
        // This is a placeholder for future animation logic
    }
    
    func renameCity(_ name: String) async {
        do {
            try await NetworkService.shared.renameCity(userId: userId, name: name)
            await loadCity()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func upgradeBuilding(_ buildingCode: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let result = try await NetworkService.shared.upgradeBuilding(
                userId: userId,
                buildingCode: buildingCode
            )
            
            if result.success {
                upgradedBuilding = buildingCode
                showUpgradeSuccess = true
                
                // Auto-hide after 2 seconds
                Task {
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                    showUpgradeSuccess = false
                    upgradedBuilding = nil
                }
                
                await loadCity()
            } else {
                errorMessage = result.error ?? "Failed to upgrade building"
            }
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func collectFromBuilding(buildingId: String? = nil) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let result = try await NetworkService.shared.collectFromBuilding(userId: userId, buildingId: buildingId)
            await loadCity()
            
            // Show collect results notification
            collectResult = result
            showCollectNotification = true
            
            // Auto-hide after 3 seconds
            Task {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                showCollectNotification = false
            }
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func assignGovernor(governorId: String, slot: String, buildingId: String?) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await NetworkService.shared.assignGovernor(
                userId: userId,
                governorId: governorId,
                slot: slot,
                buildingId: buildingId
            )
            await loadCity()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
    
    func unassignGovernor(governorId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await NetworkService.shared.unassignGovernor(
                userId: userId,
                governorId: governorId
            )
            await loadCity()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

