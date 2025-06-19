import SwiftUI
import ImageIO
#if canImport(UIKit)
import Photos
import UIKit
#else
import AppKit
import UniformTypeIdentifiers
#endif

public struct DetailView: View {
    @StateObject private var videoService = VideoService.shared
    @State private var currentIndex: Int
    @State private var videos: [Video]
    @State private var showingShareSheet = false
    @State private var showingGenerator = false
    @State private var gifData: Data?
    @State private var isDownloading = false
    @State private var showingDeleteAlert = false
    @Environment(\.dismiss) private var dismiss
    
    private var currentVideo: Video {
        videos[currentIndex]
    }
    
    public init(video: Video) {
        self._currentIndex = State(initialValue: 0)
        self._videos = State(initialValue: [video])
    }
    
    public init(videos: [Video], currentIndex: Int) {
        self._currentIndex = State(initialValue: currentIndex)
        self._videos = State(initialValue: videos)
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // GIF view with horizontal swiping
                TabView(selection: $currentIndex) {
                    ForEach(Array(videos.enumerated()), id: \.element.id) { index, video in
                        VStack {
                            if video.videoStatus == .completed, let gifUrl = video.gifUrl, let url = URL(string: gifUrl) {
                                AnimatedGIFContainer(url: url)
                                    .aspectRatio(contentMode: .fit)
                                    .frame(maxHeight: 400)
                                    .clipped()
                            } else {
                                statusView(for: video)
                                    .frame(maxHeight: 400)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal)
                        .tag(index)
                    }
                }
                #if os(iOS)
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: videos.count > 1 ? .automatic : .never))
                #endif
                .frame(height: 450)
                
