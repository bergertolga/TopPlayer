import Foundation

struct City: Codable, Identifiable {
    let id: String
    let user_id: String
    let region_id: String
    let name: String
    var level: Int
    var population: Int
    var happiness: Double
    let prestige_count: Int
    let shield_until: Int64
    let last_tick: Int64
    let created_at: Int64
    
    // Joined data
    var region_name: String?
}

struct CityResource: Codable {
    let code: String
    let name: String
    let type: String
    var amount: Double
    var protected: Double
}

struct CityBuilding: Codable, Hashable {
    let code: String
    let name: String
    let category: String
    var level: Int
    var workers: Int
    var is_active: Int
    var productionRate: [String: Double]?
    var consumptionRate: [String: Double]?
    var outputRate: [String: Double]?
    var upgradeCost: Int?
    var canUpgrade: Bool?
    var maxLevel: Int?
    var storage: [String: Double]?
    var storageCapacity: Double?
    var storageUsed: Double?
    var storagePercent: Double?
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(code)
    }
    
    static func == (lhs: CityBuilding, rhs: CityBuilding) -> Bool {
        lhs.code == rhs.code
    }
    
    var hasResourcesToCollect: Bool {
        guard let storage = storage else { return false }
        return storage.values.contains { $0 > 0 }
    }
    
    var totalStorageAmount: Double {
        storage?.values.reduce(0, +) ?? 0
    }
}

struct CollectResult: Codable {
    let success: Bool
    let collected: [String: Double]
    let buildingStorage: [String: Double]
    let warehouseFull: Bool
    let error: String?
}

struct CityGovernor: Codable {
    let governor_id: String
    let code: String
    let name: String
    let rarity: String
    let slot: String
    let assigned_building_id: String?
}

struct CityState: Codable {
    let city: City
    let resources: [CityResource]
    let buildings: [CityBuilding]
    let governors: [CityGovernor]
    let production: ProductionInfo?
    let warehouse: WarehouseInfo?
    let population: PopulationInfo?
}

struct ProductionInfo: Codable {
    let rates: [String: Double]
    let consumption: [String: Double]
    let net: [String: Double]
}

struct WarehouseInfo: Codable {
    let capacity: Double
    let level: Int
}

struct PopulationInfo: Codable {
    let consumption: [String: Double]
}

struct BuildingUpgradeResult: Codable {
    let success: Bool
    let newLevel: Int?
    let error: String?
}

struct CityTickResult: Codable {
    let cityId: String
    let delta: [String: Double]
    let happiness: Double
    let notes: [String]
}

struct Governor: Codable, Identifiable, Hashable {
    let id: String
    let code: String
    let name: String
    let rarity: String
    let bonus_json: String
    let description: String?
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Governor, rhs: Governor) -> Bool {
        lhs.id == rhs.id
    }
}


