# Building for Physical Device

## Steps to Build on Tolga's Device

1. **Open Xcode Project**
   ```bash
   cd iOS
   open TopPlayer.xcodeproj
   ```

2. **Configure Signing & Capabilities**
   - Select the "TopPlayer" target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Apple Developer Team
   - Xcode will automatically create provisioning profiles

3. **Connect Device**
   - Connect "Tolga" iPhone via USB
   - Trust the computer on the device if prompted
   - Ensure device is unlocked

4. **Select Device**
   - In Xcode, select "Tolga" from the device dropdown (top toolbar)
   - Or use: Product > Destination > Tolga

5. **Build & Run**
   - Press Cmd+R or click the Play button
   - Xcode will build and install on device

## Alternative: Command Line Build

Once signing is configured in Xcode:

```bash
cd iOS
xcodebuild -project TopPlayer.xcodeproj \
  -scheme TopPlayer \
  -destination 'id=00008150-001C5DE601F0401C' \
  -allowProvisioningUpdates \
  build
```

## Troubleshooting

- **"Device is busy"**: Unlock device, disconnect/reconnect USB
- **"No development team"**: Set up team in Xcode Signing & Capabilities
- **"Provisioning profile not found"**: Let Xcode automatically manage signing


