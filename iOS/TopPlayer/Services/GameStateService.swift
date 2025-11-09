import Foundation

class GameStateService {
    static let shared = GameStateService()
    
    private let userDefaults = UserDefaults.standard
    private let userIdKey = "game_user_id"
    private let usernameKey = "game_username"
    private let progressKey = "game_progress"
    private let lastSaveKey = "game_last_save"
    
    var currentUserId: String? {
        get { userDefaults.string(forKey: userIdKey) }
        set { userDefaults.set(newValue, forKey: userIdKey) }
    }
    
    var currentUsername: String? {
        get { userDefaults.string(forKey: usernameKey) }
        set { userDefaults.set(newValue, forKey: usernameKey) }
    }
    
    func saveProgress(_ progress: UserProgress) {
        if let encoded = try? JSONEncoder().encode(progress) {
            userDefaults.set(encoded, forKey: progressKey)
            userDefaults.set(Date().timeIntervalSince1970, forKey: lastSaveKey)
        }
    }
    
    func loadProgress() -> UserProgress? {
        guard let data = userDefaults.data(forKey: progressKey) else { return nil }
        return try? JSONDecoder().decode(UserProgress.self, from: data)
    }
    
    func clearProgress() {
        userDefaults.removeObject(forKey: userIdKey)
        userDefaults.removeObject(forKey: usernameKey)
        userDefaults.removeObject(forKey: progressKey)
        userDefaults.removeObject(forKey: lastSaveKey)
    }
    
    func getLastSaveTime() -> Date? {
        let timestamp = userDefaults.double(forKey: lastSaveKey)
        return timestamp > 0 ? Date(timeIntervalSince1970: timestamp) : nil
    }
}


