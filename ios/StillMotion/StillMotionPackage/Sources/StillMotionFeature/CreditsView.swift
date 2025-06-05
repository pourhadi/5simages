import SwiftUI
import SafariServices

public struct CreditsView: View {
    @StateObject private var authService = AuthService.shared
    @State private var selectedPackage: CreditPackage?
    @State private var isLoadingPurchase = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var showingSafari = false
    @State private var checkoutURL: URL?
    
    private let apiClient = APIClient.shared
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Current Credits
                    VStack(spacing: 8) {
                        Text("Current Balance")
                            .font(.headline)
                            .foregroundColor(.textSecondary)
                        
                        HStack(alignment: .top, spacing: 4) {
                            Text("\(authService.currentUser?.credits ?? 0)")
                                .font(.system(size: 48, weight: .bold))
                                .foregroundColor(.brandTeal)
                            
                            Text("credits")
                                .font(.title3)
                                .foregroundColor(.textSecondary)
                                .padding(.top, 12)
                        }
                    }
                    .padding(.top, 20)
                    
                    // Credit Packages
                    VStack(spacing: 16) {
                        Text("Purchase Credits")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        ForEach(CreditPackage.packages) { package in
                            CreditPackageCard(
                                package: package,
                                isSelected: selectedPackage?.id == package.id,
                                action: { selectedPackage = package }
                            )
                        }
                    }
                    
                    // Purchase Button
                    Button(action: purchase) {
                        if isLoadingPurchase {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                        } else {
                            HStack {
                                Image(systemName: "creditcard")
                                Text("Purchase Credits")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                        }
                    }
                    .background(
                        LinearGradient(
                            colors: [.brandPink, .brandPurple, .brandBlue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
                    .disabled(selectedPackage == nil || isLoadingPurchase)
                    .opacity((selectedPackage == nil || isLoadingPurchase) ? 0.5 : 1)
                    
                    // Info Text
                    Text("Credits are used to generate GIFs. Fast mode uses 2 credits, Slow mode uses 1 credit.")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding()
            }
            .background(Color.bgPrimary)
            .navigationTitle("Credits")
            .navigationBarTitleDisplayMode(.large)
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .sheet(isPresented: $showingSafari) {
                if let url = checkoutURL {
                    SafariView(url: url)
                }
            }
            .refreshable {
                await refreshCredits()
            }
        }
    }
    
    private func purchase() {
        guard let package = selectedPackage else { return }
        
        isLoadingPurchase = true
        
        Task {
            do {
                let request = CheckoutRequest(priceId: package.priceId)
                let response = try await apiClient.request(
                    "/checkout",
                    method: .post,
                    body: request,
                    responseType: CheckoutResponse.self
                )
                
                if let url = URL(string: response.url) {
                    checkoutURL = url
                    showingSafari = true
                }
                
            } catch {
                errorMessage = error.localizedDescription
                showingError = true
            }
            
            isLoadingPurchase = false
        }
    }
    
    private func refreshCredits() async {
        try? await authService.refreshUser()
    }
}

struct CreditPackageCard: View {
    let package: CreditPackage
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(package.credits) Credits")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    Text(String(format: "$%.2f per credit", package.pricePerCredit))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(package.displayPrice)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.brandTeal)
                    
                    if package.credits == 30 {
                        Text("Best Value")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.brandPink)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.brandPink.opacity(0.2))
                            .cornerRadius(4)
                    }
                }
            }
            .padding()
            .background(isSelected ? Color.brandPurple.opacity(0.1) : Color.bgSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.brandPurple : Color.borderPrimary, lineWidth: 2)
            )
            .cornerRadius(12)
        }
    }
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = false
        
        let safari = SFSafariViewController(url: url, configuration: config)
        safari.preferredControlTintColor = UIColor(Color.brandPink)
        return safari
    }
    
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}