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
        .tint(.brandPink)
        .onAppear {
            // Customize tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(Color.bgSecondary)
            
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}

struct ProfileView: View {
    @StateObject private var authService = AuthService.shared
    @State private var showingLogoutAlert = false
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(authService.currentUser?.email ?? "")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                            
                            Text("\(authService.currentUser?.credits ?? 0) credits")
                                .font(.subheadline)
                                .foregroundColor(.brandTeal)
                        }
                        
                        Spacer()
                        
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [.brandPink, .brandPurple],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 50, height: 50)
                            .overlay(
                                Text(String(authService.currentUser?.email.prefix(1).uppercased() ?? ""))
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                            )
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.bgSecondary)
                
                Section {
                    NavigationLink(destination: CreditsView()) {
                        Label("Purchase Credits", systemImage: "creditcard")
                            .foregroundColor(.textPrimary)
                    }
                    .listRowBackground(Color.bgSecondary)
                } header: {
                    Text("Credits")
                        .foregroundColor(.textSecondary)
                }
                
                Section {
                    Button(action: { showingLogoutAlert = true }) {
                        HStack {
                            Image(systemName: "arrow.right.square")
                                .foregroundColor(.error)
                            Text("Log Out")
                                .foregroundColor(.error)
                        }
                    }
                    .listRowBackground(Color.bgSecondary)
                }
            }
            .background(Color.bgPrimary)
            .scrollContentBackground(.hidden)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .alert("Log Out?", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Log Out", role: .destructive) {
                    Task {
                        await authService.logout()
                    }
                }
            } message: {
                Text("Are you sure you want to log out?")
            }
        }
    }
}