import SwiftUI

public struct StillMotionView: View {
    @StateObject private var authManager = AuthManager.shared
    
    public init() {}
    
    public var body: some View {
        if authManager.isAuthenticated {
            GalleryView()
        } else {
            LoginView {
                
            }
        }
    }
}