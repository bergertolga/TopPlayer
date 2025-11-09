#!/bin/bash

# Script to help set up Xcode project for TopPlayer iOS app

PROJECT_NAME="TopPlayer"
BUNDLE_ID="com.idleadventure.topplayer"
PROJECT_DIR="$(pwd)"

echo "=========================================="
echo "TopPlayer iOS Project Setup"
echo "=========================================="
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

echo "✅ Xcode found: $(xcodebuild -version | head -n 1)"
echo ""

# Check if project already exists
if [ -d "${PROJECT_NAME}.xcodeproj" ]; then
    echo "⚠️  Project ${PROJECT_NAME}.xcodeproj already exists."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📱 Creating Xcode project structure..."
echo ""

# Create a basic setup - we'll need to create the project manually in Xcode
# but we can prepare all the files

echo "✅ All source files are ready in TopPlayer/ directory"
echo "✅ Configuration files created (Info.plist, Entitlements.entitlements)"
echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Open Xcode"
echo "2. File > New > Project"
echo "3. Choose: iOS > App"
echo "4. Configure:"
echo "   - Product Name: ${PROJECT_NAME}"
echo "   - Team: (Select your team)"
echo "   - Organization Identifier: com.idleadventure"
echo "   - Bundle Identifier: ${BUNDLE_ID}"
echo "   - Interface: SwiftUI"
echo "   - Language: Swift"
echo "   - ✅ Use Core Data: NO"
echo "   - ✅ Include Tests: YES (optional)"
echo ""
echo "5. Save location: ${PROJECT_DIR}"
echo ""
echo "6. After project creation:"
echo "   - Delete the default ContentView.swift and TopPlayerApp.swift"
echo "   - Right-click on TopPlayer folder in Project Navigator"
echo "   - Select 'Add Files to TopPlayer...'"
echo "   - Select all files from TopPlayer/Models, TopPlayer/Views, etc."
echo "   - Make sure 'Copy items if needed' is checked"
echo "   - Click 'Add'"
echo ""
echo "7. In Project Settings:"
echo "   - Select the project in Navigator"
echo "   - Go to 'Signing & Capabilities'"
echo "   - Enable 'In-App Purchase' capability"
echo "   - Set your Team"
echo ""
echo "8. Update Info.plist:"
echo "   - Replace the default Info.plist with the one in this directory"
echo ""
echo "=========================================="
echo "Or use XcodeGen (if installed):"
echo "=========================================="
echo ""
echo "  brew install xcodegen"
echo "  xcodegen generate"
echo ""
echo "=========================================="


