import SwiftUI
import PhotosUI
#if canImport(UIKit)
import UIKit
#endif

public struct GeneratorView: View {
    @StateObject private var videoService = VideoService.shared
    @StateObject private var authManager = AuthManager.shared
    @Environment(\.dismiss) private var dismiss
    
    #if canImport(UIKit)
    @State private var selectedImage: UIImage?
    #endif
    @State private var imageData: Data?
    @State private var prompt = ""
    @State private var enhancePrompt = true
    @State private var selectedMode = GenerationMode.standard
    @State private var numberOfGenerations = 1
    @State private var sampleSteps = 30
    @State private var sampleGuideScale = 5.0
    @State private var showingImagePicker = false
    @State private var isGenerating = false
    @State private var errorMessage: String?
    @State private var photosPickerItem: PhotosPickerItem?
    
    let initialImageData: Data?
    let initialPrompt: String
    
    public init(
        initialImageData: Data? = nil,
        initialPrompt: String = "",
        enhancePrompt: Bool = true,
        mode: GenerationMode = .standard,
        sampleSteps: Int? = nil,
        sampleGuideScale: Double? = nil
    ) {
        self.initialImageData = initialImageData
        self.initialPrompt = initialPrompt
        self._enhancePrompt = State(initialValue: enhancePrompt)
        self._selectedMode = State(initialValue: mode)
        if let steps = sampleSteps {
            self._sampleSteps = State(initialValue: steps)
        }
        if let scale = sampleGuideScale {
            self._sampleGuideScale = State(initialValue: scale)
        }
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    imageSection
                    promptSection
                    optionsSection
                    generateButton
                }
                .padding()
            }
            .navigationTitle("Create GIF")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .photosPicker(isPresented: $showingImagePicker, selection: $photosPickerItem, matching: .images)
            .onChange(of: photosPickerItem) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self) {
                        #if canImport(UIKit)
                        if let uiImage = UIImage(data: data) {
                            selectedImage = uiImage
                            imageData = data
                        }
                        #else
                        imageData = data
                        #endif
                    }
                }
            }
            .onAppear {
                if let initialImageData = initialImageData {
                    imageData = initialImageData
                    #if canImport(UIKit)
                    selectedImage = UIImage(data: initialImageData)
                    #endif
                }
                if !initialPrompt.isEmpty {
                    prompt = initialPrompt
                }
            }
        }
    }
    
    private var imageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Image")
                .font(.headline)
            
            Button(action: { showingImagePicker = true }) {
                #if canImport(UIKit)
                if let selectedImage = selectedImage {
                    Image(uiImage: selectedImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 200)
                        .clipped()
                        .cornerRadius(12)
                        .overlay(alignment: .topTrailing) {
                            Image(systemName: "pencil.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .background(Circle().fill(Color.black.opacity(0.5)))
                                .padding(8)
                        }
                } else {
                    placeholderImage
                }
                #else
                if imageData != nil {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 200)
                        .cornerRadius(12)
                        .overlay(alignment: .topTrailing) {
                            Image(systemName: "pencil.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .background(Circle().fill(Color.black.opacity(0.5)))
                                .padding(8)
                        }
                } else {
                    placeholderImage
                }
                #endif
            }
            .buttonStyle(.plain)
        }
    }
    
    private var placeholderImage: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.gray.opacity(0.2))
            .frame(height: 200)
            .overlay {
                VStack(spacing: 12) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("Select Image")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
            }
    }
    
    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Animation Prompt")
                .font(.headline)
            
            TextEditor(text: $prompt)
                .frame(height: 100)
                .padding(8)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
            
            Toggle("Auto-enhance prompt", isOn: $enhancePrompt)
                .font(.subheadline)
        }
    }
    
    private var optionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Generation Options")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Quality Mode")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Picker("Mode", selection: $selectedMode) {
                    ForEach(GenerationMode.allCases, id: \.self) { mode in
                        HStack {
                            Text(mode.displayName)
                            Spacer()
                            Text("\(mode.credits) credits")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Number of Generations")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(numberOfGenerations)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                
                Slider(value: .init(
                    get: { Double(numberOfGenerations) },
                    set: { numberOfGenerations = Int($0) }
                ), in: 1...4, step: 1)
            }
            
            if selectedMode == .premium {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Sample Steps")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(sampleSteps)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        
                        Slider(value: .init(
                            get: { Double(sampleSteps) },
                            set: { sampleSteps = Int($0) }
                        ), in: 1...40, step: 1)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Guide Scale")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(String(format: "%.1f", sampleGuideScale))
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        
                        Slider(value: $sampleGuideScale, in: 0...10, step: 0.1)
                    }
                }
            }
            
            if let credits = authManager.currentUser?.credits {
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundStyle(.orange)
                    Text("Available credits: \(credits)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)
            }
        }
    }
    
    private var generateButton: some View {
        VStack(spacing: 12) {
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: handleGenerate) {
                if isGenerating {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(height: 22)
                } else {
                    HStack {
                        Text("Generate")
                        Text("(\(selectedMode.credits * numberOfGenerations) credits)")
                            .font(.caption)
                    }
                    .frame(height: 22)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isFormValid ? Color.accentColor : Color.gray)
            .foregroundStyle(.white)
            .cornerRadius(10)
            .disabled(!isFormValid || isGenerating)
        }
    }
    
    private var isFormValid: Bool {
        #if canImport(UIKit)
        return selectedImage != nil && !prompt.isEmpty && imageData != nil
        #else
        return imageData != nil && !prompt.isEmpty
        #endif
    }
    
    private func handleGenerate() {
        guard let imageData = imageData else { return }
        
        errorMessage = nil
        isGenerating = true
        
        Task {
            do {
                let videos = try await videoService.generateVideo(
                    imageData: imageData,
                    prompt: prompt,
                    enhancePrompt: enhancePrompt,
                    mode: selectedMode,
                    sampleSteps: selectedMode == .premium ? sampleSteps : nil,
                    sampleGuideScale: selectedMode == .premium ? sampleGuideScale : nil,
                    numberOfGenerations: numberOfGenerations
                )
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    if let apiError = error as? APIError {
                        errorMessage = apiError.errorDescription
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    isGenerating = false
                }
            }
        }
    }
}