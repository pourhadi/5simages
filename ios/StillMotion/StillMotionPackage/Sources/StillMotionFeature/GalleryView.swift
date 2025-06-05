import SwiftUI

public struct GalleryView: View {
    @State private var videos: [Video] = []
    @State private var isLoading = true
    @State private var selectedVideo: Video?
    @State private var showingError = false
    @State private var errorMessage = ""
    
    private let apiClient = APIClient.shared
    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 100)
                } else if videos.isEmpty {
                    emptyState
                } else {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(videos) { video in
                            GalleryItem(video: video) {
                                selectedVideo = video
                            }
                        }
                    }
                    .padding()
                }
            }
            .background(Color.bgPrimary)
            .navigationTitle("My GIFs")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await loadVideos()
            }
            .task {
                await loadVideos()
            }
            .sheet(item: $selectedVideo) { video in
                GIFDetailView(video: video) {
                    await loadVideos()
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 24) {
            Image(systemName: "photo.stack")
                .font(.system(size: 60))
                .foregroundColor(.textSecondary)
            
            VStack(spacing: 8) {
                Text("No GIFs yet")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
                
                Text("Create your first GIF to see it here")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
    
    private func loadVideos() async {
        isLoading = true
        
        do {
            videos = try await apiClient.request(
                "/videos",
                responseType: [Video].self
            )
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
        
        isLoading = false
    }
}

struct GalleryItem: View {
    let video: Video
    let action: () -> Void
    @State private var sourceImage: UIImage?
    @State private var isLoadingImage = true
    
    var body: some View {
        Button(action: action) {
            ZStack {
                if let sourceImage = sourceImage {
                    Image(uiImage: sourceImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 200)
                        .clipped()
                } else {
                    Rectangle()
                        .fill(Color.bgSecondary)
                        .frame(height: 200)
                        .overlay(
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .textSecondary))
                        )
                }
                
                // Status overlay
                if video.status == .processing {
                    VStack {
                        Spacer()
                        HStack {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                            Text("Processing")
                                .font(.caption)
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(8)
                        .padding(8)
                    }
                } else if video.status == .failed {
                    VStack {
                        Spacer()
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.error)
                            Text("Failed")
                                .font(.caption)
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(8)
                        .padding(8)
                    }
                }
            }
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.borderPrimary, lineWidth: 1)
            )
        }
        .task {
            await loadSourceImage()
        }
    }
    
    private func loadSourceImage() async {
        guard let imageUrl = URL(string: video.imageUrl) else {
            isLoadingImage = false
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: imageUrl)
            if let image = UIImage(data: data) {
                await MainActor.run {
                    sourceImage = image
                }
            }
        } catch {
            print("Failed to load source image: \(error)")
        }
        
        await MainActor.run {
            isLoadingImage = false
        }
    }
}