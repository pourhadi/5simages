import SwiftUI
import PhotosUI

public struct GenerateView: View {
    @StateObject private var authService = AuthService.shared
    @State private var selectedImage: UIImage?
    @State private var prompt = ""
    @State private var generationType: GenerationType = .slow
    @State private var enhancePrompt = true
    @State private var numberOfGenerations = 1
    @State private var showAdvancedSettings = false
    @State private var sampleSteps = 30
    @State private var sampleGuideScale = 5.0
    @State private var isGenerating = false
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var showingSuccess = false
    
    private let apiClient = APIClient.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Image Selection
                imageSection
                
                // Prompt Section
                promptSection
                
                // Generation Mode
                generationModeSection
                
                // Number of Generations
                numberOfGenerationsSection
                
                // Advanced Settings (Fast mode only)
                if generationType == .fast && showAdvancedSettings {
                    advancedSettingsSection
                }
                
                // Generate Button
                generateButton
            }
            .padding()
        }
        .background(Color.bgPrimary)
        .navigationTitle("Generate GIF")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(image: $selectedImage)
        }
        .sheet(isPresented: $showingCamera) {
            CameraPicker(image: $selectedImage)
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
        .alert("Success!", isPresented: $showingSuccess) {
            Button("OK") { }
        } message: {
            Text("Your GIF\(numberOfGenerations > 1 ? "s are" : " is") being generated! Check the gallery in a few minutes.")
        }
    }
    
    // MARK: - Sections
    
    private var imageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upload Image")
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            if let image = selectedImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 300)
                        .cornerRadius(16)
                    
                    Button(action: { selectedImage = nil }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .background(Circle().fill(Color.black.opacity(0.5)))
                    }
                    .padding(8)
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "photo.on.rectangle")
                        .font(.system(size: 48))
                        .foregroundColor(.textSecondary)
                    
                    Text("Select an image")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    HStack(spacing: 16) {
                        Button(action: { showingImagePicker = true }) {
                            Label("Gallery", systemImage: "photo.library")
                                .font(.subheadline)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.bgTertiary)
                                .foregroundColor(.textPrimary)
                                .cornerRadius(8)
                        }
                        
                        Button(action: { showingCamera = true }) {
                            Label("Camera", systemImage: "camera")
                                .font(.subheadline)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.bgTertiary)
                                .foregroundColor(.textPrimary)
                                .cornerRadius(8)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color.bgSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(style: StrokeStyle(lineWidth: 2, dash: [5]))
                        .foregroundColor(.borderPrimary)
                )
                .cornerRadius(16)
            }
        }
    }
    
    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Describe the Animation")
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            TextField("Describe how you want your image to move...", text: $prompt, axis: .vertical)
                .lineLimit(3...6)
                .padding()
                .background(Color.bgSecondary)
                .foregroundColor(.textPrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.borderPrimary, lineWidth: 1)
                )
                .cornerRadius(12)
            
            Toggle(isOn: $enhancePrompt) {
                HStack {
                    Text("Auto-enhance prompt")
                        .font(.subheadline)
                        .foregroundColor(.textPrimary)
                    
                    Image(systemName: "info.circle")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
            }
            .tint(.brandPink)
        }
    }
    
    private var generationModeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Generation Mode")
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            HStack(spacing: 12) {
                ForEach(GenerationType.allCases, id: \.self) { type in
                    GenerationModeCard(
                        type: type,
                        isSelected: generationType == type,
                        action: { generationType = type }
                    )
                }
            }
        }
    }
    
    private var numberOfGenerationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Number of Generations")
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            HStack(spacing: 20) {
                Button(action: { if numberOfGenerations > 1 { numberOfGenerations -= 1 } }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundColor(numberOfGenerations > 1 ? .brandPink : .textSecondary)
                }
                .disabled(numberOfGenerations <= 1)
                
                VStack(spacing: 4) {
                    Text("\(numberOfGenerations)")
                        .font(.title)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                    
                    Text("\(totalCost) credit\(totalCost != 1 ? "s" : "") total")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                .frame(minWidth: 100)
                
                Button(action: { 
                    if numberOfGenerations < 10 && hasEnoughCredits(for: numberOfGenerations + 1) {
                        numberOfGenerations += 1
                    }
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(canIncreaseGenerations ? .brandPink : .textSecondary)
                }
                .disabled(!canIncreaseGenerations)
            }
            .frame(maxWidth: .infinity)
            
            if numberOfGenerations > 1 {
                Text("Each generation will create a unique GIF with the same image and prompt")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
        }
    }
    
    private var advancedSettingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button(action: { withAnimation { showAdvancedSettings.toggle() } }) {
                HStack {
                    Image(systemName: "gearshape")
                    Text(showAdvancedSettings ? "Hide" : "Show" + " Advanced Settings")
                        .font(.subheadline)
                }
                .foregroundColor(.brandPink)
            }
            
            if showAdvancedSettings {
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sample Steps: \(sampleSteps)")
                            .font(.subheadline)
                            .foregroundColor(.textPrimary)
                        
                        Slider(value: Binding(
                            get: { Double(sampleSteps) },
                            set: { sampleSteps = Int($0) }
                        ), in: 1...40, step: 1)
                        .tint(.brandPink)
                        
                        Text("More steps = higher quality but slower generation")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Guide Scale: \(String(format: "%.1f", sampleGuideScale))")
                            .font(.subheadline)
                            .foregroundColor(.textPrimary)
                        
                        Slider(value: $sampleGuideScale, in: 0...10, step: 0.1)
                            .tint(.brandPink)
                        
                        Text("Higher values follow the prompt more closely")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding()
                .background(Color.bgSecondary)
                .cornerRadius(12)
            }
        }
    }
    
    private var generateButton: some View {
        VStack(spacing: 8) {
            Button(action: generate) {
                if isGenerating {
                    HStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Generating \(numberOfGenerations) GIF\(numberOfGenerations > 1 ? "s" : "")...")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                } else {
                    HStack {
                        Image(systemName: "wand.and.rays")
                        Text("Generate \(numberOfGenerations) GIF\(numberOfGenerations > 1 ? "s" : "") (\(totalCost) credit\(totalCost > 1 ? "s" : ""))")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
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
            .disabled(!canGenerate)
            .opacity(canGenerate ? 1 : 0.5)
            
            if !hasEnoughCredits(for: numberOfGenerations) && selectedImage != nil && !prompt.isEmpty {
                Text("You need \(totalCost) credit\(totalCost > 1 ? "s" : ""). You have \(authService.currentUser?.credits ?? 0).")
                    .font(.caption)
                    .foregroundColor(.error)
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var totalCost: Int {
        generationType.credits * numberOfGenerations
    }
    
    private var canGenerate: Bool {
        selectedImage != nil &&
        !prompt.isEmpty &&
        !isGenerating &&
        hasEnoughCredits(for: numberOfGenerations)
    }
    
    private var canIncreaseGenerations: Bool {
        numberOfGenerations < 10 && hasEnoughCredits(for: numberOfGenerations + 1)
    }
    
    private func hasEnoughCredits(for generations: Int) -> Bool {
        let cost = generationType.credits * generations
        return (authService.currentUser?.credits ?? 0) >= cost
    }
    
    // MARK: - Actions
    
    private func generate() {
        guard let image = selectedImage else { return }
        
        isGenerating = true
        
        Task {
            do {
                // Upload image first
                let imageData = image.jpegData(compressionQuality: 0.8)!
                let uploadResponse = try await apiClient.upload(
                    "/upload",
                    fileData: imageData,
                    fileName: "image.jpg",
                    mimeType: "image/jpeg"
                )
                
                // Submit multiple generation requests
                var requests: [Task<Void, Error>] = []
                
                for _ in 0..<numberOfGenerations {
                    let request = Task {
                        let generateRequest = GenerateVideoRequest(
                            imageUrl: uploadResponse.url,
                            prompt: prompt,
                            generationType: generationType,
                            enhancePrompt: enhancePrompt,
                            sampleSteps: generationType == .fast ? sampleSteps : nil,
                            sampleGuideScale: generationType == .fast ? sampleGuideScale : nil
                        )
                        
                        _ = try await apiClient.request(
                            "/generate-video",
                            method: .post,
                            body: generateRequest,
                            responseType: GenerateVideoResponse.self
                        )
                    }
                    requests.append(request)
                }
                
                // Wait for all requests to complete
                for request in requests {
                    try await request.value
                }
                
                // Refresh user credits
                try await authService.refreshUser()
                
                // Reset form
                selectedImage = nil
                prompt = ""
                numberOfGenerations = 1
                
                showingSuccess = true
                
            } catch {
                errorMessage = error.localizedDescription
                showingError = true
            }
            
            isGenerating = false
        }
    }
}

// MARK: - Supporting Views

struct GenerationModeCard: View {
    let type: GenerationType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: type == .fast ? "bolt.fill" : "clock.fill")
                        .foregroundColor(type == .fast ? .brandPink : .brandBlue)
                    
                    Text(type.displayName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                }
                
                Text("\(type.credits) credit\(type.credits > 1 ? "s" : "")")
                    .font(.caption)
                    .foregroundColor(.brandTeal)
                
                Text(type.description)
                    .font(.caption2)
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? (type == .fast ? Color.brandPink : Color.brandBlue).opacity(0.1) : Color.bgSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? (type == .fast ? Color.brandPink : Color.brandBlue) : Color.borderPrimary, lineWidth: 2)
            )
            .cornerRadius(12)
        }
    }
}