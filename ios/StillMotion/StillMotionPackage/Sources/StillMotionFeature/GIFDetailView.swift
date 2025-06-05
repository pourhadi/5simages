import SwiftUI
import Photos

struct GIFDetailView: View {
    let video: Video
    let onDismiss: () async -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var gifData: Data?
    @State private var sourceImage: UIImage?
    @State private var isLoadingGif = true
    @State private var isLoadingImage = true
    @State private var showingFrameSelector = false
    @State private var showingDeleteAlert = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var isDeleting = false
    @State private var showingTweakView = false
    
    private let apiClient = APIClient.shared
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // GIF Display
                    if let gifData = gifData {
                        GIFImage(data: gifData)
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 300)
                            .cornerRadius(16)
                            .shadow(color: .black.opacity(0.3), radius: 10, y: 5)
                    } else if isLoadingGif {
                        ProgressView()
                            .frame(height: 300)
                            .frame(maxWidth: .infinity)
                    }
                    
                    // Source Image
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Source Image")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                        
                        if let sourceImage = sourceImage {
                            Image(uiImage: sourceImage)
                                .resizable()
                                .scaledToFit()
                                .frame(maxHeight: 200)
                                .cornerRadius(12)
                                .frame(maxWidth: .infinity)
                        } else if isLoadingImage {
                            ProgressView()
                                .frame(height: 150)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    
                    // Prompt
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Prompt")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                        
                        Text(video.prompt)
                            .font(.body)
                            .foregroundColor(.textSecondary)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.bgSecondary)
                            .cornerRadius(12)
                    }
                    
                    // Action Buttons
                    VStack(spacing: 12) {
                        // Tweak Button
                        Button(action: { showingTweakView = true }) {
                            HStack {
                                Image(systemName: "wand.and.rays")
                                Text("Tweak")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(
                                LinearGradient(
                                    colors: [.brandPink, .brandPurple],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        
                        // Select Frame Button
                        Button(action: { showingFrameSelector = true }) {
                            HStack {
                                Image(systemName: "photo.on.rectangle")
                                Text("Select Frame")
                            }
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.bgTertiary)
                            .cornerRadius(12)
                        }
                        .disabled(gifData == nil)
                        
                        HStack(spacing: 12) {
                            // Download Button
                            Button(action: downloadGIF) {
                                HStack {
                                    Image(systemName: "arrow.down.circle")
                                    Text("Download")
                                }
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.bgTertiary)
                                .cornerRadius(12)
                            }
                            .disabled(gifData == nil)
                            
                            // Delete Button
                            Button(action: { showingDeleteAlert = true }) {
                                if isDeleting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .frame(width: 50, height: 50)
                                        .background(Color.error)
                                        .cornerRadius(12)
                                } else {
                                    Image(systemName: "trash")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .frame(width: 50, height: 50)
                                        .background(Color.error)
                                        .cornerRadius(12)
                                }
                            }
                            .disabled(isDeleting)
                        }
                    }
                    .padding(.top, 8)
                }
                .padding()
            }
            .background(Color.bgPrimary)
            .navigationTitle("GIF Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadContent()
            }
            .alert("Delete GIF?", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    Task {
                        await deleteGIF()
                    }
                }
            } message: {
                Text("This action cannot be undone.")
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .sheet(isPresented: $showingFrameSelector) {
                if let gifData = gifData {
                    FrameSelectorView(gifData: gifData)
                }
            }
            .sheet(isPresented: $showingTweakView) {
                if let sourceImage = sourceImage {
                    TweakView(
                        sourceImage: sourceImage,
                        sourceImageUrl: video.imageUrl,
                        originalPrompt: video.prompt
                    )
                }
            }
        }
    }
    
    private func loadContent() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadGIF() }
            group.addTask { await self.loadSourceImage() }
        }
    }
    
    private func loadGIF() async {
        guard let gifUrl = video.gifUrl,
              let url = URL(string: gifUrl) else {
            isLoadingGif = false
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            gifData = data
        } catch {
            print("Failed to load GIF: \(error)")
        }
        
        isLoadingGif = false
    }
    
    private func loadSourceImage() async {
        guard let url = URL(string: video.imageUrl) else {
            isLoadingImage = false
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            sourceImage = UIImage(data: data)
        } catch {
            print("Failed to load source image: \(error)")
        }
        
        isLoadingImage = false
    }
    
    private func downloadGIF() {
        guard let gifData = gifData else { return }
        
        PHPhotoLibrary.requestAuthorization { status in
            guard status == .authorized else {
                DispatchQueue.main.async {
                    errorMessage = "Photo library access denied"
                    showingError = true
                }
                return
            }
            
            PHPhotoLibrary.shared().performChanges {
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, data: gifData, options: nil)
            } completionHandler: { success, error in
                DispatchQueue.main.async {
                    if success {
                        // Could show success message
                    } else {
                        errorMessage = error?.localizedDescription ?? "Failed to save GIF"
                        showingError = true
                    }
                }
            }
        }
    }
    
    private func deleteGIF() async {
        isDeleting = true
        
        do {
            _ = try await apiClient.request(
                "/videos/\(video.id)",
                method: .delete,
                responseType: EmptyResponse.self
            )
            
            await onDismiss()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
        
        isDeleting = false
    }
}

