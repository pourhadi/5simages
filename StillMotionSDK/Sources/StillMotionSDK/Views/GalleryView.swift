import SwiftUI

struct VideoSelection: Identifiable {
    let id = UUID()
    let video: Video
    let index: Int
}

public struct GalleryView: View {
    @StateObject private var videoService = VideoService.shared
    @State private var selectedVideo: (video: Video, index: Int)?
    @State private var showingGenerator = false
    @State private var previewVideo: Video?
    
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
                                    .onLongPressGesture(minimumDuration: 0.3) {
                                        if video.videoStatus == .completed {
                                            previewVideo = video
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
            .overlay {
                if let video = previewVideo {
                    GIFPreviewOverlay(video: video) {
                        previewVideo = nil
                    }
                }
            }
        }
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

struct GIFPreviewOverlay: View {
    let video: Video
    let onDismiss: () -> Void
    @State private var scale: CGFloat = 0.8
    @State private var opacity: Double = 0
    
    var body: some View {
        ZStack {
            // Dark background
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            // Animated GIF
            if let gifUrl = video.gifUrl, let url = URL(string: gifUrl) {
                VStack(spacing: 20) {
                    GalleryGIFPreview(url: url)
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: getScreenWidth() * 0.9)
                        .frame(maxHeight: getScreenHeight() * 0.7)
                        .cornerRadius(12)
                        .shadow(radius: 20)
                        .scaleEffect(scale)
                        .opacity(opacity)
                    
                    // Prompt text
                    Text(video.enhancedPrompt ?? video.prompt)
                        .font(.caption)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                        .opacity(opacity)
                }
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                scale = 1.0
                opacity = 1.0
            }
        }
    }
    
    private func getScreenWidth() -> CGFloat {
        #if canImport(UIKit)
        return UIScreen.main.bounds.width
        #else
        return NSScreen.main?.frame.width ?? 800
        #endif
    }
    
    private func getScreenHeight() -> CGFloat {
        #if canImport(UIKit)
        return UIScreen.main.bounds.height
        #else
        return NSScreen.main?.frame.height ?? 600
        #endif
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