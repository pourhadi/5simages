import SwiftUI
import UIKit

struct GIFImage: UIViewRepresentable {
    let data: Data
    
    func makeUIView(context: Context) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = false
        
        if let source = CGImageSourceCreateWithData(data as CFData, nil) {
            var images: [UIImage] = []
            var totalDuration: Double = 0
            
            let count = CGImageSourceGetCount(source)
            
            for i in 0..<count {
                if let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) {
                    let image = UIImage(cgImage: cgImage)
                    images.append(image)
                    
                    // Get frame duration
                    let properties = CGImageSourceCopyPropertiesAtIndex(source, i, nil) as? [String: Any]
                    let gifProperties = properties?[kCGImagePropertyGIFDictionary as String] as? [String: Any]
                    let frameDuration = gifProperties?[kCGImagePropertyGIFDelayTime as String] as? Double ?? 0.1
                    totalDuration += frameDuration
                }
            }
            
            imageView.animationImages = images
            imageView.animationDuration = totalDuration
            imageView.animationRepeatCount = 0
            imageView.startAnimating()
        }
        
        return imageView
    }
    
    func updateUIView(_ uiView: UIImageView, context: Context) {
        // No update needed
    }
}

// MARK: - GIF Frame Extractor
class GIFFrameExtractor {
    static func extractFrames(from data: Data) -> [(image: UIImage, duration: Double)] {
        var frames: [(image: UIImage, duration: Double)] = []
        
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            return frames
        }
        
        let count = CGImageSourceGetCount(source)
        
        for i in 0..<count {
            if let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) {
                let image = UIImage(cgImage: cgImage)
                
                // Get frame duration
                let properties = CGImageSourceCopyPropertiesAtIndex(source, i, nil) as? [String: Any]
                let gifProperties = properties?[kCGImagePropertyGIFDictionary as String] as? [String: Any]
                let frameDuration = gifProperties?[kCGImagePropertyGIFDelayTime as String] as? Double ?? 0.1
                
                frames.append((image: image, duration: frameDuration))
            }
        }
        
        return frames
    }
}