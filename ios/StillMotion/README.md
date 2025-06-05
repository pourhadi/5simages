# StillMotion - iOS App

A modern iOS application using a **workspace + SPM package** architecture for clean separation between app shell and feature code.

## Project Architecture

```
StillMotion/
├── StillMotion.xcworkspace/              # Open this file in Xcode
├── StillMotion.xcodeproj/                # App shell project
├── StillMotion/                          # App target (minimal)
│   ├── Assets.xcassets/                # App-level assets (icons, colors)
│   ├── StillMotionApp.swift              # App entry point
│   └── StillMotion.xctestplan            # Test configuration
├── StillMotionPackage/                   # 🚀 Primary development area
│   ├── Package.swift                   # Package configuration
│   ├── Sources/StillMotionFeature/       # Your feature code
│   └── Tests/StillMotionFeatureTests/    # Unit tests
└── StillMotionUITests/                   # UI automation tests
```

## Key Architecture Points

### Workspace + SPM Structure
- **App Shell**: `StillMotion/` contains minimal app lifecycle code
- **Feature Code**: `StillMotionPackage/Sources/StillMotionFeature/` is where most development happens
- **Separation**: Business logic lives in the SPM package, app target just imports and displays it

### Buildable Folders (Xcode 16)
- Files added to the filesystem automatically appear in Xcode
- No need to manually add files to project targets
- Reduces project file conflicts in teams

## Development Notes

### Code Organization
Most development happens in `StillMotionPackage/Sources/StillMotionFeature/` - organize your code as you prefer.

### Public API Requirements
Types exposed to the app target need `public` access:
```swift
public struct NewView: View {
    public init() {}
    
    public var body: some View {
        // Your view code
    }
}
```

### Adding Dependencies
Edit `StillMotionPackage/Package.swift` to add SPM dependencies:
```swift
dependencies: [
    .package(url: "https://github.com/example/SomePackage", from: "1.0.0")
],
targets: [
    .target(
        name: "StillMotionFeature",
        dependencies: ["SomePackage"]
    ),
]
```

### Test Structure
- **Unit Tests**: `StillMotionPackage/Tests/StillMotionFeatureTests/` (Swift Testing framework)
- **UI Tests**: `StillMotionUITests/` (XCUITest framework)
- **Test Plan**: `StillMotion.xctestplan` coordinates all tests

## Configuration

### XCConfig Build Settings
Build settings are managed through **XCConfig files** in `Config/`:
- `Config/Shared.xcconfig` - Common settings (bundle ID, versions, deployment target)
- `Config/Debug.xcconfig` - Debug-specific settings  
- `Config/Release.xcconfig` - Release-specific settings
- `Config/Tests.xcconfig` - Test-specific settings

### Asset Management
- **App-Level Assets**: `StillMotion/Assets.xcassets/` (app icon, accent color)
- **Feature Assets**: Add `Resources/` folder to SPM package if needed

### SPM Package Resources
To include assets in your feature package:
```swift
.target(
    name: "StillMotionFeature",
    dependencies: [],
    resources: [.process("Resources")]
)
```

## Notes

### Generated with XcodeBuildMCP
This project was scaffolded using [XcodeBuildMCP](https://github.com/cameroncooke/XcodeBuildMCP), which provides tools for AI-assisted iOS development workflows.