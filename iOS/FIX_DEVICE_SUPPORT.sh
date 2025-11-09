#!/bin/bash
# Script to help fix device support issues

echo "🔍 Checking device and Xcode compatibility..."

# Check Xcode version
echo ""
echo "Xcode Version:"
xcrun xcodebuild -version

# Check connected devices
echo ""
echo "Connected Devices:"
xcrun devicectl list devices 2>&1 | grep -A 3 "connected"

# Check device support files
echo ""
echo "Installed Device Support:"
ls -la ~/Library/Developer/Xcode/iOS\ DeviceSupport/ 2>&1 | tail -10

echo ""
echo "📱 Your device: iPhone 17 Pro Max (iOS 18.x)"
echo "💻 Your Xcode: 15.4"
echo ""
echo "⚠️  Issue: Xcode 15.4 may not fully support iOS 18.x"
echo ""
echo "✅ Solutions:"
echo "1. Open Xcode → Select your device → Click 'Download' when prompted"
echo "2. Or update Xcode to 16.x for full iOS 18 support"
echo "3. Or use Simulator for now (iOS 17.5 available)"
echo ""
echo "🚀 Quick fix: Use Simulator"
echo "   xcodebuild -project TopPlayer.xcodeproj -scheme TopPlayer -destination 'platform=iOS Simulator,name=iPhone 15' build"


