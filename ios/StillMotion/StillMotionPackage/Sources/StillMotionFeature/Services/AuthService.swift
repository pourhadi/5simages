import Foundation
import SwiftUI

@MainActor
public class AuthService: ObservableObject {
    public static let shared = AuthService()
    
    @Published public private(set) var currentUser: User?
    @Published public private(set) var isAuthenticated = false
    @Published public private(set) var isLoading = false
    
    private let apiClient = APIClient.shared
    private let keychain = KeychainHelper()
    
    private init() {
        Task {
            await checkStoredCredentials()
        }
    }
    
    private func checkStoredCredentials() async {
        guard let token = keychain.getToken() else { return }
        
        await apiClient.setAuthToken(token)
        
        do {
            let user = try await apiClient.request(
                "/user",
                responseType: User.self
            )
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            // Token is invalid, clear it
            keychain.deleteToken()
            await apiClient.setAuthToken(nil)
        }
    }
    
    public func login(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        let request = LoginRequest(email: email, password: password)
        let response = try await apiClient.request(
            "/login",
            method: .post,
            body: request,
            responseType: AuthResponse.self
        )
        
        // Store token
        keychain.saveToken(response.token)
        await apiClient.setAuthToken(response.token)
        
        // Update state
        self.currentUser = response.user
        self.isAuthenticated = true
    }
    
    public func register(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        let request = RegisterRequest(email: email, password: password)
        _ = try await apiClient.request(
            "/register",
            method: .post,
            body: request,
            responseType: EmptyResponse.self
        )
        
        // After successful registration, log in
        try await login(email: email, password: password)
    }
    
    public func logout() async {
        isLoading = true
        defer { isLoading = false }
        
        // Try to call logout endpoint (ignore errors)
        try? await apiClient.request(
            "/logout",
            method: .post,
            responseType: EmptyResponse.self
        )
        
        // Clear local state
        keychain.deleteToken()
        await apiClient.setAuthToken(nil)
        currentUser = nil
        isAuthenticated = false
    }
    
    public func refreshUser() async throws {
        guard isAuthenticated else { return }
        
        let user = try await apiClient.request(
            "/user",
            responseType: User.self
        )
        self.currentUser = user
    }
}

// MARK: - Keychain Helper
class KeychainHelper {
    private let tokenKey = "com.stillmotion.authToken"
    
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
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
            kSecAttrAccount as String: tokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

struct EmptyResponse: Codable {}