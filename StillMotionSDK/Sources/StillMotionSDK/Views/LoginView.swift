import SwiftUI

public struct LoginView: View {
    @ObservedObject private var authManager = AuthManager.shared
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var isRegistering = false
    @State private var showForgotPassword = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    
    public var onSuccess: (() -> Void)?
    
    public init(onSuccess: (() -> Void)? = nil) {
        self.onSuccess = onSuccess
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 16) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 60))
                            .foregroundStyle(.tint)
                            .padding(.top, 40)
                        
                        Text("StillMotion.ai")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Transform images into animated GIFs")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    
                    VStack(spacing: 16) {
                        if isRegistering {
                            TextField("Name (optional)", text: $name)
                                .textFieldStyle(.roundedBorder)
                                #if os(iOS)
                                .textInputAutocapitalization(.words)
                                #endif
                                .autocorrectionDisabled()
                        }
                        
                        TextField("Email", text: $email)
                            .textFieldStyle(.roundedBorder)
                            #if os(iOS)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            #endif
                            .autocorrectionDisabled()
                        
                        SecureField("Password", text: $password)
                            .textFieldStyle(.roundedBorder)
                        
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }
                        
                        if let successMessage = successMessage {
                            Text(successMessage)
                                .font(.caption)
                                .foregroundStyle(.green)
                                .multilineTextAlignment(.center)
                        }
                        
                        Button(action: handleSubmit) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(height: 22)
                            } else {
                                Text(isRegistering ? "Create Account" : "Sign In")
                                    .fontWeight(.semibold)
                                    .frame(height: 22)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .cornerRadius(10)
                        .disabled(isLoading || email.isEmpty || password.isEmpty)
                        
                        HStack {
                            Button(action: { isRegistering.toggle() }) {
                                Text(isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                                    .font(.footnote)
                            }
                            
                            if !isRegistering {
                                Spacer()
                                
                                Button(action: { showForgotPassword = true }) {
                                    Text("Forgot Password?")
                                        .font(.footnote)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 40)
            }
            #if os(iOS)
            .navigationBarHidden(true)
            #endif
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView()
            }
        }
    }
    
    private func handleSubmit() {
        errorMessage = nil
        successMessage = nil
        isLoading = true
        
        Task {
            do {
                if isRegistering {
                    try await authManager.register(email: email, password: password, name: name.isEmpty ? nil : name)
                } else {
                    try await authManager.login(email: email, password: password)
                }
                
                await MainActor.run {
                    onSuccess?()
                }
            } catch {
                await MainActor.run {
                    if let apiError = error as? APIError {
                        errorMessage = apiError.errorDescription
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    isLoading = false
                }
            }
        }
    }
}

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isLoading = false
    @State private var message: String?
    @State private var isError = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Reset Password")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top, 40)
                
                Text("Enter your email address and we'll send you instructions to reset your password.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        #if os(iOS)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        #endif
                        .autocorrectionDisabled()
                    
                    if let message = message {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(isError ? .red : .green)
                            .multilineTextAlignment(.center)
                    }
                    
                    Button(action: handleReset) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Send Reset Email")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .cornerRadius(10)
                    .disabled(isLoading || email.isEmpty)
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
    
    private func handleReset() {
        isLoading = true
        message = nil
        
        Task {
            do {
                try await AuthManager.shared.forgotPassword(email: email)
                await MainActor.run {
                    message = "Reset email sent! Check your inbox."
                    isError = false
                    isLoading = false
                    
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    if let apiError = error as? APIError {
                        message = apiError.errorDescription
                    } else {
                        message = error.localizedDescription
                    }
                    isError = true
                    isLoading = false
                }
            }
        }
    }
}