import Foundation
import Combine

@MainActor
public class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published public private(set) var currentUser: User?
    @Published public private(set) var isAuthenticated = false
    
    private let keychain = KeychainManager()
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
        checkAuthStatus()
    }
    
    private func checkAuthStatus() {
        if authToken != nil {
            Task {
                await fetchCurrentUser()
            }
        }
    }
    
    public func login(email: String, password: String) async throws {
        let request = LoginRequest(email: email, password: password)
        let response: AuthResponse = try await apiClient.request("/api/login", method: .post, body: request)
        
        self.currentUser = response.user
        self.isAuthenticated = true
        
        if let token = response.token {
            self.authToken = token
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
    }
    
    public func forgotPassword(email: String) async throws {
        let request = ForgotPasswordRequest(email: email)
        let _: [String: String] = try await apiClient.request("/api/forgot-password", method: .post, body: request)
    }
    
    public func logout() {
        self.currentUser = nil
        self.isAuthenticated = false
        self.authToken = nil
    }
    
    public func fetchCurrentUser() async {
        guard authToken != nil else { return }
        
        do {
            let user: User = try await apiClient.request("/api/user")
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            if case APIError.unauthorized = error {
                logout()
            }
        }
    }
}

class KeychainManager {
    private let service = "ai.stillmotion.sdk"
    private let tokenKey = "authToken"
    
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
}