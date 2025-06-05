import SwiftUI

public struct SignupView: View {
    @StateObject private var authService = AuthService.shared
    @Environment(\.dismiss) private var dismiss
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.bgPrimary
                    .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 16) {
                        Text("Create Account")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.textPrimary)
                        
                        Text("Start creating amazing GIFs today")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                    }
                    .padding(.top, 40)
                    
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
                                .textContentType(.newPassword)
                            
                            SecureField("Confirm Password", text: $confirmPassword)
                                .textFieldStyle(StillMotionTextFieldStyle())
                                .textContentType(.newPassword)
                        }
                        
                        if !password.isEmpty && password != confirmPassword {
                            Text("Passwords don't match")
                                .font(.caption)
                                .foregroundColor(.error)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        
                        Button(action: signup) {
                            if authService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                            } else {
                                Text("Sign Up")
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
                        .disabled(!canSignup)
                        .opacity(canSignup ? 1 : 0.5)
                        
                        Text("You'll get 3 free credits to start!")
                            .font(.caption)
                            .foregroundColor(.brandTeal)
                            .padding(.top, 8)
                    }
                    .padding(.horizontal, 32)
                    
                    // Login link
                    Button(action: { dismiss() }) {
                        HStack {
                            Text("Already have an account?")
                                .foregroundColor(.textSecondary)
                            Text("Log in")
                                .foregroundColor(.brandPink)
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                    }
                    
                    Spacer()
                }
            }
            .navigationBarItems(
                leading: Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.textSecondary)
                }
            )
            .navigationBarTitleDisplayMode(.inline)
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private var canSignup: Bool {
        !authService.isLoading &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 6
    }
    
    private func signup() {
        Task {
            do {
                try await authService.register(email: email, password: password)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}