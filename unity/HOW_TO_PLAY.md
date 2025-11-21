# How to Play Kingdom Ledger - Complete Setup Guide

## ✅ **YES, YOU CAN PLAY THE GAME!** Here's how:

### **Step 1: Open the Scene**
1. Open Unity Editor
2. Go to `Assets/Scenes/MainScene.unity`
3. Double-click to open it

### **Step 2: Verify Scene Setup**
The scene MUST have a GameObject with the `GameManager` component:

**Check if GameManager exists:**
- Look in Hierarchy window
- Find GameObject named "GameManager" (or any GameObject)
- Select it
- In Inspector, check if it has `GameManager` component

**If GameManager doesn't exist:**
1. Right-click in Hierarchy → Create Empty
2. Name it "GameManager"
3. Select it
4. In Inspector, click "Add Component"
5. Search for "GameManager" → Add it

### **Step 3: Press Play**
1. Click the Play button (▶) at top of Unity Editor
2. **Watch the Console window** - it will show initialization messages

### **Step 4: What Should Happen**

**Expected Console Output:**
```
[GameManager] ===== Initialization Started =====
[GameManager] Step 1: Initializing CanvasManager...
[CanvasManager] Created new Canvas: Canvas
[GameManager] Step 2: Ensuring Canvas exists...
[GameManager] Step 3: Initializing Services...
[GameManager]   - NetworkService...
[GameManager]   - GameStateManager...
[GameManager] Step 4: Verifying services...
[GameManager]   - NetworkService: ✓ Ready
[GameManager]   - GameStateManager: ✓ Ready
[GameManager] Step 5: Initializing UI...
[MainHUD] Awake() called. Creating HUD...
[MainHUD] Start() called. Setting up UI panels...
[LoginUI] Login button setup complete
```

**Expected Visual Result:**
- Login panel appears in center of screen
- Username input field visible
- Login and Register buttons visible
- Action buttons appear at bottom of screen (Build, Train, Market, etc.)

### **Step 5: Login**
1. Type any username in the username field
2. Click "Login" button
3. Login panel should disappear
4. Game should load with your city state

### **Step 6: Play the Game**
After login, you should see:
- **Top bar**: Tick counter, version, resources
- **Bottom bar**: Action buttons (Build, Train, Market, Laws, Milestones, Heroes, Routes, Adventures)
- **City info**: Buildings and queues (if containers were created)

Click any button to open that feature's panel!

---

## 🔧 **If It Doesn't Work - Troubleshooting**

### **Problem: Nothing appears when I press Play**

**Solution:**
1. Check Console for errors (red messages)
2. Ensure GameManager GameObject exists in scene
3. Ensure GameManager component is attached
4. Check if scene is saved (Ctrl+S)

### **Problem: Login panel doesn't appear**

**Check Console for:**
- `[MainHUD] LoginUI created` - Should see this
- `[LoginUI] Login panel shown` - Should see this
- Any red errors

**Fix:**
1. Stop Play mode
2. In Hierarchy, look for "Canvas" → "LoginPanel"
3. If missing, the panel wasn't created
4. Add `UIDiagnostic` component to any GameObject and run diagnostics

### **Problem: Buttons don't respond to clicks**

**Check:**
1. In Hierarchy, find "EventSystem" GameObject
2. If missing, GameObject → UI → Event System
3. Ensure it has `StandaloneInputModule` component (NOT InputSystemUIInputModule)

**Fix:**
- The diagnostic tool will auto-fix this
- Or manually: Select EventSystem → Add Component → Standalone Input Module

### **Problem: Can't type in username field**

**Check:**
1. Is the login panel visible?
2. Is the input field there but not selectable?
3. Check Console for `[LoginUI]` messages

**Fix:**
- Ensure EventSystem exists (see above)
- Ensure Canvas has GraphicRaycaster component

### **Problem: Login button does nothing**

**Check Console for:**
- `[LoginUI] Login button setup complete` - Should see this
- `NetworkService.Instance is null` - This would prevent login
- Any red errors when clicking Login

**Fix:**
- If NetworkService is null, GameManager didn't initialize it
- Check Console for `[GameManager] NetworkService: ✓ Ready`
- If you see `✗ NULL`, there's an initialization issue

---

## 🧪 **Verification Tool**

**Use the Startup Verifier:**
1. Create empty GameObject in Hierarchy
2. Add Component → `GameStartupVerifier`
3. Right-click component → "Verify Game Can Start"
4. Check Console for verification report

This will tell you exactly what's missing!

---

## 📋 **Complete Checklist**

Before pressing Play, verify:
- [ ] Scene `MainScene.unity` is open
- [ ] GameManager GameObject exists in Hierarchy
- [ ] GameManager component is attached
- [ ] Scene is saved (no asterisk * next to scene name)
- [ ] Console window is open (to see messages)

After pressing Play, verify:
- [ ] Console shows initialization messages (no red errors)
- [ ] Login panel appears on screen
- [ ] Can type in username field
- [ ] Login button is visible and clickable
- [ ] After login, action buttons appear at bottom

---

## 🎮 **Quick Test**

**Minimal Test:**
1. Open MainScene
2. Ensure GameManager GameObject exists
3. Press Play
4. Look for login panel
5. Type "testuser"
6. Click Login
7. Should see game UI

**If this doesn't work, run the diagnostic tool and share the Console output!**

---

## 🆘 **Still Not Working?**

1. **Run Diagnostic Tool:**
   - Add `UIDiagnostic` component to any GameObject
   - Right-click → "Run UI Diagnostics"
   - Share Console output

2. **Run Startup Verifier:**
   - Add `GameStartupVerifier` component
   - Right-click → "Verify Game Can Start"
   - Share Console output

3. **Check Console:**
   - Copy all messages from Console
   - Look for red errors
   - Share the error messages

The game IS playable - we just need to identify what's blocking it in your specific setup!


