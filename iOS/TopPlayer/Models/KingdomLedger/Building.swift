import Foundation

enum BuildingCategory: String, Codable {
    case production = "production"
    case processing = "processing"
    case city = "city"
    case military = "military"
    case logistics = "logistics"
}

struct Building: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let category: BuildingCategory
    let base_production_json: String
    let input_resources_json: String
    let output_resources_json: String
    let upkeep_coins: Int
    let upkeep_resources_json: String
    let workers_required: Int
    let max_level: Int
    let description: String?
}

struct BuildingProduction: Codable {
    let resource: String
    let amount: Double
}


