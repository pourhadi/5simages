# StillMotion SDK for iOS

A SwiftUI SDK for integrating StillMotion.ai's image-to-GIF generation service into iOS applications.

## Features

- **Authentication**: Email/password and OAuth login support
- **GIF Gallery**: Edge-to-edge grid layout with smooth scrolling
- **GIF Generation**: Full-featured UI with image picker, prompt input, and generation options
- **GIF Details**: View, like, download, and share generated GIFs
- **Credit System**: Built-in credit tracking and display

## Requirements

- iOS 16.0+
- Swift 5.9+
- Xcode 15.0+

## Installation

### Swift Package Manager

Add the following to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/yourusername/StillMotionSDK.git", from: "1.0.0")
]
```

Or in Xcode:
1. File → Add Package Dependencies
2. Enter the repository URL
3. Click Add Package

## Usage

### Basic Integration

```swift
import SwiftUI
import StillMotionSDK

@main
struct YourApp: App {
    var body: some Scene {
        WindowGroup {
            StillMotionView()
        }
    }
}
```

### Custom Integration

Use individual components:

```swift
// Authentication
LoginView { 
    // Handle successful login
}

// Gallery
GalleryView()

// GIF Generation
GeneratorView()

// Detail View
DetailView(video: video)
```

### Configuration

Configure the SDK with custom settings:

```swift
StillMotionSDK.shared.configure(baseURL: "https://your-api.com")
```

### Programmatic API Access

```swift
// Authentication
try await AuthManager.shared.login(email: "user@example.com", password: "password")

// Generate GIF
let videos = try await VideoService.shared.generateVideo(
    imageData: imageData,
    prompt: "Make it dance",
    enhancePrompt: true,
    mode: .standard
)

// Fetch user videos
try await VideoService.shared.fetchUserVideos()
```

## Components

### StillMotionView
The main entry point that handles authentication state and displays the appropriate UI.

### LoginView
Handles user authentication with support for:
- Email/password login
- Registration
- Password reset

### GalleryView
Displays user's generated GIFs in an edge-to-edge grid layout:
- Pull to refresh
- Tap to view details
- Processing status indicators

### GeneratorView
Full-featured GIF generation interface:
- Image picker integration
- Prompt input with auto-enhancement option
- Quality mode selection (Standard/Premium)
- Multiple generation support
- Premium options (sample steps, guide scale)

### DetailView
Comprehensive GIF detail view:
- Full-size GIF display
- Like functionality
- Download to Photos
- Share via system share sheet
- Tweak and regenerate options
- Delete functionality

## Permissions

Add the following to your app's Info.plist:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to your photo library to save generated GIFs.</string>
```

## Error Handling

The SDK provides comprehensive error handling through the `APIError` enum:

```swift
do {
    try await AuthManager.shared.login(email: email, password: password)
} catch let error as APIError {
    switch error {
    case .unauthorized:
        // Handle unauthorized access
    case .serverError(let message):
        // Handle server errors
    default:
        // Handle other errors
    }
}
```

## License

This SDK is proprietary software. Usage requires a valid license from StillMotion.ai.