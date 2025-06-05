import SwiftUI

public extension Color {
    // Primary brand colors
    static let brandPink = Color(hex: "FF497D")
    static let brandPurple = Color(hex: "A53FFF")
    static let brandBlue = Color(hex: "1E3AFF")
    static let brandTeal = Color(hex: "3EFFE2")
    
    // Background colors
    static let bgPrimary = Color(hex: "000000")
    static let bgSecondary = Color(hex: "0D0D0E")
    static let bgTertiary = Color(hex: "2A2A2D")
    
    // Text colors
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: "9CA3AF") // gray-400
    static let textTertiary = Color(hex: "6B7280") // gray-500
    
    // Border colors
    static let borderPrimary = Color(hex: "4B5563") // gray-600
    static let borderSecondary = Color(hex: "374151") // gray-700
    
    // Status colors
    static let success = Color(hex: "10B981")
    static let error = Color(hex: "EF4444")
    static let warning = Color(hex: "F59E0B")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}