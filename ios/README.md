# StillMotion iOS App

Native iOS app for StillMotion.ai - Transform your images into captivating GIFs using AI.

## Features

- **Authentication**: Login/Signup with email and password
- **GIF Generation**: Upload images and generate GIFs with customizable prompts
- **Gallery**: View and manage your generated GIFs
- **GIF Detail View**: View, download, delete, and regenerate GIFs
- **Frame Selection**: Extract individual frames from GIFs
- **Credit System**: Purchase credits for GIF generation
- **Real-time Status**: Live updates on generation progress

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Installation

1. Open the project:
   ```bash
   open /Users/dan/projects/i2v/ios/StillMotion/StillMotion.xcworkspace
   ```

2. Build and run on simulator:
   ```bash
   # Using Claude Code's Xcode tools
   build_run_ios_sim_name_ws --workspace-path "/Users/dan/projects/i2v/ios/StillMotion/StillMotion.xcworkspace" --scheme "StillMotion" --simulator-name "iPhone 16"
   ```

## Architecture

The app is built using:
- **SwiftUI** for the user interface
- **Async/Await** for networking
- **Keychain** for secure token storage
- **Safari Services** for web-based credit purchases
- **Photos Framework** for image/GIF saving

### Project Structure

```
StillMotion/
├── StillMotion/              # Main app target
│   └── StillMotionApp.swift  # App entry point
├── Features/                 # Feature package
│   └── Sources/Features/
│       ├── Models/           # Data models
│       ├── Networking/       # API client
│       ├── Services/         # Business logic
│       ├── Theme/           # Colors and styling
│       └── Views/           # SwiftUI views
│           ├── Auth/        # Login/Signup
│           ├── Generation/  # GIF creation
│           ├── Gallery/     # GIF viewing
│           ├── Credits/     # Credit purchase
│           └── Components/  # Reusable UI
```

## API Integration

The app connects to the same backend API as the web application:

- **Base URL**: `https://stillmotion.ai/api` (production) or `http://localhost:3000/api` (development)
- **Authentication**: JWT tokens stored securely in Keychain
- **Endpoints**: Same REST API endpoints as web app

### Key Endpoints Used

- `POST /login` - User authentication
- `POST /register` - User registration
- `POST /upload` - Image upload
- `POST /generate-video` - GIF generation
- `GET /videos` - User's GIF gallery
- `DELETE /videos/:id` - Delete GIF
- `POST /checkout` - Credit purchase

## Color Scheme

Matches the web application's design:

- **Brand Pink**: `#FF497D`
- **Brand Purple**: `#A53FFF`
- **Brand Blue**: `#1E3AFF`
- **Brand Teal**: `#3EFFE2`
- **Background**: `#000000`, `#0D0D0E`, `#2A2A2D`
- **Text**: White, grays for secondary text

## Features Breakdown

### Authentication
- Email/password login and registration
- Secure token storage in Keychain
- Auto-login on app launch
- Logout functionality

### GIF Generation
- Image selection from camera or photo library
- Text prompt input with auto-enhancement option
- Generation mode selection (Fast/Slow)
- Multiple generation support (1-10 GIFs)
- Advanced settings for Fast mode (sample steps, guide scale)
- Real-time credit cost calculation

### Gallery
- Grid view of user's GIFs
- Pull-to-refresh
- Processing status indicators
- Tap to view details

### GIF Detail View
- Full-screen GIF viewing
- Source image display
- Prompt information
- Action buttons:
  - **Tweak**: Regenerate with modified prompt
  - **Select Frame**: Extract individual frames
  - **Download**: Save to Photos
  - **Delete**: Remove GIF

### Credits
- Current balance display
- Credit package selection
- Web-based Stripe checkout
- Purchase history (future enhancement)

## Development Notes

- Uses iOS 17+ features like the new `TextField` axis parameter
- Implements proper async/await patterns throughout
- Follows MVVM architecture with ObservableObject
- Uses SwiftUI's new navigation APIs (NavigationStack)
- Implements proper error handling and loading states

## Testing

The app can be tested on:
- iOS Simulator (recommended: iPhone 16)
- Physical iOS devices (requires developer account)

Use the development API endpoint (`http://localhost:3000/api`) when running the local web server for testing.