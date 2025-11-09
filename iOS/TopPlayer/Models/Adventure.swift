import Foundation

struct Adventure: Codable, Identifiable {
    let id: String
    let stage_number: Int
    let name: String
    let description: String?
    let enemy_power: Int
    let reward_coins: Int
    let reward_gems: Int
    let reward_hero_shards: String?
    let energy_cost: Int
    let created_at: Int64
}

struct AdventureProgress: Codable, Identifiable {
    let id: String
    let user_id: String
    let adventure_id: String
    let stars_earned: Int
    let completed_at: Int64?
    let best_time: Int?
}

struct BattleResult: Codable {
    let victory: Bool
    let stars: Int
    let time: Int
    let rewards: BattleRewards
}

struct BattleRewards: Codable {
    let coins: Int
    let gems: Int
    let heroShards: [HeroShard]?
}

struct HeroShard: Codable {
    let heroId: String
    let amount: Int
}

// Army types for adventure mode
struct Troop: Codable, Identifiable {
    let id: String
    let troopTypeId: String
    let troopCode: String
    let troopName: String
    let category: String
    let quantity: Int
    let level: Int
    let experience: Int
    let basePower: Int
    let totalPower: Double
    let upkeepCoins: Int
}

struct Formation: Codable, Identifiable {
    let id: String
    let name: String
    let troopQuantities: [String: Int]
    let totalPower: Double
    let isActive: Bool
}

struct TroopType: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let category: String
    let basePower: Int
    let baseCostCoins: Int
    let baseCostResources: [String: Int]
    let upkeepCoins: Int
    let trainingTimeSeconds: Int
    let maxLevel: Int
    let description: String?
}


