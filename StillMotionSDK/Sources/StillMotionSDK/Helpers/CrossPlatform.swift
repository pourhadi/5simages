import SwiftUI

#if canImport(UIKit)
import UIKit
typealias PlatformColor = UIColor
#else
import AppKit
typealias PlatformColor = NSColor
#endif

extension Color {
    static var systemBackground: Color {
        #if canImport(UIKit)
        return Color(UIColor.systemBackground)
        #else
        return Color(NSColor.windowBackgroundColor)
        #endif
    }
    
    static var label: Color {
        #if canImport(UIKit)
        return Color(UIColor.label)
        #else
        return Color(NSColor.labelColor)
        #endif
    }
    
    static var secondaryLabel: Color {
        #if canImport(UIKit)
        return Color(UIColor.secondaryLabel)
        #else
        return Color(NSColor.secondaryLabelColor)
        #endif
    }
}

// Cross-platform image picker
#if canImport(UIKit)
import PhotosUI

public typealias PlatformImagePicker = PhotosPicker
public typealias PlatformImagePickerItem = PhotosPickerItem
#else
// For macOS, we'll need a different approach
public struct PlatformImagePicker<Label: View>: View {
    let label: Label
    @Binding var selectedItem: PlatformImagePickerItem?
    
    public init(selection: Binding<PlatformImagePickerItem?>, @ViewBuilder label: () -> Label) {
        self.label = label()
        self._selectedItem = selection
    }
    
    public var body: some View {
        Button(action: {
            // On macOS, we'll use NSOpenPanel
            let panel = NSOpenPanel()
            panel.allowedContentTypes = [.image]
            panel.allowsMultipleSelection = false
            panel.canChooseDirectories = false
            
            if panel.runModal() == .OK, let url = panel.url {
                selectedItem = PlatformImagePickerItem(url: url)
            }
        }) {
            label
        }
    }
}

public struct PlatformImagePickerItem: Equatable {
    let url: URL
    
    public func loadTransferable(type: Data.Type) async throws -> Data? {
        return try Data(contentsOf: url)
    }
}
#endif