// MARK: - Frame Selector View
struct FrameSelectorView: View {
    let gifData: Data
    @Environment(\.dismiss) private var dismiss
    @State private var frames: [(image: UIImage, duration: Double)] = []
    @State private var selectedFrameIndex: Int?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8)
                ], spacing: 8) {
                    ForEach(frames.indices, id: \.self) { index in
                        Button(action: { selectedFrameIndex = index }) {
                            Image(uiImage: frames[index].image)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(height: 120)
                                .clipped()
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(selectedFrameIndex == index ? Color.brandPink : Color.clear, lineWidth: 3)
                                )
                                .cornerRadius(8)
                        }
                    }
                }
                .padding()
            }
            .background(Color.bgPrimary)
            .navigationTitle("Select Frame")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveSelectedFrame()
                    }
                    .disabled(selectedFrameIndex == nil)
                }
            }
            .onAppear {
                frames = GIFFrameExtractor.extractFrames(from: gifData)
            }
        }
    }
    
    private func saveSelectedFrame() {
        guard let index = selectedFrameIndex else { return }
        let image = frames[index].image
        
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        dismiss()
    }
}

// MARK: - Tweak View
struct TweakView: View {
    let sourceImage: UIImage
    let sourceImageUrl: String
    let originalPrompt: String
    
    @Environment(\.dismiss) private var dismiss
    @State private var prompt: String = ""
    @State private var generationType: GenerationType = .slow
    @State private var enhancePrompt = true
    @State private var isGenerating = false
    
    private let apiClient = APIClient.shared
    
    init(sourceImage: UIImage, sourceImageUrl: String, originalPrompt: String) {
        self.sourceImage = sourceImage
        self.sourceImageUrl = sourceImageUrl
        self.originalPrompt = originalPrompt
        self._prompt = State(initialValue: originalPrompt)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Source Image Preview
                    Image(uiImage: sourceImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 200)
                        .cornerRadius(12)
                    
                    // Prompt
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Tweak the Prompt")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                        
                        TextField("Enter new prompt...", text: $prompt, axis: .vertical)
                            .lineLimit(3...6)
                            .padding()
                            .background(Color.bgSecondary)
                            .foregroundColor(.textPrimary)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.borderPrimary, lineWidth: 1)
                            )
                            .cornerRadius(12)
                        
                        Toggle("Auto-enhance prompt", isOn: $enhancePrompt)
                            .tint(.brandPink)
                    }
                    
                    // Generation Mode
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
                    
                    // Generate Button
                    Button(action: generate) {
                        if isGenerating {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                Text("Generating...")
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                        } else {
                            HStack {
                                Image(systemName: "wand.and.rays")
                                Text("Generate Tweaked GIF (\(generationType.credits) credit\(generationType.credits > 1 ? "s" : ""))")
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                        }
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .background(
                        LinearGradient(
                            colors: [.brandPink, .brandPurple, .brandBlue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                    .disabled(prompt.isEmpty || isGenerating)
                    .opacity((prompt.isEmpty || isGenerating) ? 0.5 : 1)
                }
                .padding()
            }
            .background(Color.bgPrimary)
            .navigationTitle("Tweak GIF")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func generate() {
        isGenerating = true
        
        Task {
            do {
                let request = GenerateVideoRequest(
                    imageUrl: sourceImageUrl,
                    prompt: prompt,
                    generationType: generationType,
                    enhancePrompt: enhancePrompt
                )
                
                _ = try await apiClient.request(
                    "/generate-video",
                    method: .post,
                    body: request,
                    responseType: GenerateVideoResponse.self
                )
                
                dismiss()
            } catch {
                // Handle error
            }
            
            isGenerating = false
        }
    }
}