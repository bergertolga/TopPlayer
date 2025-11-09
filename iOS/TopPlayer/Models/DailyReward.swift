import Foundation

struct DailyRewardStatus: Codable {
    let currentStreak: Int
    let longestStreak: Int
    let lastClaimDate: Int64?
    let canClaim: Bool
}

struct DailyRewardClaim: Codable {
    let success: Bool
    let reward: DailyRewardItem?
    let streak: Int?
    let error: String?
}

struct DailyRewardItem: Codable {
    let type: String
    let value: Int
}


