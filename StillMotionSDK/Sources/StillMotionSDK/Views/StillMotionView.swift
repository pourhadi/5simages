import SwiftUI

public struct StillMotionView: View {
    @ObservedObject private var authManager = AuthManager.shared
    
    public init() {
        // Force initialization of AuthManager
        AuthManager.initialize()
    }
    
    public var body: some View {
        Group {
            if authManager.isAuthenticated {
                GalleryView()
            } else {
                LoginView {
                    // Login completed - auth state will automatically update
                }
            }
        }
        .onAppear {
            print("[StillMotionView] View appeared - isAuthenticated: \(authManager.isAuthenticated)")
            print("[StillMotionView] Current user: \(authManager.currentUser?.email ?? "nil")")
            
            // Test keychain functionality
            authManager.testKeychain()
            
            // Force a check for auth state
            Task {
                await authManager.fetchCurrentUser()
            }
        }
        .onChange(of: authManager.isAuthenticated) { isAuthenticated in
            print("[StillMotionView] Auth state changed to: \(isAuthenticated)")
        }
    }
}