import SwiftUI

public struct StillMotionView: View {
    @ObservedObject private var authManager = AuthManager.shared
    
    public init() {}
    
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
        }
        .onChange(of: authManager.isAuthenticated) { isAuthenticated in
            print("[StillMotionView] Auth state changed to: \(isAuthenticated)")
        }
    }
}