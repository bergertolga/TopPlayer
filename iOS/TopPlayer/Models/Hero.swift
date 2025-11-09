import Foundation

enum HeroRarity: String, Codable, CaseIterable {
    case common = "common"
    case rare = "rare"
    case epic = "epic"
    case legendary = "legendary"
    
    var color: String {
        switch self {
        case .common: return "gray"
        case .rare: return "blue"
        case .epic: return "purple"
        case .legendary: return "orange"
        }
    }
    
    var emoji: String {
        switch self {
        case .common: return "⚪"
        case .rare: return "🔵"
        case .epic: return "🟣"
        case .legendary: return "🟠"
        }
    }
}

struct Hero: Codable, Identifiable {
    let id: String
    let name: String
    let rarity: HeroRarity
    let base_power: Int
    let upgrade_cost_base: Int
    let unlock_requirement: String?
    let description: String?
    let element: String?
    let created_at: Int64
}

struct UserHero: Codable, Identifiable {
    let id: String
    let user_id: String
    let hero_id: String
    var level: Int
    var stars: Int
    var experience: Int
    let equipped_weapon_id: String?
    let equipped_armor_id: String?
    let equipped_accessory_id: String?
    let created_at: Int64
    
    // Joined data
    var name: String?
    var rarity: HeroRarity?
    var base_power: Int?
    var element: String?
    
    var currentPower: Int {
        guard let basePower = base_power else { return 0 }
        let levelMultiplier = 1.0 + Double(level - 1) * 0.1
        let starMultiplier = 1.0 + Double(stars) * 0.2
        return Int(Double(basePower) * levelMultiplier * starMultiplier)
    }
}

struct HeroUpgradeResult: Codable {
    let success: Bool
    let newLevel: Int
    let newPower: Int
    let cost: Int
    let remainingCurrency: Int
}


