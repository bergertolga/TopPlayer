#!/bin/bash

# Script to create Xcode project for TopPlayer

PROJECT_NAME="TopPlayer"
PROJECT_DIR="$(pwd)"
BUNDLE_ID="com.idleadventure.topplayer"

# Create Xcode project using xcodebuild
# This is a simplified approach - we'll create it via Xcode CLI

echo "Creating Xcode project structure..."

# Check if project already exists
if [ -d "${PROJECT_NAME}.xcodeproj" ]; then
    echo "Project already exists. Skipping..."
    exit 0
fi

# Create the project structure
mkdir -p "${PROJECT_NAME}.xcodeproj/project.xcworkspace"
mkdir -p "${PROJECT_NAME}.xcodeproj/xcshareddata/xcschemes"

echo "Project structure created. Please open Xcode and create a new project manually,"
echo "or use the existing source files in the TopPlayer directory."
echo ""
echo "To create manually:"
echo "1. Open Xcode"
echo "2. File > New > Project"
echo "3. Choose iOS > App"
echo "4. Product Name: TopPlayer"
echo "5. Bundle Identifier: ${BUNDLE_ID}"
echo "6. Language: Swift"
echo "7. Interface: SwiftUI"
echo "8. Save to: ${PROJECT_DIR}"
echo "9. Replace the default files with the files from TopPlayer/ directory"


