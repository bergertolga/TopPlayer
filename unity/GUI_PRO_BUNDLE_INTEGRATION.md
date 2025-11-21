# GUI Pro Bundle Integration Guide

## Overview
The GUI Pro Bundle grants you access to download individual Layer Lab GUI assets through Unity's Package Manager. This guide will help you download and integrate these assets into the KingdomLedger game.

## Step 1: Download Assets from Package Manager

1. **Open Unity Editor** and open the KingdomLedger project
2. **Open Package Manager**: `Window > Package Manager`
3. **Switch to "My Assets"** tab (top left dropdown)
4. **Look for Layer Lab GUI assets** - they should show as "Free" or "Download" since you own the bundle
5. **Download the following recommended assets**:
   - GUI Pro - Buttons
   - GUI Pro - Panels
   - GUI Pro - Input Fields
   - GUI Pro - Dropdowns
   - GUI Pro - Scroll Views
   - GUI Pro - Icons/Sprites (if available)

## Step 2: Locate Downloaded Assets

After downloading, the assets will typically be located in:
- `Assets/[PackageName]/` or
- `Packages/[PackageName]/` (if installed as a package)

Look for folders containing:
- Prefabs (buttons, panels, etc.)
- Sprites/Textures
- Materials
- Fonts

## Step 3: Integration Points

Our UI scripts are designed to work with both:
1. **Programmatically created UI** (current implementation)
2. **GUI Pro Bundle prefabs** (once downloaded)

### Files Ready for Integration:

1. **MilestoneUI.cs** (`Assets/Scripts/UI/MilestoneUI.cs`)
   - Can use GUI Pro button prefabs
   - Can use GUI Pro panel prefabs
   - Can use GUI Pro scroll view prefabs

2. **CityUI.cs** (`Assets/Scripts/UI/CityUI.cs`)
   - Can use GUI Pro button prefabs
   - Can use GUI Pro panel prefabs
   - Can use GUI Pro input field prefabs

3. **SetupCityUI.cs** (`Assets/Scripts/UI/SetupCityUI.cs`)
   - Can use GUI Pro prefabs for all UI elements

## Step 4: Using GUI Pro Prefabs

### Option A: Assign Prefabs in Inspector
1. Select the GameObject with `MilestoneUI` or `CityUI` component
2. In the Inspector, drag GUI Pro prefabs to the prefab fields
3. The scripts will automatically use the prefabs instead of creating UI programmatically

### Option B: Reference Prefabs in Code
Update the scripts to reference GUI Pro prefabs by path:
```csharp
// Example: Load a GUI Pro button prefab
GameObject buttonPrefab = Resources.Load<GameObject>("Path/To/GUIPro/Button");
```

## Step 5: Styling and Theming

GUI Pro Bundle typically includes:
- **Color schemes** - Apply consistent colors across UI
- **Fonts** - Use provided fonts for better typography
- **Materials** - Apply materials for visual effects
- **Sprites** - Use icons and decorative elements

## Quick Integration Checklist

- [ ] Download GUI Pro assets from Package Manager
- [ ] Locate prefab folders in Assets or Packages
- [ ] Create a Resources folder structure (optional) for easy loading
- [ ] Update UI scripts to reference GUI Pro prefabs
- [ ] Test UI appearance and functionality
- [ ] Apply consistent theming across all panels

## Notes

- The current implementation creates UI programmatically, so it works without GUI Pro Bundle
- Once GUI Pro prefabs are available, you can enhance the visual appearance
- All UI scripts support both prefab-based and programmatic creation
- GUI Pro assets can be mixed with custom UI elements

## Support

For detailed information about GUI Pro Bundle assets, visit:
https://tinyurl.com/LayerLabAssetGuide

