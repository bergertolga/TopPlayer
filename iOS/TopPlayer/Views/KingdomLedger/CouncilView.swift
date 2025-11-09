import SwiftUI

struct CouncilView: View {
    let userId: String
    @State private var councilState: CouncilState?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showCreateCouncil = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if isLoading {
                        ProgressView()
                            .padding()
                    } else if let council = councilState?.council {
                        // Council Info
                        CouncilInfoCard(council: council)
                        
                        // Members
                        if !councilState!.members.isEmpty {
                            MembersSection(members: councilState!.members)
                        }
                        
                        // Public Works
                        if !councilState!.publicWorks.isEmpty {
                            PublicWorksSection(works: councilState!.publicWorks)
                        }
                    } else {
                        VStack(spacing: 16) {
                            Text("No Council")
                                .font(.headline)
                            Text("Create or join a council to participate in regional governance")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button("Create Council") {
                                showCreateCouncil = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                    }
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Council")
            .refreshable {
                await loadCouncil()
            }
            .task {
                await loadCouncil()
            }
            .sheet(isPresented: $showCreateCouncil) {
                CreateCouncilSheet(
                    userId: userId,
                    onCouncilCreated: {
                        showCreateCouncil = false
                        Task {
                            await loadCouncil()
                        }
                    }
                )
            }
        }
    }
    
    private func loadCouncil() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            councilState = try await NetworkService.shared.getCouncil(userId: userId)
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}

struct CouncilInfoCard: View {
    let council: Council
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("🏛️")
                    .font(.system(size: 40))
                VStack(alignment: .leading) {
                    Text(council.name)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Steward: \(council.steward_name ?? "Unknown")")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            
            HStack {
                Text("Tax Rate:")
                Spacer()
                Text("\(Int(council.tax_rate * 100))%")
                    .fontWeight(.semibold)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct MembersSection: View {
    let members: [CouncilMember]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Members (\(members.count))")
                .font(.headline)
            
            ForEach(members, id: \.user_id) { member in
                MemberRow(member: member)
            }
        }
    }
}

struct MemberRow: View {
    let member: CouncilMember
    
    var body: some View {
        HStack {
            Text("👤")
            Text(member.username ?? "Unknown")
            Spacer()
            Text(member.role.capitalized)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(roleColor(member.role))
                .foregroundColor(.white)
                .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
    
    private func roleColor(_ role: String) -> Color {
        switch role {
        case "steward": return .orange
        case "officer": return .blue
        default: return .gray
        }
    }
}

struct PublicWorksSection: View {
    let works: [PublicWork]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Public Works")
                .font(.headline)
            
            ForEach(works) { work in
                PublicWorkRow(work: work)
            }
        }
    }
}

struct PublicWorkRow: View {
    let work: PublicWork
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(work.name)
                .font(.headline)
            if let description = work.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            ProgressView(value: work.completion_percentage, total: 100)
            Text("\(Int(work.completion_percentage))% Complete")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

struct CreateCouncilSheet: View {
    let userId: String
    let onCouncilCreated: () -> Void
    
    @State private var councilName: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Council Name") {
                    TextField("Enter council name", text: $councilName)
                        .autocapitalization(.words)
                }
                
                Section {
                    Text("Council unlocks at city level 10. You will become the steward of the council.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                
                Section {
                    Button("Create Council") {
                        Task {
                            await createCouncil()
                        }
                    }
                    .disabled(councilName.count < 3 || councilName.count > 30 || isLoading)
                }
            }
            .navigationTitle("Create Council")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func createCouncil() async {
        guard councilName.count >= 3 && councilName.count <= 30 else {
            errorMessage = "Council name must be 3-30 characters"
            return
        }
        
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            _ = try await NetworkService.shared.createCouncil(userId: userId, name: councilName)
            onCouncilCreated()
        } catch {
            errorMessage = ErrorMessages.userFriendly(error)
        }
    }
}