                ScrollView {
                    detailPane
                }
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        if currentVideo.videoStatus == .completed {
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
                    initialPrompt: currentVideo.prompt,
                    enhancePrompt: currentVideo.enhancedPrompt != nil,
                    mode: currentVideo.mode
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
            .task(id: currentIndex) {
                if currentVideo.videoStatus == .processing || currentVideo.videoStatus == .pending {
                    await pollForUpdates()
                }
            }
        }
    }
    
    private func statusView(for video: Video) -> some View {
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
    
    private var backgroundColorCompat: Color {
        #if canImport(UIKit)
        return Color(UIColor.systemBackground)
        #else
        return Color(NSColor.windowBackgroundColor)
        #endif
    }
    
    private var detailPane: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Button(action: handleLike) {
                    HStack(spacing: 8) {
                        Image(systemName: currentVideo.isLiked == true ? "heart.fill" : "heart")
                            .font(.title2)
                            .foregroundStyle(currentVideo.isLiked == true ? .red : .primary)
                        Text("Like")
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(20)
                }
                
                Spacer()
                
                if currentVideo.videoStatus == .completed {
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
                    
                    AsyncImage(url: URL(string: currentVideo.imageUrl)) { phase in
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
                    Text(currentVideo.enhancedPrompt ?? currentVideo.prompt)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                
                if currentVideo.enhancedPrompt != nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Original Prompt")
                            .font(.headline)
                        Text(currentVideo.prompt)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
                
                HStack {
                    Label(currentVideo.mode.displayName, systemImage: currentVideo.mode == .premium ? "star.fill" : "star")
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(15)
                    
                    Label("\(currentVideo.credits) credits", systemImage: "bolt.fill")
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(15)
                }
                
                if let createdAt = formattedDate(currentVideo.createdAt) {
                    Text(createdAt)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(backgroundColorCompat)
    }
    
    private func formattedDate(_ date: Date) -> String? {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    private func handleLike() {
        Task {
            do {
                try await videoService.toggleLike(currentVideo.id)
                videos[currentIndex].isLiked.toggle()
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
        guard let gifUrl = currentVideo.gifUrl else { return }
        
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
        #if canImport(UIKit)
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
        #else
        // On macOS, save to Downloads folder
        let downloadsURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        let fileName = "StillMotion_\(Date().timeIntervalSince1970).gif"
        if let url = downloadsURL?.appendingPathComponent(fileName) {
            do {
                try data.write(to: url)
                NSWorkspace.shared.activateFileViewerSelecting([url])
            } catch {
                print("Error saving GIF: \(error)")
            }
        }
        #endif
    }
    
    private func handleDelete() {
        Task {
            do {
                try await videoService.deleteVideo(currentVideo.id)
                await MainActor.run {
                    // Remove the deleted video from the array
                    videos.remove(at: currentIndex)
                    
                    // If no videos left, dismiss
                    if videos.isEmpty {
                        dismiss()
                    } else {
                        // Adjust current index if needed
                        if currentIndex >= videos.count {
                            currentIndex = videos.count - 1
                        }
                    }
                }
            } catch {
                print("Failed to delete video: \(error)")
            }
        }
    }
    
    private func pollForUpdates() async {
        while currentVideo.videoStatus == .processing || currentVideo.videoStatus == .pending {
            do {
                try await Task.sleep(nanoseconds: 2_000_000_000)
                let updatedVideo = try await videoService.checkVideoStatus(currentVideo.id)
                await MainActor.run {
                    self.videos[currentIndex] = updatedVideo
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

#if canImport(UIKit)
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
#else
struct ShareSheet: View {
    let items: [Any]
    
    var body: some View {
        EmptyView()
            .onAppear {
                if let data = items.first as? Data {
                    let savePanel = NSSavePanel()
                    savePanel.allowedContentTypes = [.gif]
                    savePanel.nameFieldStringValue = "animation.gif"
                    
                    if savePanel.runModal() == .OK, let url = savePanel.url {
                        try? data.write(to: url)
                    }
                }
            }
    }
}
#endif

// Internal animated GIF view for DetailView
struct AnimatedGIFContainer: View {
    let url: URL
    @State private var isLoading = true
    
    var body: some View {
        #if canImport(UIKit)
        AnimatedGIFUIView(url: url, isLoading: $isLoading)
        #else
        AnimatedGIFNSView(url: url, isLoading: $isLoading)
        #endif
    }
}

#if canImport(UIKit)
struct AnimatedGIFUIView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeUIView(context: Context) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
        imageView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        imageView.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
        loadGIF(into: imageView)
        return imageView
    }
    
    func updateUIView(_ uiView: UIImageView, context: Context) {}
    
    private func loadGIF(into imageView: UIImageView) {
        isLoading = true
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                DispatchQueue.main.async { isLoading = false }
                return
            }
            
            DispatchQueue.main.async {
                if let image = UIImage.gif(data: data) {
                    imageView.image = image
                }
                isLoading = false
            }
        }.resume()
    }
}

extension UIImage {
    static func gif(data: Data) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        
        let count = CGImageSourceGetCount(source)
        var images: [UIImage] = []
        var duration: TimeInterval = 0
        
        for i in 0..<count {
            if let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) {
                let frameDuration = UIImage.frameDuration(at: i, source: source)
                duration += frameDuration
                images.append(UIImage(cgImage: cgImage))
            }
        }
        
        if images.isEmpty { return nil }
        
        if images.count == 1 {
            return images[0]
        } else {
            return UIImage.animatedImage(with: images, duration: duration)
        }
    }
    
    private static func frameDuration(at index: Int, source: CGImageSource) -> TimeInterval {
        var frameDuration = 0.1
        guard let frameProperties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [String: Any],
              let gifProperties = frameProperties[kCGImagePropertyGIFDictionary as String] as? [String: Any] else {
            return frameDuration
        }
        
        if let unclampedDuration = gifProperties[kCGImagePropertyGIFUnclampedDelayTime as String] as? TimeInterval {
            frameDuration = unclampedDuration
        } else if let clampedDuration = gifProperties[kCGImagePropertyGIFDelayTime as String] as? TimeInterval {
            frameDuration = clampedDuration
        }
        
        if frameDuration < 0.01 {
            frameDuration = 0.1
        }
        
        return frameDuration
    }
}
#else
struct AnimatedGIFNSView: NSViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeNSView(context: Context) -> NSImageView {
        let imageView = NSImageView()
        imageView.imageScaling = .scaleProportionallyUpOrDown
        imageView.animates = true
        loadGIF(into: imageView)
        return imageView
    }
    
    func updateNSView(_ nsView: NSImageView, context: Context) {}
    
    private func loadGIF(into imageView: NSImageView) {
        isLoading = true
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                DispatchQueue.main.async { isLoading = false }
                return
            }
            
            DispatchQueue.main.async {
                imageView.image = NSImage(data: data)
                isLoading = false
            }
        }.resume()
    }
}
#endif