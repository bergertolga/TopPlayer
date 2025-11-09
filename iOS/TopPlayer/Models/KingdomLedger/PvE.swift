import Foundation

struct PveNode: Codable, Identifiable {
    let id: String
    let region_id: String
    let tier: Int
    let name: String
    let power_required: Int
    let reward_json: String
    let respawn_at: Int64
    let status: String
    let created_at: Int64
}

struct PveNodesResponse: Codable {
    let nodes: [PveNode]
}

struct AttackNodeRequest: Codable {
    let nodeId: String
}

struct AttackNodeResponse: Codable {
    let success: Bool
    let victory: Bool?
    let rewards: [String: Double]?
    let error: String?
    let cityPower: Int?
    let required: Int?
}


