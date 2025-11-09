import Foundation

class AnalyticsService {
    static let shared = AnalyticsService()
    
    private var userId: String?
    
    func setUserId(_ userId: String) {
        self.userId = userId
    }
    
    func trackEvent(_ eventType: String, parameters: [String: Any]? = nil) {
        Task {
            do {
                try await NetworkService.shared.logEvent(
                    userId: userId,
                    eventType: eventType,
                    eventData: parameters
                )
            } catch {
                print("Failed to track event: \(error)")
            }
        }
    }
    
    func trackScreenView(_ screenName: String) {
        trackEvent("screen_view", parameters: ["screen": screenName])
    }
    
    func trackPurchase(productId: String, amount: Double) {
        trackEvent("purchase", parameters: [
            "product_id": productId,
            "amount": amount
        ])
    }
    
    func trackHeroUpgrade(heroId: String, newLevel: Int) {
        trackEvent("hero_upgrade", parameters: [
            "hero_id": heroId,
            "level": newLevel
        ])
    }
    
    func trackAdventureComplete(stageNumber: Int, stars: Int) {
        trackEvent("adventure_complete", parameters: [
            "stage": stageNumber,
            "stars": stars
        ])
    }
}


