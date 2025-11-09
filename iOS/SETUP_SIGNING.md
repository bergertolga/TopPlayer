# Setup Code Signing for Device Build

## Quick Setup in Xcode

The project is now open in Xcode. Follow these steps:

### 1. Configure Signing & Capabilities

1. In Xcode, select the **TopPlayer** project (blue icon) in the left sidebar
2. Select the **TopPlayer** target
3. Click the **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Select your **Apple ID** from the Team dropdown
   - If you don't see your account: Xcode → Settings → Accounts → Add Apple ID
6. Xcode will automatically:
   - Create a provisioning profile
   - Set up code signing certificates
   - Configure the bundle identifier

### 2. Connect Your Device

1. Connect "Tolga" iPhone via USB
2. **Unlock** the device
3. **Trust** this computer if prompted (enter passcode on device)
4. In Xcode, select **"Tolga"** from the device dropdown (top toolbar)

### 3. Build & Run

1. Click the **Play button** (▶️) or press **Cmd+R**
2. Xcode will build and install on your device
3. On device: Settings → General → VPN & Device Management → Trust the developer

## Alternative: Let Xcode Auto-Configure

If you see signing errors, Xcode will offer to fix them automatically:
- Click **"Try Again"** or **"Enable Automatic Signing"**
- Xcode will handle everything

## Current Status

✅ Project ready
✅ Code signing set to Automatic
⏳ Need to select team in Xcode (one-time setup)

Once you select your team in Xcode, building will work!


