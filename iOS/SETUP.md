# iOS App Setup Guide

## Quick Setup (Recommended)

### Option 1: Manual Xcode Setup

1. **Open Xcode** and create a new project:
   - File > New > Project
   - Choose: **iOS > App**
   - Product Name: `TopPlayer`
   - Team: (Select your development team)
   - Organization Identifier: `com.idleadventure`
   - Bundle Identifier: `com.idleadventure.topplayer`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - ❌ Uncheck "Use Core Data"
   - ✅ Check "Include Tests" (optional)

2. **Save location**: Choose the `iOS` directory

3. **Replace default files**:
   - Delete the default `ContentView.swift` and `TopPlayerApp.swift` (if they exist)
   - In Xcode, right-click on the `TopPlayer` folder in Project Navigator
   - Select "Add Files to TopPlayer..."
   - Navigate to and select all files from:
     - `TopPlayer/Models/` (all .swift files)
     - `TopPlayer/Views/` (all .swift files)
     - `TopPlayer/ViewModels/` (all .swift files)
     - `TopPlayer/Services/` (all .swift files)
   - Make sure "Copy items if needed" is **checked**
   - Click "Add"

4. **Configure Project Settings**:
   - Select the project in Navigator
   - Go to "Signing & Capabilities"
   - Click "+ Capability" and add:
     - **In-App Purchase**
   - Set your Development Team
   - Make sure "Automatically manage signing" is enabled

5. **Update Info.plist**:
   - Replace the default `Info.plist` with the one in the iOS directory
   - Or manually add the App Transport Security settings for the backend URL

6. **Add Entitlements**:
   - File > New > File
   - Choose "Property List"
   - Name it: `Entitlements.entitlements`
   - Add the In-App Purchase capability
   - Or copy the provided `Entitlements.entitlements` file

7. **Build and Run**:
   - Select a simulator or device
   - Press ⌘R to build and run

### Option 2: Using XcodeGen (Advanced)

If you have XcodeGen installed:

```bash
cd iOS
brew install xcodegen  # If not installed
xcodegen generate
open TopPlayer.xcodeproj
```

## Configuration

### Backend URL

The backend URL is already configured in `NetworkService.swift`:
```swift
self.baseURL = baseURL ?? "https://idle-adventure-backend.tolga-730.workers.dev"
```

### StoreKit Products

Before testing purchases, configure product IDs in App Store Connect:
- `com.idleadventure.gems_small`
- `com.idleadventure.gems_medium`
- `com.idleadventure.gems_large`
- `com.idleadventure.gems_epic`
- `com.idleadventure.coins_small`
- `com.idleadventure.coins_medium`
- `com.idleadventure.coins_large`
- `com.idleadventure.hero_pack_1`
- `com.idleadventure.hero_pack_2`
- `com.idleadventure.energy_refill`
- `com.idleadventure.boost_2x`
- `com.idleadventure.boost_5x`

## Project Structure

```
TopPlayer/
├── Models/
│   ├── User.swift
│   ├── Hero.swift
│   ├── Adventure.swift
│   └── Purchase.swift
├── ViewModels/
│   ├── GameViewModel.swift
│   └── AdventureViewModel.swift
├── Views/
│   ├── ContentView.swift
│   ├── LoginView.swift
│   ├── IdleView.swift
│   ├── AdventureView.swift
│   ├── ShopView.swift
│   └── SettingsView.swift
├── Services/
│   ├── NetworkService.swift
│   ├── GameStateService.swift
│   ├── PurchaseService.swift
│   └── AnalyticsService.swift
└── TopPlayerApp.swift
```

## Requirements

- iOS 15.0+
- Xcode 15.0+
- Swift 5.0+
- StoreKit 2 (for in-app purchases)

## Troubleshooting

### Build Errors

If you see "Cannot find type" errors:
- Make sure all files are added to the Xcode project target
- Check that all imports are correct
- Clean build folder: Product > Clean Build Folder (⇧⌘K)

### Network Errors

- Verify the backend URL is correct
- Check that the backend is deployed and accessible
- Ensure App Transport Security allows the domain

### StoreKit Errors

- Products must be configured in App Store Connect first
- Use sandbox accounts for testing
- Check that In-App Purchase capability is enabled

## Next Steps

1. Test registration and login
2. Test hero upgrades
3. Test adventure mode
4. Configure StoreKit products
5. Test in-app purchases


