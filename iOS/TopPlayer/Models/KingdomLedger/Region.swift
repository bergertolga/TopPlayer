import Foundation

struct Region: Codable, Identifiable {
    let id: String
    let name: String
    let tier: Int
    let wood_bias: Double
    let ore_bias: Double
    let food_bias: Double
    let stone_bias: Double
    let fiber_bias: Double
    let clay_bias: Double
    let max_cities: Int
    let description: String?
}


