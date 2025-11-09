import SwiftUI

struct SettingsView: View {
    let userId: String
    @State private var username: String?
    
    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    if let username = username ?? GameStateService.shared.currentUsername {
                        HStack {
                            Text("Username")
                            Spacer()
                            Text(username)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Button("Logout", role: .destructive) {
                        logout()
                    }
                }
                
                Section("Game") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    Link("Privacy Policy", destination: URL(string: "https://example.com/privacy")!)
                    Link("Terms of Service", destination: URL(string: "https://example.com/terms")!)
                }
                
                Section("About") {
                    Text("Idle Adventure")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Build your team and conquer the world!")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                username = GameStateService.shared.currentUsername
            }
        }
    }
    
    private func logout() {
        GameStateService.shared.clearProgress()
        AnalyticsService.shared.trackEvent("user_logout")
    }
}


