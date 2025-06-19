import Foundation

extension AuthManager {
    @MainActor
    func updateUserCredits(_ credits: Int) {
        guard currentUser != nil else { return }
        // Since currentUser is read-only, we need to fetch user again
        // This is a workaround - in a real app, we'd have a proper update method
        Task {
            await fetchCurrentUser()
        }
    }
}