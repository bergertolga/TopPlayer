import Foundation

enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(String)
    case unauthorized
}

struct AppConfig {
    // API Configuration
    static var baseURL: String {
        #if DEBUG
        // Development URL
        return "https://idle-adventure-backend.tolga-730.workers.dev"
        #else
        // Production URL - update this before release
        return "https://idle-adventure-backend.tolga-730.workers.dev"
        #endif
    }
    
    // App Configuration
    static let appName = "Kingdom Ledger"
    static let version = "1.0.0"
}

class NetworkService {
    static let shared = NetworkService()
    
    private let baseURL: String
    
    init(baseURL: String? = nil) {
        self.baseURL = baseURL ?? AppConfig.baseURL
    }
    
    private func makeRequest<T: Codable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        userId: String? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30.0 // 30 second timeout
        
        if let userId = userId {
            request.setValue(userId, forHTTPHeaderField: "X-User-ID")
        }
        
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        // Configure URLSession with proper timeout
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.waitsForConnectivity = true
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.serverError("Invalid response")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw NetworkError.unauthorized
            }
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw NetworkError.serverError(errorMessage)
        }
        
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            throw NetworkError.decodingError
        }
    }
    
    // MARK: - Auth
    
    func register(username: String, email: String? = nil) async throws -> (userId: String, username: String) {
        struct RegisterRequest: Codable {
            let username: String
            let email: String?
        }
        
        struct RegisterResponse: Codable {
            let userId: String
            let username: String
        }
        
        let response: RegisterResponse = try await makeRequest(
            endpoint: "/api/auth/register",
            method: "POST",
            body: RegisterRequest(username: username, email: email)
        )
        
        return (response.userId, response.username)
    }
    
    func login(username: String) async throws -> (userId: String, username: String) {
        struct LoginRequest: Codable {
            let username: String
        }
        
        struct LoginResponse: Codable {
            let userId: String
            let username: String
        }
        
        let response: LoginResponse = try await makeRequest(
            endpoint: "/api/auth/login",
            method: "POST",
            body: LoginRequest(username: username)
        )
        
        return (response.userId, response.username)
    }
    
    // MARK: - Progress
    
    struct ProgressResponse: Codable {
        let progress: UserProgress
        let offlineEarnings: OfflineEarnings?
    }
    
    func getProgress(userId: String) async throws -> ProgressResponse {
        return try await makeRequest(
            endpoint: "/api/progress?userId=\(userId)",
            userId: userId
        )
    }
    
    func saveProgress(userId: String, progress: UserProgress) async throws {
        struct SaveResponse: Codable {
            let success: Bool
        }
        
        let _: SaveResponse = try await makeRequest(
            endpoint: "/api/progress",
            method: "POST",
            body: progress,
            userId: userId
        )
    }
    
    // MARK: - Heroes
    
    func getAllHeroes() async throws -> [Hero] {
        struct HeroesResponse: Codable {
            let heroes: [Hero]
        }
        
        let response: HeroesResponse = try await makeRequest(endpoint: "/api/heroes")
        return response.heroes
    }
    
    func getUserHeroes(userId: String) async throws -> [UserHero] {
        struct UserHeroesResponse: Codable {
            let heroes: [UserHero]
        }
        
        let response: UserHeroesResponse = try await makeRequest(
            endpoint: "/api/heroes/user?userId=\(userId)",
            userId: userId
        )
        return response.heroes
    }
    
    func upgradeHero(userId: String, userHeroId: String) async throws -> HeroUpgradeResult {
        struct UpgradeRequest: Codable {
            let userHeroId: String
        }
        
        return try await makeRequest(
            endpoint: "/api/heroes/upgrade",
            method: "POST",
            body: UpgradeRequest(userHeroId: userHeroId),
            userId: userId
        )
    }
    
    // MARK: - Adventure
    
    func getAdventureStages() async throws -> [Adventure] {
        struct StagesResponse: Codable {
            let stages: [Adventure]
        }
        
        let response: StagesResponse = try await makeRequest(endpoint: "/api/adventure/stages")
        return response.stages
    }
    
    func getAdventureProgress(userId: String) async throws -> [AdventureProgress] {
        struct ProgressResponse: Codable {
            let progress: [AdventureProgress]
        }
        
        let response: ProgressResponse = try await makeRequest(
            endpoint: "/api/adventure/progress?userId=\(userId)",
            userId: userId
        )
        return response.progress
    }
    
    func getTroops(userId: String) async throws -> [Troop] {
        struct TroopsResponse: Codable {
            let troops: [Troop]
        }
        
        let response: TroopsResponse = try await makeRequest(
            endpoint: "/api/v1/army/troops?userId=\(userId)",
            method: "GET",
            userId: userId
        )
        
        return response.troops
    }
    
    func getFormations(userId: String) async throws -> [Formation] {
        struct FormationsResponse: Codable {
            let formations: [Formation]
        }
        
        let response: FormationsResponse = try await makeRequest(
            endpoint: "/api/v1/army/formations?userId=\(userId)",
            method: "GET",
            userId: userId
        )
        
        return response.formations
    }
    
    func getTroopTypes() async throws -> [TroopType] {
        struct TroopTypesResponse: Codable {
            let troopTypes: [TroopType]
        }
        
        let response: TroopTypesResponse = try await makeRequest(
            endpoint: "/api/v1/army/troop-types",
            method: "GET"
        )
        
        return response.troopTypes
    }
    
    func trainTroops(userId: String, troopTypeId: String, quantity: Int) async throws {
        struct TrainRequest: Codable {
            let troopTypeId: String
            let quantity: Int
        }
        
        struct TrainResponse: Codable {
            let success: Bool
        }
        
        let _: TrainResponse = try await makeRequest(
            endpoint: "/api/v1/army/train?userId=\(userId)",
            method: "POST",
            body: TrainRequest(troopTypeId: troopTypeId, quantity: quantity),
            userId: userId
        )
    }
    
    func createFormation(userId: String, name: String, troopQuantities: [String: Int], formationId: String? = nil) async throws -> Formation {
        struct CreateFormationRequest: Codable {
            let formationId: String?
            let name: String
            let troopQuantities: [String: Int]
        }
        
        struct CreateFormationResponse: Codable {
            let success: Bool
            let totalPower: Double
        }
        
        let response: CreateFormationResponse = try await makeRequest(
            endpoint: "/api/v1/army/formation?userId=\(userId)",
            method: "POST",
            body: CreateFormationRequest(formationId: formationId, name: name, troopQuantities: troopQuantities),
            userId: userId
        )
        
        // Return a temporary formation object - the actual formation will be reloaded
        return Formation(
            id: formationId ?? UUID().uuidString,
            name: name,
            troopQuantities: troopQuantities,
            totalPower: response.totalPower,
            isActive: false
        )
    }
    
    func completeAdventure(userId: String, adventureId: String, heroIds: [String]?, formationId: String? = nil) async throws -> BattleResult {
        struct CompleteRequest: Codable {
            let adventureId: String
            let heroIds: [String]?
            let formationId: String?
        }
        
        struct CompleteResponse: Codable {
            let success: Bool
            let result: BattleResult
        }
        
        let response: CompleteResponse = try await makeRequest(
            endpoint: "/api/adventure/complete",
            method: "POST",
            body: CompleteRequest(adventureId: adventureId, heroIds: heroIds, formationId: formationId),
            userId: userId
        )
        
        return response.result
    }
    
    // MARK: - Purchase
    
    func verifyPurchase(userId: String, verification: PurchaseVerification) async throws -> PurchaseResult {
        struct VerifyResponse: Codable {
            let success: Bool
            let purchaseId: String?
            let rewards: PurchaseRewards?
            let message: String?
            let error: String?
        }
        
        let response: VerifyResponse = try await makeRequest(
            endpoint: "/api/purchase/verify?userId=\(userId)",
            method: "POST",
            body: verification,
            userId: userId
        )
        
        return PurchaseResult(
            success: response.success,
            purchaseId: response.purchaseId,
            error: response.error,
            rewards: response.rewards,
            message: response.message
        )
    }
    
    // MARK: - Daily Rewards
    
    func getDailyRewardStatus(userId: String) async throws -> DailyRewardStatus {
        return try await makeRequest(
            endpoint: "/api/daily-rewards/status?userId=\(userId)",
            userId: userId
        )
    }
    
    func claimDailyReward(userId: String) async throws -> DailyRewardClaim {
        struct ClaimResponse: Codable {
            let success: Bool
            let reward: DailyRewardItem?
            let streak: Int?
            let error: String?
        }
        
        let response: ClaimResponse = try await makeRequest(
            endpoint: "/api/daily-rewards/claim?userId=\(userId)",
            method: "POST",
            userId: userId
        )
        
        return DailyRewardClaim(
            success: response.success,
            reward: response.reward,
            streak: response.streak,
            error: response.error
        )
    }
    
    // MARK: - Kingdom Ledger - City
    
    func getCity(userId: String) async throws -> CityState {
        return try await makeRequest(
            endpoint: "/api/v1/city?userId=\(userId)",
            userId: userId
        )
    }
    
    func renameCity(userId: String, name: String) async throws {
        struct RenameRequest: Codable {
            let name: String
        }
        
        struct RenameResponse: Codable {
            let success: Bool
        }
        
        let _: RenameResponse = try await makeRequest(
            endpoint: "/api/v1/city/rename?userId=\(userId)",
            method: "POST",
            body: RenameRequest(name: name),
            userId: userId
        )
    }
    
    func upgradeBuilding(userId: String, buildingCode: String) async throws -> BuildingUpgradeResult {
        struct UpgradeRequest: Codable {
            let buildingCode: String
        }
        
        struct UpgradeResponse: Codable {
            let success: Bool
            let newLevel: Int?
            let error: String?
        }
        
        let response: UpgradeResponse = try await makeRequest(
            endpoint: "/api/v1/city/upgrade?userId=\(userId)",
            method: "POST",
            body: UpgradeRequest(buildingCode: buildingCode),
            userId: userId
        )
        
        return BuildingUpgradeResult(
            success: response.success,
            newLevel: response.newLevel,
            error: response.error
        )
    }
    
    func collectFromBuilding(userId: String, buildingId: String? = nil) async throws -> CollectResult {
        struct CollectRequest: Codable {
            let buildingId: String?
        }
        
        return try await makeRequest<CollectResult>(
            endpoint: "/api/v1/city/collect",
            method: "POST",
            body: CollectRequest(buildingId: buildingId),
            userId: userId
        )
    }
    
    // Keep for backwards compatibility but mark as deprecated
    @available(*, deprecated, message: "Use collectFromBuilding instead")
    func applyTick(userId: String) async throws -> CityTickResult {
        struct TickResponse: Codable {
            let cityId: String
            let delta: [String: Double]
            let happiness: Double
            let notes: [String]
        }
        
        let response: TickResponse = try await makeRequest(
            endpoint: "/api/v1/tick/apply?userId=\(userId)",
            method: "POST",
            userId: userId
        )
        
        return CityTickResult(
            cityId: response.cityId,
            delta: response.delta,
            happiness: response.happiness,
            notes: response.notes
        )
    }
    
    func getAvailableGovernors(userId: String) async throws -> [Governor] {
        struct GovernorsResponse: Codable {
            let governors: [Governor]
        }
        
        let response: GovernorsResponse = try await makeRequest(
            endpoint: "/api/v1/city/governors/available?userId=\(userId)",
            userId: userId
        )
        return response.governors
    }
    
    func assignGovernor(userId: String, governorId: String, slot: String, buildingId: String?) async throws {
        struct AssignRequest: Codable {
            let governorId: String
            let slot: String
            let buildingId: String?
        }
        
        struct AssignResponse: Codable {
            let success: Bool
            let message: String?
            let error: String?
        }
        
        let response: AssignResponse = try await makeRequest(
            endpoint: "/api/v1/city/governor/assign?userId=\(userId)",
            method: "POST",
            body: AssignRequest(governorId: governorId, slot: slot, buildingId: buildingId),
            userId: userId
        )
        
        if !response.success {
            throw NetworkError.serverError(response.error ?? "Failed to assign governor")
        }
    }
    
    func unassignGovernor(userId: String, governorId: String) async throws {
        struct UnassignRequest: Codable {
            let governorId: String
        }
        
        struct UnassignResponse: Codable {
            let success: Bool
            let message: String?
            let error: String?
        }
        
        let response: UnassignResponse = try await makeRequest(
            endpoint: "/api/v1/city/governor/unassign?userId=\(userId)",
            method: "POST",
            body: UnassignRequest(governorId: governorId),
            userId: userId
        )
        
        if !response.success {
            throw NetworkError.serverError(response.error ?? "Failed to unassign governor")
        }
    }
    
    // MARK: - Kingdom Ledger - Market
    
    func getMarketBook(resource: String, limit: Int = 20) async throws -> MarketBook {
        return try await makeRequest(
            endpoint: "/api/v1/market/book?resource=\(resource)&limit=\(limit)"
        )
    }
    
    func getMarketHistory(resource: String, bucket: String = "1h", limit: Int = 48) async throws -> MarketHistory {
        return try await makeRequest(
            endpoint: "/api/v1/market/history?resource=\(resource)&bucket=\(bucket)&limit=\(limit)"
        )
    }
    
    func placeOrder(userId: String, request: PlaceOrderRequest) async throws -> PlaceOrderResponse {
        return try await makeRequest(
            endpoint: "/api/v1/market/order?userId=\(userId)",
            method: "POST",
            body: request,
            userId: userId
        )
    }
    
    func cancelOrder(userId: String, orderId: String) async throws {
        struct CancelResponse: Codable {
            let success: Bool
        }
        
        let _: CancelResponse = try await makeRequest(
            endpoint: "/api/v1/market/cancel?userId=\(userId)",
            method: "POST",
            body: CancelOrderRequest(orderId: orderId),
            userId: userId
        )
    }
    
    func getMyOrders(userId: String) async throws -> [MarketOrder] {
        struct MyOrdersResponse: Codable {
            let orders: [MarketOrder]
        }
        
        // Get user's city first
        let city = try await getCity(userId: userId)
        
        // Query orders for this city
        // Note: This is a simplified version - backend would need an endpoint
        // For now, we'll filter from the order book
        let orderBook = try await getMarketBook(resource: "WOOD", limit: 100)
        
        // Filter orders that belong to user's city
        // This is a workaround - ideally backend would have /api/v1/market/my-orders
        var myOrders: [MarketOrder] = []
        myOrders.append(contentsOf: orderBook.bids.filter { $0.city_id == city.city.id })
        myOrders.append(contentsOf: orderBook.asks.filter { $0.city_id == city.city.id })
        
        return myOrders.filter { $0.status == "open" }
    }
    
    // MARK: - Kingdom Ledger - Routes
    
    func getRoutes(userId: String) async throws -> [Route] {
        struct RoutesResponse: Codable {
            let routes: [Route]
        }
        
        let response: RoutesResponse = try await makeRequest(
            endpoint: "/api/v1/routes?userId=\(userId)",
            userId: userId
        )
        return response.routes
    }
    
    func createRoute(userId: String, request: CreateRouteRequest) async throws -> CreateRouteResponse {
        return try await makeRequest(
            endpoint: "/api/v1/routes/create?userId=\(userId)",
            method: "POST",
            body: request,
            userId: userId
        )
    }
    
    func cancelRoute(userId: String, routeId: String) async throws {
        struct CancelRouteRequest: Codable {
            let routeId: String
        }
        
        struct CancelRouteResponse: Codable {
            let success: Bool
        }
        
        let _: CancelRouteResponse = try await makeRequest(
            endpoint: "/api/v1/routes/cancel?userId=\(userId)",
            method: "POST",
            body: CancelRouteRequest(routeId: routeId),
            userId: userId
        )
    }
    
    // MARK: - Kingdom Ledger - Council
    
    func getCouncil(userId: String) async throws -> CouncilState {
        return try await makeRequest(
            endpoint: "/api/v1/council?userId=\(userId)",
            userId: userId
        )
    }
    
    func createCouncil(userId: String, name: String) async throws -> Council {
        struct CreateResponse: Codable {
            let councilId: String
            let name: String
        }
        
        let response: CreateResponse = try await makeRequest(
            endpoint: "/api/v1/council/create?userId=\(userId)",
            method: "POST",
            body: CreateCouncilRequest(name: name),
            userId: userId
        )
        
        // Return stub - would need full council fetch
        return Council(
            id: response.councilId,
            name: response.name,
            steward_user_id: userId,
            region_id: "",
            tax_rate: 0.01,
            created_at: Int64(Date().timeIntervalSince1970),
            steward_name: nil
        )
    }
    
    func joinCouncil(userId: String, councilId: String) async throws {
        struct JoinResponse: Codable {
            let success: Bool
        }
        
        let _: JoinResponse = try await makeRequest(
            endpoint: "/api/v1/council/join?userId=\(userId)",
            method: "POST",
            body: JoinCouncilRequest(councilId: councilId),
            userId: userId
        )
    }
    
    func setTaxRate(userId: String, rate: Double) async throws {
        struct SetTaxResponse: Codable {
            let success: Bool
            let taxRate: Double
        }
        
        let _: SetTaxResponse = try await makeRequest(
            endpoint: "/api/v1/council/tax?userId=\(userId)",
            method: "POST",
            body: SetTaxRequest(rate: rate),
            userId: userId
        )
    }
    
    // MARK: - Kingdom Ledger - PvE
    
    func getPveNodes(regionId: String?) async throws -> [PveNode] {
        var endpoint = "/api/v1/pve/nodes"
        if let regionId = regionId {
            endpoint += "?regionId=\(regionId)"
        }
        
        let response: PveNodesResponse = try await makeRequest(endpoint: endpoint)
        return response.nodes
    }
    
    func attackNode(userId: String, nodeId: String) async throws -> AttackNodeResponse {
        return try await makeRequest(
            endpoint: "/api/v1/pve/attack?userId=\(userId)",
            method: "POST",
            body: AttackNodeRequest(nodeId: nodeId),
            userId: userId
        )
    }
    
    // MARK: - Analytics
    
    func logEvent(userId: String?, eventType: String, eventData: [String: Any]? = nil) async throws {
        struct AnalyticsRequest: Codable {
            let userId: String?
            let eventType: String
            let eventData: [String: String]?
        }
        
        struct AnalyticsResponse: Codable {
            let success: Bool
        }
        
        let dataDict = eventData?.mapValues { "\($0)" }
        
        let _: AnalyticsResponse = try await makeRequest(
            endpoint: "/api/analytics",
            method: "POST",
            body: AnalyticsRequest(userId: userId, eventType: eventType, eventData: dataDict),
            userId: userId
        )
    }
}

