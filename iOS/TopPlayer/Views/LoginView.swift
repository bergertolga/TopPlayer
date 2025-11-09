import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var email = ""
    @State private var isRegistering = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSuccessAnimation = false
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.blue.opacity(0.1),
                    Color.purple.opacity(0.1)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 60)
                    
                    // Logo and title section
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.blue, Color.purple]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 120, height: 120)
                                .shadow(color: Color.blue.opacity(0.3), radius: 20, x: 0, y: 10)
                            
                            Text("🏰")
                                .font(.system(size: 60))
                        }
                        .scaleEffect(showSuccessAnimation ? 1.1 : 1.0)
                        .animation(.spring(response: 0.5, dampingFraction: 0.6), value: showSuccessAnimation)
                        
                        VStack(spacing: 8) {
                            Text("Kingdom Ledger")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            
                            Text("Build your empire, trade resources, and rule the realm")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 40)
                    
                    // Form card
                    VStack(spacing: 24) {
                        // Username field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Username")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            HStack {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                
                                TextField("Enter your username", text: $username)
                                    .textFieldStyle(.plain)
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                                    .submitLabel(.next)
                                    .onSubmit {
                                        if isRegistering && !email.isEmpty {
                                            Task { await register() }
                                        } else if !isRegistering {
                                            Task { await login() }
                                        }
                                    }
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(username.isEmpty ? Color.clear : Color.blue.opacity(0.3), lineWidth: 1)
                            )
                        }
                        
                        // Email field (only when registering)
                        if isRegistering {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email (Optional)")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20)
                                    
                                    TextField("your@email.com", text: $email)
                                        .textFieldStyle(.plain)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .autocorrectionDisabled()
                                        .submitLabel(.go)
                                        .onSubmit {
                                            Task { await register() }
                                        }
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                        
                        // Error message
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.subheadline)
                                    .foregroundColor(.red)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                        
                        // Action button
                        Button(action: {
                            // Dismiss keyboard
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                            
                            Task {
                                await isRegistering ? register() : login()
                            }
                        }) {
                            HStack(spacing: 12) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: isRegistering ? "person.badge.plus.fill" : "arrow.right.circle.fill")
                                        .font(.title3)
                                }
                                
                                Text(isRegistering ? "Create Account" : "Sign In")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .foregroundColor(.white)
                            .background(
                                Group {
                                    if username.isEmpty || isLoading {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.gray, Color.gray.opacity(0.8)]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    } else {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.blue, Color.purple]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    }
                                }
                            )
                            .cornerRadius(16)
                            .shadow(color: (username.isEmpty || isLoading) ? Color.clear : Color.blue.opacity(0.3), radius: 10, x: 0, y: 5)
                        }
                        .disabled(username.isEmpty || isLoading)
                        .animation(.easeInOut(duration: 0.2), value: username.isEmpty)
                        
                        // Toggle register/login
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                errorMessage = nil
                                isRegistering.toggle()
                            }
                        }) {
                            HStack(spacing: 4) {
                                Text(isRegistering ? "Already have an account?" : "New to Kingdom Ledger?")
                                    .foregroundColor(.secondary)
                                Text(isRegistering ? "Sign In" : "Create Account")
                                    .foregroundColor(.blue)
                                    .fontWeight(.semibold)
                            }
                            .font(.subheadline)
                        }
                        .disabled(isLoading)
                    }
                    .padding(24)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color(.systemBackground))
                            .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    )
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isRegistering)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: errorMessage)
    }
    
    private func login() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let (userId, username) = try await NetworkService.shared.login(username: username)
            
            // Success animation
            withAnimation {
                showSuccessAnimation = true
            }
            
            // Small delay for animation
            try? await Task.sleep(nanoseconds: 300_000_000)
            
            // Save user state
            GameStateService.shared.currentUserId = userId
            GameStateService.shared.currentUsername = username
            
            AnalyticsService.shared.setUserId(userId)
            AnalyticsService.shared.trackEvent("user_login")
            
            // Trigger UI update
            NotificationCenter.default.post(name: NSNotification.Name("UserDidLogin"), object: nil)
        } catch {
            withAnimation {
                errorMessage = ErrorMessages.userFriendly(error)
            }
        }
    }
    
    private func register() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let (userId, username) = try await NetworkService.shared.register(
                username: username,
                email: email.isEmpty ? nil : email
            )
            
            // Success animation
            withAnimation {
                showSuccessAnimation = true
            }
            
            // Small delay for animation
            try? await Task.sleep(nanoseconds: 300_000_000)
            
            // Save user state
            GameStateService.shared.currentUserId = userId
            GameStateService.shared.currentUsername = username
            
            AnalyticsService.shared.setUserId(userId)
            AnalyticsService.shared.trackEvent("user_register")
            
            // Trigger UI update
            NotificationCenter.default.post(name: NSNotification.Name("UserDidLogin"), object: nil)
        } catch {
            withAnimation {
                errorMessage = ErrorMessages.userFriendly(error)
            }
        }
    }
}

