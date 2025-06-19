import SwiftUI
import StillMotionSDK

@main
struct StillMotionExampleApp: App {
    init() {
        // Configure the SDK with your base URL if needed
        // For local testing:
        StillMotionSDK.shared.configure(baseURL: "http://localhost:3000")
        // For production:
        // StillMotionSDK.shared.configure(baseURL: "https://stillmotion.ai")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}