import Foundation

enum ResourceType: String, Codable {
    case raw = "raw"
    case refined = "refined"
    case special = "special"
    case fuel = "fuel"
}

struct Resource: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let type: ResourceType
    let base_value: Double
    let description: String?
}


