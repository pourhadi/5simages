import SwiftUI

public struct ContentView: View {
    @StateObject private var authService = AuthService.shared
    
    public init() {}
    
    public var body: some View {
        Group {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct MainTabView: View {
    @StateObject private var authService = AuthService.shared
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            GenerateView()
                .tabItem {
                    Image(systemName: "wand.and.rays")
                    Text("Generate")
                }
                .tag(0)
            
            GalleryView()
                .tabItem {
                    Image(systemName: "photo.stack")
                    Text("Gallery")
                }
                .tag(1)
            
            CreditsView()
                .tabItem {
                    Image(systemName: "creditcard")
                    Text("Credits")
                }
                .tag(2)
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.circle")
                    Text("Profile")
                }
                .tag(3)
        }
        .tint(.blue)
    }
}

// Full implementations are now imported from separate files

struct ProfileView: View {
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 30) {
                Text("Profile")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                if let user = authService.currentUser {
                    VStack(spacing: 10) {
                        Text(user.email)
                            .font(.title2)
                        
                        Text("\(user.credits) credits")
                            .font(.headline)
                            .foregroundColor(.blue)
                    }
                }
                
                Button("Logout") {
                    Task {
                        await authService.logout()
                    }
                }
                .foregroundColor(.red)
                .font(.headline)
            }
            .navigationTitle("Profile")
        }
    }
}