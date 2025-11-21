# UI Not Working - Troubleshooting Guide

## Quick Fix Steps

### 1. **Check Unity Console**
   - Press Play in Unity
   - Look at the Console window
   - Check for any red errors
   - Look for messages starting with `[MainHUD]`, `[LoginUI]`, `[EventSystem]`

### 2. **Run Diagnostic Tool**
   - In Unity Hierarchy, create an empty GameObject
   - Add Component → `UIDiagnostic` (under KingdomsPersist.Utils)
   - Right-click the component → "Run UI Diagnostics"
   - Check the Console for the diagnostic report

### 3. **Common Issues & Fixes**

#### **Issue: Login Screen Not Showing**
**Symptoms:** No login panel visible, can't enter username

**Fix:**
1. Check Console for `[LoginUI]` messages
2. If you see "Login panel is null", the panel wasn't created
3. The diagnostic tool will auto-fix this

#### **Issue: Buttons Not Clickable**
**Symptoms:** Buttons visible but nothing happens when clicked

**Possible Causes:**
1. **EventSystem missing** - Diagnostic tool will fix this
2. **GraphicRaycaster missing** - Diagnostic tool will fix this
3. **Buttons not interactable** - Check button's `interactable` property in Inspector

**Manual Fix:**
- In Hierarchy, find "EventSystem" GameObject
- If missing, GameObject → UI → Event System
- Ensure it has `StandaloneInputModule` component (NOT InputSystemUIInputModule)

#### **Issue: Login Button Doesn't Work**
**Symptoms:** Can type username but clicking Login does nothing

**Fix:**
1. Check Console for `[LoginUI] Login button setup complete`
2. If you see "Login button is null", the button wasn't created properly
3. Check if NetworkService is initialized (should see `[GameManager] NetworkService: ✓ Ready`)

#### **Issue: After Login, Nothing Works**
**Symptoms:** Login succeeds but game buttons don't work

**Possible Causes:**
1. **UI panels not initialized** - Check Console for warnings about missing UI components
2. **GameStateManager not initialized** - Should see `[GameManager] GameStateManager: ✓ Ready`

**Fix:**
- Check Console for initialization messages
- Look for `[MainHUD] Buttons setup complete`
- If missing, the MainHUD might not have initialized properly

### 4. **Manual Verification Steps**

#### **Check EventSystem:**
```
1. In Hierarchy, look for "EventSystem" GameObject
2. Select it
3. In Inspector, check:
   - EventSystem component is enabled
   - Has StandaloneInputModule component (enabled)
   - NOT InputSystemUIInputModule
```

#### **Check Canvas:**
```
1. In Hierarchy, look for "Canvas" GameObject
2. Select it
3. In Inspector, check:
   - Canvas component exists
   - Render Mode: Screen Space - Overlay
   - Has GraphicRaycaster component (enabled)
   - Has CanvasScaler component
```

#### **Check Login Panel:**
```
1. In Hierarchy, find "LoginPanel" (under Canvas)
2. Select it
3. In Inspector, check:
   - GameObject is Active (checkbox checked)
   - Has RectTransform
   - Has Image component
   - Has child "LoginButton" with Button component
   - Button's Interactable checkbox is checked
```

#### **Check MainHUD Buttons:**
```
1. In Hierarchy, find "ActionButtons" (under Canvas)
2. Expand it
3. Select any button (e.g., "Button_Build")
4. In Inspector, check:
   - Button component exists
   - Interactable is checked
   - Has Image component
   - Image's Raycast Target is checked
```

### 5. **Debug Mode**

Add this to any script to test if buttons work:

```csharp
void Update()
{
    if (Input.GetMouseButtonDown(0))
    {
        Debug.Log($"Mouse clicked at: {Input.mousePosition}");
        
        // Check what's under the mouse
        PointerEventData pointerData = new PointerEventData(EventSystem.current);
        pointerData.position = Input.mousePosition;
        
        List<RaycastResult> results = new List<RaycastResult>();
        EventSystem.current.RaycastAll(pointerData, results);
        
        foreach (RaycastResult result in results)
        {
            Debug.Log($"Hit: {result.gameObject.name}");
        }
    }
}
```

### 6. **Common Error Messages & Solutions**

| Error Message | Solution |
|--------------|----------|
| `EventSystem.current is NULL` | EventSystemHelper.EnsureEventSystem() will fix this |
| `No Canvas found` | CanvasManager.GetCanvas() will create one |
| `GraphicRaycaster missing` | Diagnostic tool will add it |
| `Login button is null` | LoginUI panel wasn't created - check LoadGUIAssets() |
| `NetworkService.Instance is null` | GameManager didn't initialize NetworkService |
| `GameStateManager.Instance is null` | GameManager didn't initialize GameStateManager |

### 7. **If Nothing Works**

**Nuclear Option - Reset Everything:**
1. Stop Play mode
2. Delete all GameObjects in Hierarchy (except Main Camera)
3. Create new GameObject → Add `GameManager` component
4. Press Play
5. Check Console for initialization messages

**Check Scene Setup:**
- Ensure you have a scene with GameManager GameObject
- GameManager should have the component attached (not a prefab reference unless prefab is in scene)

### 8. **Testing Checklist**

- [ ] EventSystem exists and has StandaloneInputModule
- [ ] Canvas exists and has GraphicRaycaster
- [ ] Login panel is visible when game starts
- [ ] Can type in username field
- [ ] Login button is clickable (changes color on hover)
- [ ] After login, action buttons appear at bottom
- [ ] Action buttons are clickable
- [ ] Clicking buttons opens panels

### 9. **Still Not Working?**

Run the diagnostic tool and share the Console output. The diagnostic will:
- Check EventSystem
- Check Canvas setup
- Check Login status
- Check all buttons
- Check UI panels
- Auto-fix common issues

## Quick Test Script

Add this to a GameObject to test if UI is working:

```csharp
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

public class UITest : MonoBehaviour
{
    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            Debug.Log("=== UI TEST ===");
            Debug.Log($"EventSystem: {(EventSystem.current != null ? "EXISTS" : "NULL")}");
            Debug.Log($"Canvas Count: {FindObjectsOfType<Canvas>().Length}");
            Debug.Log($"Button Count: {FindObjectsOfType<Button>().Length}");
            
            Button[] buttons = FindObjectsOfType<Button>();
            foreach (Button btn in buttons)
            {
                Debug.Log($"Button: {btn.name}, Interactable: {btn.interactable}, Listeners: {btn.onClick.GetPersistentEventCount()}");
            }
        }
    }
}
```

Press Space in Play mode to see UI status.


