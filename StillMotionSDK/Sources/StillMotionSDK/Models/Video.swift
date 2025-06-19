import Foundation

public struct Video: Codable, Identifiable {
    public let id: String
    public let userId: String
    public let imageUrl: String
    public let gifUrl: String?
    public let predictionId: String?
    public let status: VideoStatus
    public let prompt: String
    public let enhancedPrompt: String?
    public let mode: GenerationMode
    public let sampleSteps: Int?
    public let sampleGuideScale: Double?
    public let credits: Int
    public let createdAt: Date
    public let updatedAt: Date
    public var isLiked: Bool?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case imageUrl
        case gifUrl
        case predictionId
        case status
        case prompt
        case enhancedPrompt
        case mode
        case sampleSteps
        case sampleGuideScale
        case credits
        case createdAt
        case updatedAt
        case isLiked
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