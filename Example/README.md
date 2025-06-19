# StillMotion SDK Example

This example demonstrates how to integrate the StillMotion SDK into your iOS app.

## Setup

1. Add the StillMotion SDK package to your project
2. Configure the SDK in your app's initialization (optional)
3. Use the `StillMotionView` component to display the full UI

## Features Demonstrated

- User authentication (login/register)
- GIF gallery with edge-to-edge layout
- GIF generation with all options
- GIF detail view with sharing and download
- Like functionality

## Usage

```swift
import StillMotionSDK

// In your app
StillMotionView()

// Or use individual components
LoginView()
GalleryView()
GeneratorView()
```

## Customization

You can configure the SDK with a custom base URL:

```swift
StillMotionSDK.shared.configure(baseURL: "https://your-api.com")
```