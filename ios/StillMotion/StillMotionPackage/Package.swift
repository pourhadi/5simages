// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "StillMotionPackage",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "StillMotionFeature",
            targets: ["StillMotionFeature"]
        ),
    ],
    targets: [
        .target(
            name: "StillMotionFeature"
        ),
    ]
)