import Foundation

public struct User: Codable, Identifiable {
    public let id: String
    public let email: String
    public let name: String?
    public let credits: Int
    public let isAdmin: Bool
    public let createdAt: Date?
    public let updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case credits
        case isAdmin
        case createdAt
        case updatedAt
    }
    
    public init(id: String, email: String, name: String?, credits: Int, isAdmin: Bool, createdAt: Date? = nil, updatedAt: Date? = nil) {
        self.id = id
        self.email = email
        self.name = name
        self.credits = credits
        self.isAdmin = isAdmin
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        email = try container.decode(String.self, forKey: .email)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        credits = try container.decode(Int.self, forKey: .credits)
        isAdmin = try container.decode(Bool.self, forKey: .isAdmin)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }
}