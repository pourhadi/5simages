import Foundation
import Combine

@MainActor
public class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    public static func initialize() {
        // Force initialization of the singleton
        _ = shared
    }
    
    public func testKeychain() {
        print("[AuthManager] Testing keychain...")
        
        // Test token operations
        let testToken = "test-token-12345"
        keychain.saveToken(testToken)
        let retrievedToken = keychain.getToken()
        print("[AuthManager] Token test - saved: \(testToken), retrieved: \(retrievedToken ?? "nil")")
        
        // Test user data operations
        let testUser = User(
            id: "test-id",
            email: "test@example.com",
            name: "Test User",
            credits: 10,
            isAdmin: false,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        if let userData = try? JSONEncoder().encode(testUser) {
            keychain.saveUserData(userData)
            let retrievedData = keychain.getUserData()
            
            if let retrievedData = retrievedData,
               let retrievedUser = try? userDecoder.decode(User.self, from: retrievedData) {
                print("[AuthManager] User data test - saved: \(testUser.email), retrieved: \(retrievedUser.email)")
            } else {
                print("[AuthManager] User data test - failed to retrieve or decode")
            }
        }
        
        // Clean up test data
        keychain.deleteToken()
        keychain.deleteUserData()
    }
    
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
        print("[AuthManager] Initializing AuthManager...")
        restoreAuthState()
    }
    
    private func restoreAuthState() {
        print("[AuthManager] Restoring auth state...")
        
        // Check if we have a saved token
        if let token = authToken {
            print("[AuthManager] Found saved token: \(String(token.prefix(10)))...")
            
            // First try to restore cached user data for immediate UI update
            if let userData = keychain.getUserData(),
               let user = try? userDecoder.decode(User.self, from: userData) {
                print("[AuthManager] Restored user from cache: \(user.email)")
                self.currentUser = user
                self.isAuthenticated = true
                print("[AuthManager] Auth state updated - isAuthenticated: \(self.isAuthenticated)")
            }
            
            // Then verify with server and update if needed in background
            Task { @MainActor in
                print("[AuthManager] Verifying auth with server...")
                await fetchCurrentUser()
            }
        } else {
            print("[AuthManager] No saved token found")
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
        print("[KeychainManager] Saving token: \(String(token.prefix(10)))...")
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        print("[KeychainManager] Save token status: \(status) (\(keychainErrorMessage(status)))")
    }
    
    func getToken() -> String? {
        print("[KeychainManager] Retrieving token...")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        print("[KeychainManager] Get token status: \(status) (\(keychainErrorMessage(status)))")
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            print("[KeychainManager] No token found or error retrieving")
            return nil
        }
        
        print("[KeychainManager] Retrieved token: \(String(token.prefix(10)))...")
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
        print("[KeychainManager] Saving user data (\(data.count) bytes)")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userDataKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        print("[KeychainManager] Save user data status: \(status) (\(keychainErrorMessage(status)))")
    }
    
    func getUserData() -> Data? {
        print("[KeychainManager] Retrieving user data...")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userDataKey,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        print("[KeychainManager] Get user data status: \(status) (\(keychainErrorMessage(status)))")
        
        guard status == errSecSuccess,
              let data = result as? Data else {
            print("[KeychainManager] No user data found or error retrieving")
            return nil
        }
        
        print("[KeychainManager] Retrieved user data (\(data.count) bytes)")
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
    
    private func keychainErrorMessage(_ status: OSStatus) -> String {
        switch status {
        case errSecSuccess:
            return "Success"
        case errSecItemNotFound:
            return "Item not found"
        case errSecDuplicateItem:
            return "Duplicate item"
        case errSecAuthFailed:
            return "Authentication failed"
        case errSecNoAccessForItem:
            return "No access"
        case errSecUnimplemented:
            return "Unimplemented"
        case errSecParam:
            return "Invalid parameter"
        case errSecAllocate:
            return "Memory allocation error"
        case errSecNotAvailable:
            return "Service not available"
        case errSecReadOnly:
            return "Read only"
        case errSecNoSuchKeychain:
            return "No such keychain"
        case errSecInvalidKeychain:
            return "Invalid keychain"
        case errSecDataTooLarge:
            return "Data too large"
        default:
            return "Unknown error: \(status)"
        }
    }
}