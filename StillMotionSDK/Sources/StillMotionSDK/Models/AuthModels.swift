import Foundation

public struct LoginRequest: Codable {
    let email: String
    let password: String
}

public struct RegisterRequest: Codable {
    let email: String
    let password: String
    let name: String?
}

public struct AuthResponse: Codable {
    let user: User
    let token: String?
    let message: String?
}

public struct ForgotPasswordRequest: Codable {
    let email: String
}

public struct GenerateVideoRequest: Codable {
    let imageUrl: String
    let prompt: String
    let enhancePrompt: Bool
    let mode: String
    let sampleSteps: Int?
    let sampleGuideScale: Double?
    let numberOfGenerations: Int?
}