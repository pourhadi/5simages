import Foundation
import SwiftUI

public struct StillMotionSDK {
    public static var shared = StillMotionSDK()
    
    internal var apiClient: APIClient
    
    private init() {
        self.apiClient = APIClient()
    }
    
    public func configure(baseURL: String? = nil) {
        if let baseURL = baseURL {
            apiClient.baseURL = baseURL
        }
    }
    
    @MainActor
    public var isAuthenticated: Bool {
        AuthManager.shared.isAuthenticated
    }
    
    @MainActor
    public var currentUser: User? {
        AuthManager.shared.currentUser
    }
}