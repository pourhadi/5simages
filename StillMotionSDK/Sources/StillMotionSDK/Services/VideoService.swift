import Foundation
#if canImport(UIKit)
import UIKit
#endif

@MainActor
public class VideoService: ObservableObject {
    static let shared = VideoService()
    
    private let apiClient = APIClient()
    
    @Published public private(set) var videos: [Video] = []
    @Published public private(set) var isLoading = false
    
    private init() {}
    
    public func fetchUserVideos(limit: Int = 50, offset: Int = 0) async throws {
        isLoading = true
        defer { isLoading = false }
        
        struct Response: Codable {
            let videos: [Video]
            let total: Int
        }
        
        let response: Response = try await apiClient.request("/api/user/videos?limit=\(limit)&offset=\(offset)")
        self.videos = response.videos
    }
    
    public func generateVideo(imageData: Data, 
                            prompt: String,
                            enhancePrompt: Bool = true,
                            mode: GenerationMode = .standard,
                            sampleSteps: Int? = nil,
                            sampleGuideScale: Double? = nil,
                            numberOfGenerations: Int = 1) async throws -> [Video] {
        let fileName = "\(UUID().uuidString).jpg"
        let imageUrl = try await apiClient.uploadImage(imageData, fileName: fileName)
        
        let request = GenerateVideoRequest(
            imageUrl: imageUrl,
            prompt: prompt,
            enhancePrompt: enhancePrompt,
            mode: mode.rawValue,
            sampleSteps: sampleSteps,
            sampleGuideScale: sampleGuideScale,
            numberOfGenerations: numberOfGenerations
        )
        
        struct GenerateResponse: Codable {
            let videos: [Video]
            let remainingCredits: Int
        }
        
        let response: GenerateResponse = try await apiClient.request("/api/generate-video", method: .post, body: request)
        
        videos.insert(contentsOf: response.videos, at: 0)
        
        AuthManager.shared.updateUserCredits(response.remainingCredits)
        
        return response.videos
    }
    
    public func checkVideoStatus(_ videoId: String) async throws -> Video {
        let video: Video = try await apiClient.request("/api/check-status/\(videoId)")
        
        if let index = videos.firstIndex(where: { $0.id == videoId }) {
            videos[index] = video
        }
        
        return video
    }
    
    public func deleteVideo(_ videoId: String) async throws {
        let _: [String: String] = try await apiClient.request("/api/videos/\(videoId)", method: .delete)
        videos.removeAll { $0.id == videoId }
    }
    
    public func toggleLike(_ videoId: String) async throws {
        struct LikeResponse: Codable {
            let isLiked: Bool
        }
        
        let response: LikeResponse = try await apiClient.request("/api/videos/\(videoId)/like", method: .post)
        
        if let index = videos.firstIndex(where: { $0.id == videoId }) {
            videos[index].isLiked = response.isLiked
        }
    }
    
    public func downloadGIF(from urlString: String) async throws -> Data {
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}