import Foundation
import Combine

@MainActor
public class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published public private(set) var currentUser: User?
    @Published public private(set) var isAuthenticated = false
    
    internal let keychain = KeychainManager()
    private let apiClient = APIClient()
    
    var authToken: String? {
        get { keychain.getToken() }
        set {
            if let token = newValue {
                keychain.saveToken(token)
            } else {
                keychain.deleteToken()
            }
        }
    }
    
    private init() {
        restoreAuthState()
    }
    
    private func restoreAuthState() {
        // First try to restore cached user data for immediate UI update
        if let userData = keychain.getUserData(),
           let user = try? userDecoder.decode(User.self, from: userData) {
            self.currentUser = user
            self.isAuthenticated = true
        }
        
        // Then verify with server and update if needed
        if authToken != nil {
            Task {
                await fetchCurrentUser()
            }
        }
    }
    
    private var userDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            
            // Try with fractional seconds first
            if let date = formatter.date(from: dateString) {
                return date
            }
            
            // Fallback to without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: dateString) {
                return date
            }
            
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date string \(dateString)")
        }
        return decoder
    }
    
    public func login(email: String, password: String) async throws {
        let request = LoginRequest(email: email, password: password)
        let response: AuthResponse = try await apiClient.request("/api/login", method: .post, body: request)
        
        self.currentUser = response.user
        self.isAuthenticated = true
        
        if let token = response.token {
            self.authToken = token
        }
        
        // Save user data to keychain
        if let userData = try? JSONEncoder().encode(response.user) {
            keychain.saveUserData(userData)
        }
    }
    
    public func register(email: String, password: String, name: String?) async throws {
        let request = RegisterRequest(email: email, password: password, name: name)
        let response: AuthResponse = try await apiClient.request("/api/register", method: .post, body: request)
        
        self.currentUser = response.user
        self.isAuthenticated = true
        
        if let token = response.token {
            self.authToken = token
        }
        
        // Save user data to keychain
        if let userData = try? JSONEncoder().encode(response.user) {
            keychain.saveUserData(userData)
        }
    }
    
    public func forgotPassword(email: String) async throws {
        let request = ForgotPasswordRequest(email: email)
        let _: [String: String] = try await apiClient.request("/api/forgot-password", method: .post, body: request)
    }
    
    public func logout() {
        self.currentUser = nil
        self.isAuthenticated = false
        self.authToken = nil
        keychain.deleteUserData()
    }
    
    public func fetchCurrentUser() async {
        guard authToken != nil else { return }
        
        do {
            let user: User = try await apiClient.request("/api/user")
            self.currentUser = user
            self.isAuthenticated = true
            
            // Update cached user data
            if let userData = try? JSONEncoder().encode(user) {
                keychain.saveUserData(userData)
            }
        } catch {
            if case APIError.unauthorized = error {
                logout()
            }
        }
    }
    
    internal func updateUserCredits(_ credits: Int) {
        guard let user = currentUser else { return }
        
        // Create a new user instance with updated credits
        let updatedUser = User(
            id: user.id,
            email: user.email,
            name: user.name,
            credits: credits,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        )
        
        // Update the current user
        self.currentUser = updatedUser
        
        // Save to keychain for persistence
        if let userData = try? JSONEncoder().encode(updatedUser) {
            keychain.saveUserData(userData)
        }
    }
}

class KeychainManager {
    private let service = "ai.stillmotion.sdk"
    private let tokenKey = "authToken"
    private let userDataKey = "userData"
    
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
    }
    
    func saveUserData(_ data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userDataKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getUserData() -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userDataKey,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        
        return data
    }
    
    func deleteUserData() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userDataKey
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}