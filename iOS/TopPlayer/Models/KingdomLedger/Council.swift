import Foundation

struct Council: Codable, Identifiable {
    let id: String
    let name: String
    let steward_user_id: String
    let region_id: String
    var tax_rate: Double
    let created_at: Int64
    
    // Joined data
    let steward_name: String?
}

struct CouncilMember: Codable {
    let council_id: String
    let user_id: String
    let role: String // "steward", "officer", "member"
    let joined_at: Int64
    
    // Joined data
    let username: String?
}

struct PublicWork: Codable, Identifiable {
    let id: String
    let council_id: String
    let project_code: String
    let name: String
    let description: String?
    let required_resources_json: String
    var contributed_resources_json: String
    var completion_percentage: Double
    let region_bonus_json: String?
    let status: String
    let created_at: Int64
    let completed_at: Int64?
}

struct CouncilState: Codable {
    let council: Council?
    let members: [CouncilMember]
    let publicWorks: [PublicWork]
}

struct CreateCouncilRequest: Codable {
    let name: String
}

struct JoinCouncilRequest: Codable {
    let councilId: String
}

struct SetTaxRequest: Codable {
    let rate: Double
}


