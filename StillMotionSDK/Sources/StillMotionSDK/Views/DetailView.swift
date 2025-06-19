import SwiftUI
import Photos

public struct DetailView: View {
    @StateObject private var videoService = VideoService.shared
    @State private var video: Video
    @State private var showingShareSheet = false
    @State private var showingGenerator = false
    @State private var gifData: Data?
    @State private var isDownloading = false
    @State private var showingDeleteAlert = false
    @Environment(\.dismiss) private var dismiss
    
    public init(video: Video) {
        self._video = State(initialValue: video)
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    if video.videoStatus == .completed, let gifUrl = video.gifUrl {
                        AsyncImage(url: URL(string: gifUrl)) { phase in
                            switch phase {
                            case .empty:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .aspectRatio(1, contentMode: .fit)
                                    .overlay {
                                        ProgressView()
                                    }
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                            case .failure(_):
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .aspectRatio(1, contentMode: .fit)
                                    .overlay {
                                        VStack(spacing: 12) {
                                            Image(systemName: "exclamationmark.triangle")
                                                .font(.largeTitle)
                                                .foregroundStyle(.secondary)
                                            Text("Failed to load GIF")
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                            @unknown default:
                                EmptyView()
                            }
                        }
                    } else {
                        statusView
                    }
                    
                    detailPane
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        if video.videoStatus == .completed {
                            Button(action: handleDownload) {
                                Label("Download", systemImage: "arrow.down.circle")
                            }
                            
                            Button(action: { showingShareSheet = true }) {
                                Label("Share", systemImage: "square.and.arrow.up")
                            }
                        }
                        
                        Button(action: { showingDeleteAlert = true }) {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let gifData = gifData {
                    ShareSheet(items: [gifData])
                }
            }
            .sheet(isPresented: $showingGenerator) {
                GeneratorView(
                    initialImageData: nil,
                    initialPrompt: video.prompt,
                    enhancePrompt: video.enhancedPrompt != nil,
                    mode: video.mode
                )
            }
            .alert("Delete GIF", isPresented: $showingDeleteAlert) {
                Button("Delete", role: .destructive) {
                    handleDelete()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to delete this GIF? This action cannot be undone.")
            }
            .task {
                if video.videoStatus == .processing || video.videoStatus == .pending {
                    await pollForUpdates()
                }
            }
        }
    }
    
    private var statusView: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.1))
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                VStack(spacing: 16) {
                    if video.videoStatus == .processing || video.videoStatus == .pending {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Generating your GIF...")
                            .font(.headline)
                        Text("This may take a few moments")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else if video.videoStatus == .failed {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 50))
                            .foregroundStyle(.red)
                        Text("Generation Failed")
                            .font(.headline)
                        Text("Something went wrong. Please try again.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
            }
    }
    
    private var detailPane: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Button(action: handleLike) {
                    HStack(spacing: 8) {
                        Image(systemName: video.isLiked == true ? "heart.fill" : "heart")
                            .font(.title2)
                            .foregroundStyle(video.isLiked == true ? .red : .primary)
                        Text("Like")
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(20)
                }
                
                Spacer()
                
                if video.videoStatus == .completed {
                    HStack(spacing: 16) {
                        Button(action: handleTweak) {
                            Image(systemName: "slider.horizontal.3")
                                .font(.title2)
                                .foregroundStyle(.blue)
                        }
                        
                        Button(action: handleRegenerate) {
                            Image(systemName: "arrow.clockwise.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.green)
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top)
            
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Original Image")
                        .font(.headline)
                    
                    AsyncImage(url: URL(string: video.imageUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(height: 120)
                                .cornerRadius(8)
                        default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(height: 120)
                                .cornerRadius(8)
                        }
                    }
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Prompt")
                        .font(.headline)
                    Text(video.enhancedPrompt ?? video.prompt)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                
                if video.enhancedPrompt != nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Original Prompt")
                            .font(.headline)
                        Text(video.prompt)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
                
                HStack {
                    Label(video.mode.displayName, systemImage: video.mode == .premium ? "star.fill" : "star")
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(15)
                    
                    Label("\(video.credits) credits", systemImage: "bolt.fill")
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(15)
                }
                
                if let createdAt = formattedDate(video.createdAt) {
                    Text(createdAt)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(Color(.systemBackground))
    }
    
    private func formattedDate(_ date: Date) -> String? {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    private func handleLike() {
        Task {
            do {
                try await videoService.toggleLike(video.id)
                video.isLiked.toggle()
            } catch {
                print("Failed to toggle like: \(error)")
            }
        }
    }
    
    private func handleTweak() {
        showingGenerator = true
    }
    
    private func handleRegenerate() {
        showingGenerator = true
    }
    
    private func handleDownload() {
        guard let gifUrl = video.gifUrl else { return }
        
        isDownloading = true
        Task {
            do {
                let data = try await videoService.downloadGIF(from: gifUrl)
                gifData = data
                
                await MainActor.run {
                    saveToPhotos(data: data)
                    isDownloading = false
                }
            } catch {
                print("Failed to download GIF: \(error)")
                isDownloading = false
            }
        }
    }
    
    private func saveToPhotos(data: Data) {
        PHPhotoLibrary.requestAuthorization { status in
            guard status == .authorized else { return }
            
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, data: data, options: nil)
            }) { success, error in
                if let error = error {
                    print("Error saving to photos: \(error)")
                }
            }
        }
    }
    
    private func handleDelete() {
        Task {
            do {
                try await videoService.deleteVideo(video.id)
                await MainActor.run {
                    dismiss()
                }
            } catch {
                print("Failed to delete video: \(error)")
            }
        }
    }
    
    private func pollForUpdates() async {
        while video.videoStatus == .processing || video.videoStatus == .pending {
            do {
                try await Task.sleep(nanoseconds: 2_000_000_000)
                let updatedVideo = try await videoService.checkVideoStatus(video.id)
                await MainActor.run {
                    self.video = updatedVideo
                }
                
                if updatedVideo.videoStatus == .completed || updatedVideo.videoStatus == .failed {
                    break
                }
            } catch {
                print("Failed to check status: \(error)")
                break
            }
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}