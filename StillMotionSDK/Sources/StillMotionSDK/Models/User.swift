import Foundation

public struct User: Codable, Identifiable {
    public let id: String
    public let email: String
    public let name: String?
    public let credits: Int
    public let isAdmin: Bool
    public let createdAt: Date
    public let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case credits
        case isAdmin
        case createdAt
        case updatedAt
    }
}