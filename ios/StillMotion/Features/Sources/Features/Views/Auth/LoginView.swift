import SwiftUI

public struct LoginView: View {
    @StateObject private var authService = AuthService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var showingSignup = false
    @State private var showingError = false
    @State private var errorMessage = ""
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.bgPrimary
                    .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Logo
                    VStack(spacing: 16) {
                        Text("StillMotion")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.textPrimary)
                        
                        Text("Transform your images into captivating GIFs")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 60)
                    
                    // Form
                    VStack(spacing: 20) {
                        VStack(spacing: 16) {
                            TextField("Email", text: $email)
                                .textFieldStyle(StillMotionTextFieldStyle())
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                            
                            SecureField("Password", text: $password)
                                .textFieldStyle(StillMotionTextFieldStyle())
                                .textContentType(.password)
                        }
                        
                        Button(action: login) {
                            if authService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                            } else {
                                Text("Log In")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                            }
                        }
                        .background(
                            LinearGradient(
                                colors: [.brandPink, .brandPurple, .brandBlue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                        .disabled(authService.isLoading || email.isEmpty || password.isEmpty)
                        .opacity((authService.isLoading || email.isEmpty || password.isEmpty) ? 0.5 : 1)
                    }
                    .padding(.horizontal, 32)
                    
                    // Sign up link
                    Button(action: { showingSignup = true }) {
                        HStack {
                            Text("Don't have an account?")
                                .foregroundColor(.textSecondary)
                            Text("Sign up")
                                .foregroundColor(.brandPink)
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                    }
                    
                    Spacer()
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingSignup) {
                SignupView()
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private func login() {
        Task {
            do {
                try await authService.login(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}

// MARK: - Custom TextField Style
struct StillMotionTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.bgSecondary)
            .foregroundColor(.textPrimary)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.borderPrimary, lineWidth: 1)
            )
            .cornerRadius(12)
    }
}