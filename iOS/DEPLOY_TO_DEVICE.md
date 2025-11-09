# Deploy to Tolga's Device

## Development Team Configured ✅
- Team ID: `N9GJBANV55`
- Code Signing: Automatic
- Bundle ID: `com.idleadventure.topplayer`

## Steps to Deploy

### 1. Prepare Device
- **Unlock** your iPhone "Tolga"
- **Trust** this computer if prompted (enter passcode)
- Keep device **unlocked** during build
- Ensure device is **connected via USB**

### 2. Build & Install via Xcode (Recommended)

```bash
cd iOS
open TopPlayer.xcodeproj
```

In Xcode:
1. Select **"Tolga"** device from the device dropdown (top toolbar)
2. Click the **Play button** (▶️) or press **Cmd+R**
3. Xcode will:
   - Build the app
   - Create provisioning profile automatically
   - Install on device
   - Launch the app

### 3. Alternative: Command Line Build

Once device is ready (unlocked, trusted):

```bash
cd iOS
xcodebuild -project TopPlayer.xcodeproj \
  -scheme TopPlayer \
  -destination 'id=00008150-001C5DE601F0401C' \
  -allowProvisioningUpdates \
  build
```

Then install:
```bash
xcrun devicectl device install app \
  --device 00008150-001C5DE601F0401C \
  TopPlayer.app
```

### 4. Troubleshooting

**"Device is busy"**
- Unlock device
- Disconnect and reconnect USB
- Restart Xcode if needed

**"No development team"**
- Already configured: `N9GJBANV55`
- If still error, open Xcode → Signing & Capabilities → Select team

**"Provisioning profile not found"**
- Xcode will create automatically with `-allowProvisioningUpdates`
- Or manually: Xcode → Signing & Capabilities → Check "Automatically manage signing"

**"Untrusted Developer"**
- On device: Settings → General → VPN & Device Management
- Trust your developer certificate

## Current Status

✅ Project configured with development team
✅ Code signing set to Automatic
✅ Ready to build for device

Just unlock device, trust computer, and build!


