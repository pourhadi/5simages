import SwiftUI
import StillMotionSDK

@main
struct StillMotionExampleApp: App {
    init() {
        // Configure the SDK with your base URL if needed
        // StillMotionSDK.shared.configure(baseURL: "https://your-custom-domain.com")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}