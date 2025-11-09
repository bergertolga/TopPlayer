import Foundation

struct User: Codable, Identifiable {
    let id: String
    let username: String
    let email: String?
    let created_at: Int64
    let last_active: Int64
    let total_spent: Double
    let prestige_count: Int
    let server_region: String
}

struct UserProgress: Codable {
    let user_id: String
    var total_currency: Int
    var premium_currency: Int
    var energy: Int
    var max_energy: Int
    var current_adventure_stage: Int
    let last_offline_calculation: Int64?
    let updated_at: Int64
}

struct OfflineEarnings: Codable {
    let coins: Int
    let gems: Int
    let experience: Int
    let timeOffline: Int
}


