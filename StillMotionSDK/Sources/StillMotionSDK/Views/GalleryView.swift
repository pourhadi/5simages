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