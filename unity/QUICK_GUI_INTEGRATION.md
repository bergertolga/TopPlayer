# Quick GUI Pro Bundle Integration Guide

## Step 1: Locate Your Downloaded Asset

The asset you downloaded could be in one of these locations:

### Option A: In Assets Folder
Look in Unity's Project window for a new folder, typically named something like:
- `GUI Pro - Buttons`
- `Layer Lab GUI`
- `[PackageName]`

### Option B: In Packages Folder (Read-only)
If installed as a package, it will be in:
- `Packages/[PackageName]/` (visible in Project window under Packages)
- These are read-only but you can reference them

## Step 2: Find the Prefabs

Once you locate the asset folder, look for:
- **Prefabs folder** - Contains button, panel, etc. prefabs
- **Sprites folder** - Contains icons and graphics
- **Materials folder** - Contains UI materials

## Step 3: Use with MilestoneUI

1. **Open your scene** with MilestoneUI component
2. **Select the GameObject** that has MilestoneUI attached
3. **In the Inspector**, find the MilestoneUI component
4. **Drag prefabs** from the GUI Pro Bundle to these fields:
   - `guiProClaimButtonPrefab` - Drag a button prefab here
   - `guiProMilestonePanelPrefab` - Drag a panel prefab here
   - `milestoneItemPrefab` - Can also use GUI Pro prefab here
   - `closeButton` - Assign a GUI Pro button prefab

## Step 4: Use with UIManager (Optional)

For centralized access:

1. **Create a GameObject** in your scene called "UIManager"
2. **Add the UIManager component** to it
3. **Assign GUI Pro prefabs** to:
   - `guiProButtonPrefab`
   - `guiProPanelPrefab`
   - `guiProInputFieldPrefab`
   - `guiProDropdownPrefab`

## Step 5: Test It Out

1. **Play the scene**
2. **Open MilestoneUI** (you may need to add a button to trigger `ShowPanel()`)
3. **Check the Console** - Should see milestone data loading
4. **The GUI Pro prefabs** will automatically be used instead of programmatic creation

## Quick Tips

- **If prefabs aren't showing**: Make sure `usePrefabs = true` in MilestoneUI Inspector
- **To see what's available**: Use `Tools > Find GUI Pro Bundle Assets` menu
- **For more assets**: Keep checking Package Manager > My Assets tab

## Common GUI Pro Bundle Prefab Names

Look for prefabs named like:
- `Button_01`, `Button_02`, etc.
- `Panel_01`, `Panel_02`, etc.
- `InputField_01`
- `Dropdown_01`

## Next Steps When More Assets Arrive

As more assets become available, you can:
1. Download them from Package Manager
2. Assign them to the appropriate fields in UIManager
3. All UI components will automatically use them

The code is already set up to use GUI Pro Bundle assets - you just need to assign the prefabs in the Inspector!

