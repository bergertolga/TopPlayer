import Foundation

struct Route: Codable, Identifiable {
    let id: String
    let city_id: String
    let from_region_id: String
    let to_region_id: String
    let capacity: Double
    let resource_id: String
    let qty_per_trip: Double
    let cycle_minutes: Int
    let escort_level: Int
    let repeats: Int
    let next_departure: Int64
    let status: String
    let created_at: Int64
    
    // Joined data
    let resource_code: String?
    let resource_name: String?
    let from_region_name: String?
    let to_region_name: String?
}

struct CreateRouteRequest: Codable {
    let fromRegion: String
    let toRegion: String
    let resource: String
    let qtyPerTrip: Double
    let repeats: Int?
}

struct CreateRouteResponse: Codable {
    let routeId: String
    let nextDeparture: Int64
    let status: String
}


