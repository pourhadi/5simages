import Foundation

public struct Video: Codable, Identifiable {
    public let id: String
    public let userId: String
    public let imageUrl: String
    public let videoUrl: String?
    public let gifUrl: String?
    public let replicatePredictionId: String?
    public let status: String
    public let prompt: String
    public let enhancedPrompt: String?
    public let type: String
    public let createdAt: Date
    public let updatedAt: Date
    public var isLiked: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case imageUrl
        case videoUrl
        case gifUrl
        case replicatePredictionId
        case status
        case prompt
        case enhancedPrompt
        case type
        case createdAt
        case updatedAt
        case isLiked
    }
    
    // Computed properties for compatibility
    public var videoStatus: VideoStatus {
        switch status.uppercased() {
        case "PENDING", "PROCESSING":
            return .processing
        case "COMPLETED":
            return .completed
        case "FAILED":
            return .failed
        default:
            return .processing
        }
    }
    
    public var mode: GenerationMode {
        return type == "slow" ? .premium : .standard
    }
    
    public var credits: Int {
        return mode.credits
    }
}

public enum VideoStatus: String, Codable {
    case pending = "PENDING"
    case processing = "PROCESSING"
    case completed = "COMPLETED"
    case failed = "FAILED"
}

public enum GenerationMode: String, Codable, CaseIterable {
    case standard = "standard"
    case premium = "premium"
    
    public var displayName: String {
        switch self {
        case .standard:
            return "Standard"
        case .premium:
            return "Premium"
        }
    }
    
    public var credits: Int {
        switch self {
        case .standard:
            return 2
        case .premium:
            return 3
        }
    }
}