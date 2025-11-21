# Finding GUI Pro Bundle Assets

Since the assets say they're imported but we can't find them, here are steps to locate them:

## Method 1: Check Package Manager
1. Open Unity Editor
2. Go to `Window > Package Manager`
3. Click the dropdown at top-left (says "Unity Registry" or "In Project")
4. Select **"My Assets"**
5. Look for Layer Lab GUI packages - they should show as available to download

## Method 2: Use the Find Script
1. In Unity Editor, go to `Tools > Find GUI Pro Bundle Assets`
2. Check the Console for a list of found assets
3. This will search both Assets and Packages folders

## Method 3: Manual Search
The assets might be in:
- `Packages/[PackageName]/` - if installed as a package
- `Assets/[PackageName]/` - if imported as assets
- `Library/PackageCache/` - cached package files

## Method 4: Check Asset Store
1. Open Asset Store window: `Window > Asset Store`
2. Sign in with your Unity account
3. Go to "My Assets"
4. Look for Layer Lab GUI Pro Bundle items
5. Click "Download" or "Import" on each one

## Common Layer Lab GUI Package Names:
- GUI Pro - Buttons
- GUI Pro - Panels  
- GUI Pro - Input Fields
- GUI Pro - Dropdowns
- GUI Pro - Scroll Views
- GUI Pro - Icons

## If Still Not Found:
The bundle grants access but you need to download each asset individually. They won't appear until you download them through Package Manager or Asset Store.

