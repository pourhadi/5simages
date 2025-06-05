import Foundation

// MARK: - User Models
public struct User: Codable, Identifiable {
    public let id: String
    public let email: String
    public let credits: Int
    public let isAdmin: Bool
    public let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, email, credits, isAdmin, createdAt
    }
}

public struct LoginRequest: Codable {
    public let email: String
    public let password: String
    
    public init(email: String, password: String) {
        self.email = email
        self.password = password
    }
}

public struct RegisterRequest: Codable {
    public let email: String
    public let password: String
    
    public init(email: String, password: String) {
        self.email = email
        self.password = password
    }
}

public struct AuthResponse: Codable {
    public let token: String
    public let user: User
}

// MARK: - Video/GIF Models
public struct Video: Codable, Identifiable {
    public let id: String
    public let userId: String
    public let imageUrl: String
    public let prompt: String
    public let videoUrl: String?
    public let gifUrl: String?
    public let status: VideoStatus
    public let type: GenerationType
    public let createdAt: Date
    
    public var isCompleted: Bool {
        status == .completed
    }
    
    public var displayUrl: String? {
        gifUrl ?? videoUrl
    }
}

public enum VideoStatus: String, Codable {
    case processing = "processing"
    case completed = "completed"
    case failed = "failed"
}

public enum GenerationType: String, Codable, CaseIterable {
    case fast = "fast"
    case slow = "slow"
    
    public var displayName: String {
        switch self {
        case .fast: return "Fast & Great"
        case .slow: return "Slow & Good"
        }
    }
    
    public var credits: Int {
        switch self {
        case .fast: return 2
        case .slow: return 1
        }
    }
    
    public var description: String {
        switch self {
        case .fast: return "High-quality results in 1-3 minutes"
        case .slow: return "Good quality results in 2-5 minutes"
        }
    }
}

// MARK: - Generation Request
public struct GenerateVideoRequest: Codable {
    public let imageUrl: String
    public let prompt: String
    public let generationType: String
    public let enhancePrompt: Bool
    public let sampleSteps: Int?
    public let sampleGuideScale: Double?
    
    public init(
        imageUrl: String,
        prompt: String,
        generationType: GenerationType,
        enhancePrompt: Bool,
        sampleSteps: Int? = nil,
        sampleGuideScale: Double? = nil
    ) {
        self.imageUrl = imageUrl
        self.prompt = prompt
        self.generationType = generationType.rawValue
        self.enhancePrompt = enhancePrompt
        self.sampleSteps = sampleSteps
        self.sampleGuideScale = sampleGuideScale
    }
}

public struct GenerateVideoResponse: Codable {
    public let message: String
    public let videoId: String
}

// MARK: - Credit Models
public struct CreditPackage: Identifiable {
    public let id = UUID()
    public let credits: Int
    public let price: Double
    public let priceId: String
    
    public var displayPrice: String {
        String(format: "$%.2f", price)
    }
    
    public var pricePerCredit: Double {
        price / Double(credits)
    }
    
    public static let packages = [
        CreditPackage(credits: 2, price: 1.00, priceId: "price_2_credits"),
        CreditPackage(credits: 10, price: 4.50, priceId: "price_10_credits"),
        CreditPackage(credits: 30, price: 12.00, priceId: "price_30_credits")
    ]
}

public struct CheckoutRequest: Codable {
    public let priceId: String
    
    public init(priceId: String) {
        self.priceId = priceId
    }
}

public struct CheckoutResponse: Codable {
    public let sessionId: String
    public let url: String
}