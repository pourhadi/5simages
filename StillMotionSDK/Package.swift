// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "StillMotionSDK",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "StillMotionSDK",
            targets: ["StillMotionSDK"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "StillMotionSDK"),
        .testTarget(
            name: "StillMotionSDKTests",
            dependencies: ["StillMotionSDK"]),
    ]
)