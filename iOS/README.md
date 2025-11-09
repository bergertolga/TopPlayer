# Idle Adventure iOS App

SwiftUI iOS application for the idle adventure game.

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

## Setup

1. Open Xcode and create a new iOS App project
2. Replace the default files with the files in this directory
3. Ensure you have:
   - iOS 15.0+ deployment target
   - StoreKit 2 framework
   - SwiftUI support

## Configuration

1. Update `NetworkService.swift` with your Cloudflare Worker URL:
   ```swift
   private let baseURL: String = "https://your-worker.workers.dev"
   ```

2. Configure StoreKit product IDs in `PurchaseService.swift`

3. Update Info.plist with necessary permissions and App Store Connect configuration

## Features

- ✅ User authentication (register/login)
- ✅ Idle progression system
- ✅ Hero management and upgrades
- ✅ Adventure mode with battles
- ✅ In-app purchases (StoreKit 2)
- ✅ Offline earnings calculation
- ✅ Analytics tracking
- ✅ Local game state persistence

## Backend Integration

The app communicates with the Cloudflare Workers backend via REST API. All endpoints are defined in `NetworkService.swift`.


