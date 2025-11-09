import Foundation

// User-friendly error messages
struct ErrorMessages {
    static func userFriendly(_ error: Error) -> String {
        if let networkError = error as? NetworkError {
            switch networkError {
            case .invalidURL:
                return "Invalid server address. Please check your connection."
            case .noData:
                return "No data received from server. Please try again."
            case .decodingError:
                return "Data format error. Please try again later."
            case .serverError(let message):
                return parseServerError(message)
            case .unauthorized:
                return "Session expired. Please log in again."
            }
        }
        
        // Generic error
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain {
            switch nsError.code {
            case NSURLErrorNotConnectedToInternet:
                return "No internet connection. Please check your network."
            case NSURLErrorTimedOut:
                return "Request timed out. Please try again."
            case NSURLErrorCannotConnectToHost:
                return "Cannot connect to server. Please try again later."
            default:
                return "Network error. Please try again."
            }
        }
        
        return error.localizedDescription.isEmpty ? "An unexpected error occurred" : error.localizedDescription
    }
    
    private static func parseServerError(_ message: String) -> String {
        // Try to parse JSON error message
        if let data = message.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let error = json["error"] as? String {
            return error
        }
        
        // Common error patterns
        if message.contains("User ID required") {
            return "Please log in to continue."
        }
        if message.contains("not found") {
            return "Item not found. Please refresh and try again."
        }
        if message.contains("Insufficient") {
            return "Not enough resources. Keep playing to earn more!"
        }
        if message.contains("already exists") {
            return "This item already exists."
        }
        
        return "Server error: \(message)"
    }
}


