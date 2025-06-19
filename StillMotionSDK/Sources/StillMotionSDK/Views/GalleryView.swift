import SwiftUI
#if canImport(UIKit)
import Photos
#else
import AppKit
#endif

struct VideoSelection: Identifiable {
    let id = UUID()
    let video: Video
    let index: Int
}

public struct GalleryView: View {
    @StateObject private var videoService = VideoService.shared
    @State private var selectedVideo: (video: Video, index: Int)?
    @State private var showingGenerator = false
    @State private var shareItem: ShareItem?
    
    private let columns = [
        GridItem(.flexible(), spacing: 0),
        GridItem(.flexible(), spacing: 0)
    ]
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                if videoService.videos.isEmpty && !videoService.isLoading {
                    emptyState
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 0) {
                            ForEach(Array(videoService.videos.enumerated()), id: \.element.id) { index, video in
                                GalleryItemView(video: video)
                                    .aspectRatio(1, contentMode: .fill)
                                    .clipped()
                                    .onTapGesture {
                                        selectedVideo = (video, index)
                                    }
                                    .contextMenu {
                                        if video.videoStatus == .completed {
                                            Button(action: {
                                                selectedVideo = (video, index)
                                            }) {
                                                Label("View Details", systemImage: "eye")
                                            }
                                            
                                            Button(action: {
                                                Task {
                                                    await downloadGIF(video)
                                                }
                                            }) {
                                                Label("Download", systemImage: "arrow.down.circle")
                                            }
                                            
                                            Button(action: {
                                                Task {
                                                    await shareGIF(video)
                                                }
                                            }) {
                                                Label("Share", systemImage: "square.and.arrow.up")
                                            }
                                            
                                            Divider()
                                            
                                            Button(role: .destructive, action: {
                                                Task {
                                                    try await videoService.deleteVideo(video.id)
                                                }
                                            }) {
                                                Label("Delete", systemImage: "trash")
                                            }
                                        }
                                    } preview: {
                                        if video.videoStatus == .completed, let gifUrl = video.gifUrl, let url = URL(string: gifUrl) {
                                            VStack(spacing: 12) {
                                                GalleryGIFPreview(url: url)
                                                    .aspectRatio(contentMode: .fit)
                                                    .frame(width: 300, height: 300)
                                                    .cornerRadius(12)
                                                
                                                Text(video.enhancedPrompt ?? video.prompt)
                                                    .font(.caption)
                                                    .multilineTextAlignment(.center)
                                                    .lineLimit(3)
                                                    .padding(.horizontal)
                                            }
                                            .padding()
                                            .background(backgroundColorCompat)
                                        }
                                    }
                            }
                        }
                    }
                    .refreshable {
                        await loadVideos()
                    }
                }
                
                if videoService.isLoading && videoService.videos.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                }
            }
            .navigationTitle("My GIFs")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingGenerator = true }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(item: Binding<VideoSelection?>(
                get: { selectedVideo.map { VideoSelection(video: $0.video, index: $0.index) } },
                set: { _ in selectedVideo = nil }
            )) { selection in
                DetailView(videos: videoService.videos, currentIndex: selection.index)
            }
            .sheet(isPresented: $showingGenerator) {
                GeneratorView()
            }
            .task {
                await loadVideos()
            }
            .sheet(item: $shareItem) { item in
                ShareSheet(items: [item.data])
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
    
    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            
            Text("No GIFs Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create your first animated GIF by tapping the + button")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Button(action: { showingGenerator = true }) {
                Label("Create GIF", systemImage: "plus.circle.fill")
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .cornerRadius(10)
            }
        }
    }
    
    private func loadVideos() async {
        do {
            try await videoService.fetchUserVideos()
        } catch {
            print("Failed to load videos: \(error)")
        }
    }
    
    private func downloadGIF(_ video: Video) async {
        guard let gifUrl = video.gifUrl else { return }
        
        do {
            let data = try await videoService.downloadGIF(from: gifUrl)
            await MainActor.run {
                saveToPhotos(data: data)
            }
        } catch {
            print("Failed to download GIF: \(error)")
        }
    }
    
    private func shareGIF(_ video: Video) async {
        guard let gifUrl = video.gifUrl else { return }
        
        do {
            let data = try await videoService.downloadGIF(from: gifUrl)
            await MainActor.run {
                shareItem = ShareItem(data: data)
            }
        } catch {
            print("Failed to share GIF: \(error)")
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
}

struct ShareItem: Identifiable {
    let id = UUID()
    let data: Data
}

struct GalleryItemView: View {
    let video: Video
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Always show static image in gallery
                AsyncImage(url: URL(string: video.imageUrl)) { phase in
                        switch phase {
                        case .empty:
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .overlay {
                                    ProgressView()
                                }
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: geometry.size.width, height: geometry.size.height)
                                .clipped()
                                .overlay {
                                    if video.videoStatus == .processing || video.videoStatus == .pending {
                                        ZStack {
                                            Color.black.opacity(0.5)
                                            VStack(spacing: 8) {
                                                ProgressView()
                                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                                Text("Processing")
                                                    .font(.caption)
                                                    .foregroundStyle(.white)
                                            }
                                        }
                                    }
                                }
                        case .failure(_):
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .overlay {
                                    Image(systemName: "exclamationmark.triangle")
                                        .foregroundStyle(.secondary)
                                }
                        @unknown default:
                            EmptyView()
                        }
                    }
                
                if video.videoStatus == .failed {
                    ZStack {
                        Color.black.opacity(0.7)
                        VStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle")
                                .font(.title)
                                .foregroundStyle(.red)
                            Text("Failed")
                                .font(.caption)
                                .foregroundStyle(.white)
                        }
                    }
                }
            }
        }
    }
}


// Reusable animated GIF preview view
struct GalleryGIFPreview: View {
    let url: URL
    @State private var isLoading = true
    
    var body: some View {
        #if canImport(UIKit)
        GalleryGIFUIViewWrapper(url: url, isLoading: $isLoading)
        #else
        GalleryGIFNSViewWrapper(url: url, isLoading: $isLoading)
        #endif
    }
}

#if canImport(UIKit)
struct GalleryGIFUIViewWrapper: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeUIView(context: Context) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
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
#else
struct GalleryGIFNSViewWrapper: NSViewRepresentable {
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