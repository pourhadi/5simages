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
                    if video.videoStatus == .completed, let gifUrl = video.gifUrl, let url = URL(string: gifUrl) {
                        AnimatedGIFContainer(url: url)
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 400)
                            .padding(.horizontal)
                    } else {
                        statusView
                            .frame(maxHeight: 400)
                            .padding(.horizontal)
                    }
                    
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