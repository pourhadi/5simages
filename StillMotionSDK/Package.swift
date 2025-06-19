// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "StillMotionSDK",
    platforms: [
        .iOS(.v16),
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "StillMotionSDK",
            targets: ["StillMotionSDK"]),
    ],
    dependencies: [
        .package(url: "https://github.com/scinfu/SwiftSoup.git", from: "2.6.0"),
    ],
    targets: [
        .target(
            name: "StillMotionSDK",
            dependencies: ["SwiftSoup"]),
        .testTarget(
            name: "StillMotionSDKTests",
            dependencies: ["StillMotionSDK"]),
    ]
)