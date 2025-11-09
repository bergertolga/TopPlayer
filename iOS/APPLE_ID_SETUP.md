# Setting Up Apple ID for Code Signing

## Step 1: Add Your Apple ID to Xcode

1. **Open Xcode Preferences**:
   - Press `Cmd + ,` (Command + Comma)
   - OR go to **Xcode → Settings** (or **Preferences** in older versions)

2. **Go to Accounts Tab**:
   - Click the **"Accounts"** tab at the top

3. **Add Apple ID**:
   - Click the **"+"** button at the bottom left
   - Select **"Apple ID"**
   - Enter your Apple ID email and password
   - Click **"Sign In"**

4. **Verify Account**:
   - Your account should appear in the list
   - If you see a team (like "Personal Team" or your organization), that's your development team

## Step 2: Configure Signing in Project

1. **In the Xcode project** (already open):
   - Select **TopPlayer** project (blue icon) in left sidebar
   - Select **TopPlayer** target
   - Click **"Signing & Capabilities"** tab

2. **Enable Automatic Signing**:
   - Check **"Automatically manage signing"**
   - Select your **Apple ID** from the **Team** dropdown
     - It should show something like: `Your Name (Personal Team)` or your organization name

3. **Xcode will automatically**:
   - Create a development certificate
   - Create a provisioning profile
   - Register your device
   - Configure everything needed

## Step 3: Trust Your Device

1. **On your iPhone "Tolga"**:
   - Connect via USB
   - Unlock the device
   - If prompted: **"Trust This Computer"** → Enter passcode

2. **In Xcode**:
   - Select **"Tolga"** from the device dropdown (top toolbar)
   - Xcode will register the device automatically

## Step 4: Build & Run

1. **Select your device** from the device dropdown
2. **Click Play** (▶️) or press **Cmd+R**
3. **On device**: If you see "Untrusted Developer":
   - Go to **Settings → General → VPN & Device Management**
   - Tap your developer account
   - Tap **"Trust [Your Name]"**

## Troubleshooting

**"No account for team"**:
- Make sure you added your Apple ID in Xcode Settings → Accounts
- Sign out and sign back in if needed

**"No signing certificate"**:
- Xcode creates this automatically when you select a team
- Make sure "Automatically manage signing" is checked

**"Provisioning profile doesn't include device"**:
- Xcode will add your device automatically when you select it
- Make sure device is connected, unlocked, and trusted

**Still having issues?**:
- Try: Xcode → Product → Clean Build Folder (Shift+Cmd+K)
- Then build again

## Quick Command to Open Accounts

```bash
open -a Xcode
# Then: Cmd + , → Accounts tab → Add Apple ID
```


