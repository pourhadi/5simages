import SwiftUI
#if canImport(UIKit)
import UIKit
import ImageIO

class AnimatedGIFImageView: UIImageView {
    private var displayLink: CADisplayLink?
    private var animationFrames: [UIImage] = []
    private var frameDurations: [TimeInterval] = []
    private var currentFrameIndex = 0
    private var timeSinceLastFrame: TimeInterval = 0
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        contentMode = .scaleAspectFit
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        contentMode = .scaleAspectFit
    }
    
    func loadGIF(from url: URL) {
        // Clear any existing animation
        stopAnimating()
        animationFrames.removeAll()
        frameDurations.removeAll()
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self,
                  let data = data,
                  error == nil else {
                print("Failed to load GIF from URL: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            DispatchQueue.main.async {
                self.setGIFData(data)
            }
        }.resume()
    }
    
    private func setGIFData(_ data: Data) {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            print("Failed to create image source from GIF data")
            return
        }
        
        let frameCount = CGImageSourceGetCount(source)
        print("GIF has \(frameCount) frames")
        
        // If it's a single frame, just show it as a static image
        if frameCount == 1 {
            if let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) {
                self.image = UIImage(cgImage: cgImage)
            }
            return
        }
        
        // Load all frames
        for i in 0..<frameCount {
            guard let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) else { continue }
            
            let frameDuration = self.frameDuration(at: i, source: source)
            
            animationFrames.append(UIImage(cgImage: cgImage))
            frameDurations.append(frameDuration)
        }
        
        print("Loaded \(animationFrames.count) frames")
        
        if !animationFrames.isEmpty {
            // Start with the first frame
            self.image = animationFrames[0]
            
            // Start custom animation using display link
            startCustomAnimation()
        }
    }
    
    private func frameDuration(at index: Int, source: CGImageSource) -> TimeInterval {
        let defaultDuration: TimeInterval = 0.1
        
        guard let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [String: Any],
              let gifDict = properties[kCGImagePropertyGIFDictionary as String] as? [String: Any] else {
            return defaultDuration
        }
        
        // Try to get the delay time from the GIF properties
        var duration: TimeInterval = defaultDuration
        
        if let unclampedDelayTime = gifDict[kCGImagePropertyGIFUnclampedDelayTime as String] as? TimeInterval {
            duration = unclampedDelayTime
        } else if let delayTime = gifDict[kCGImagePropertyGIFDelayTime as String] as? TimeInterval {
            duration = delayTime
        }
        
        // Many GIFs have frame durations of 0 which would cause issues
        if duration < 0.01 {
            duration = defaultDuration
        }
        
        return duration
    }
    
    private func startCustomAnimation() {
        stopCustomAnimation()
        
        currentFrameIndex = 0
        timeSinceLastFrame = 0
        
        displayLink = CADisplayLink(target: self, selector: #selector(displayLinkFired))
        displayLink?.add(to: .main, forMode: .common)
        
        print("Started custom GIF animation")
    }
    
    private func stopCustomAnimation() {
        displayLink?.invalidate()
        displayLink = nil
    }
    
    @objc private func displayLinkFired(_ displayLink: CADisplayLink) {
        guard !animationFrames.isEmpty, !frameDurations.isEmpty else { return }
        
        timeSinceLastFrame += displayLink.duration
        
        let currentFrameDuration = frameDurations[currentFrameIndex]
        
        if timeSinceLastFrame >= currentFrameDuration {
            // Move to next frame
            currentFrameIndex = (currentFrameIndex + 1) % animationFrames.count
            self.image = animationFrames[currentFrameIndex]
            timeSinceLastFrame = 0
        }
    }
    
    deinit {
        stopCustomAnimation()
    }
}

struct AnimatedGIFView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeUIView(context: Context) -> AnimatedGIFImageView {
        let imageView = AnimatedGIFImageView()
        return imageView
    }
    
    func updateUIView(_ uiView: AnimatedGIFImageView, context: Context) {
        // Only load if the URL has changed or we haven't loaded yet
        if uiView.animationFrames.isEmpty {
            isLoading = true
            uiView.loadGIF(from: url)
            
            // Set loading to false after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                isLoading = false
            }
        }
    }
}

// Wrapper view for SwiftUI
public struct AnimatedGIF: View {
    let url: URL
    @State private var isLoading = true
    
    public var body: some View {
        ZStack {
            AnimatedGIFView(url: url, isLoading: $isLoading)
            
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
            }
        }
    }
}

#else

import AppKit

// macOS implementation using NSImageView
class AnimatedGIFImageView: NSImageView {
    private var gifData: Data?
    
    func loadGIF(from url: URL) {
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self,
                  let data = data,
                  error == nil else {
                print("Failed to load GIF from URL: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            DispatchQueue.main.async {
                self.setGIFData(data)
            }
        }.resume()
    }
    
    private func setGIFData(_ data: Data) {
        self.gifData = data
        self.animates = true
        self.imageScaling = .scaleProportionallyUpOrDown
        self.image = NSImage(data: data)
        
        // For animated GIFs, NSImageView handles animation automatically
        if self.image != nil {
            self.canDrawConcurrently = true
        }
    }
}

struct AnimatedGIFView: NSViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeNSView(context: Context) -> AnimatedGIFImageView {
        let imageView = AnimatedGIFImageView()
        return imageView
    }
    
    func updateNSView(_ nsView: AnimatedGIFImageView, context: Context) {
        isLoading = true
        nsView.loadGIF(from: url)
        
        // Set loading to false after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            isLoading = false
        }
    }
}

// Wrapper view for SwiftUI
public struct AnimatedGIF: View {
    let url: URL
    @State private var isLoading = true
    
    public var body: some View {
        ZStack {
            AnimatedGIFView(url: url, isLoading: $isLoading)
            
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
            }
        }
    }
}

#endif