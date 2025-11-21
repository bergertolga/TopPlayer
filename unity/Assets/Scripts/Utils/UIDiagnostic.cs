using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using KingdomsPersist.Managers;

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Diagnostic tool to check why UI isn't working
    /// </summary>
    public class UIDiagnostic : MonoBehaviour
    {
        [ContextMenu("Run UI Diagnostics")]
        public void RunDiagnostics()
        {
            Debug.Log("=== UI DIAGNOSTIC REPORT ===");
            
            // 1. Check EventSystem
            CheckEventSystem();
            
            // 2. Check Canvas
            CheckCanvas();
            
            // 3. Check Login Status
            CheckLoginStatus();
            
            // 4. Check Button Clickability
            CheckButtons();
            
            // 5. Check UI Panels
            CheckUIPanels();
            
            Debug.Log("=== END DIAGNOSTIC REPORT ===");
        }
        
        private void CheckEventSystem()
        {
            Debug.Log("\n--- EventSystem Check ---");
            if (EventSystem.current == null)
            {
                Debug.LogError("❌ EventSystem.current is NULL! UI clicks will NOT work!");
                EventSystemHelper.EnsureEventSystem();
                Debug.Log("✓ Created EventSystem");
            }
            else
            {
                Debug.Log($"✓ EventSystem exists: {EventSystem.current.name}");
                
                BaseInputModule module = EventSystem.current.GetComponent<BaseInputModule>();
                if (module == null)
                {
                    Debug.LogError("❌ No Input Module! Adding StandaloneInputModule...");
                    EventSystem.current.gameObject.AddComponent<StandaloneInputModule>();
                }
                else
                {
                    Debug.Log($"✓ Input Module: {module.GetType().Name}, Enabled: {module.enabled}");
                    if (!module.enabled)
                    {
                        Debug.LogWarning("⚠ Input Module disabled! Enabling...");
                        module.enabled = true;
                    }
                }
            }
        }
        
        private void CheckCanvas()
        {
            Debug.Log("\n--- Canvas Check ---");
            Canvas[] canvases = FindObjectsOfType<Canvas>();
            if (canvases.Length == 0)
            {
                Debug.LogError("❌ No Canvas found! UI elements won't be visible!");
                CanvasManager.GetCanvas();
                Debug.Log("✓ Created Canvas");
            }
            else
            {
                Debug.Log($"✓ Found {canvases.Length} Canvas(es)");
                foreach (Canvas canvas in canvases)
                {
                    GraphicRaycaster raycaster = canvas.GetComponent<GraphicRaycaster>();
                    if (raycaster == null)
                    {
                        Debug.LogError($"❌ Canvas '{canvas.name}' missing GraphicRaycaster! Adding...");
                        canvas.gameObject.AddComponent<GraphicRaycaster>();
                    }
                    else
                    {
                        Debug.Log($"✓ Canvas '{canvas.name}' has GraphicRaycaster, Enabled: {raycaster.enabled}");
                        if (!raycaster.enabled)
                        {
                            Debug.LogWarning($"⚠ GraphicRaycaster disabled on '{canvas.name}'! Enabling...");
                            raycaster.enabled = true;
                        }
                    }
                }
            }
        }
        
        private void CheckLoginStatus()
        {
            Debug.Log("\n--- Login Status Check ---");
            if (GameStateManager.Instance == null)
            {
                Debug.LogError("❌ GameStateManager.Instance is NULL!");
                return;
            }
            
            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                Debug.LogWarning("⚠ User not logged in! Login panel should be visible.");
                
                // Check if LoginUI exists
                UI.LoginUI loginUI = FindObjectOfType<UI.LoginUI>();
                if (loginUI == null)
                {
                    Debug.LogError("❌ LoginUI not found! User cannot login!");
                }
                else
                {
                    Debug.Log("✓ LoginUI exists");
                    if (loginUI.loginPanel != null)
                    {
                        Debug.Log($"✓ Login panel exists, Active: {loginUI.loginPanel.activeSelf}");
                        if (!loginUI.loginPanel.activeSelf)
                        {
                            Debug.LogWarning("⚠ Login panel is inactive! Activating...");
                            loginUI.ShowLoginPanel();
                        }
                    }
                }
            }
            else
            {
                Debug.Log($"✓ User logged in: {userId}");
                Debug.Log($"✓ City ID: {GameStateManager.Instance.cityId}");
            }
        }
        
        private void CheckButtons()
        {
            Debug.Log("\n--- Button Check ---");
            Button[] buttons = FindObjectsOfType<Button>();
            Debug.Log($"Found {buttons.Length} buttons");
            
            int nonInteractable = 0;
            int noListeners = 0;
            int noGraphic = 0;
            
            foreach (Button btn in buttons)
            {
                if (!btn.interactable)
                {
                    nonInteractable++;
                }
                
                if (btn.onClick.GetPersistentEventCount() == 0 && btn.onClick.GetPersistentMethodName(0) == "")
                {
                    // Check if it has runtime listeners
                    if (btn.onClick.GetPersistentEventCount() == 0)
                    {
                        noListeners++;
                    }
                }
                
                if (btn.targetGraphic == null)
                {
                    noGraphic++;
                }
            }
            
            if (nonInteractable > 0)
                Debug.LogWarning($"⚠ {nonInteractable} buttons are not interactable");
            if (noListeners > 0)
                Debug.LogWarning($"⚠ {noListeners} buttons have no listeners (might be OK if added at runtime)");
            if (noGraphic > 0)
                Debug.LogWarning($"⚠ {noGraphic} buttons have no target graphic");
            
            Debug.Log($"✓ {buttons.Length - nonInteractable - noGraphic} buttons appear functional");
        }
        
        private void CheckUIPanels()
        {
            Debug.Log("\n--- UI Panels Check ---");
            
            UI.MainHUD mainHUD = FindObjectOfType<UI.MainHUD>();
            if (mainHUD == null)
            {
                Debug.LogError("❌ MainHUD not found!");
            }
            else
            {
                Debug.Log("✓ MainHUD exists");
                
                // Check if UI panels are assigned
                if (mainHUD.cityUI == null) Debug.LogWarning("⚠ MainHUD.cityUI is null");
                if (mainHUD.heroesUI == null) Debug.LogWarning("⚠ MainHUD.heroesUI is null");
                if (mainHUD.adventuresUI == null) Debug.LogWarning("⚠ MainHUD.adventuresUI is null");
                if (mainHUD.marketUI == null) Debug.LogWarning("⚠ MainHUD.marketUI is null");
                if (mainHUD.trainingUI == null) Debug.LogWarning("⚠ MainHUD.trainingUI is null");
                if (mainHUD.lawsUI == null) Debug.LogWarning("⚠ MainHUD.lawsUI is null");
                if (mainHUD.milestoneUI == null) Debug.LogWarning("⚠ MainHUD.milestoneUI is null");
            }
        }
        
        private void Start()
        {
            // Auto-run diagnostics after a short delay
            Invoke(nameof(RunDiagnostics), 1f);
        }
    }
}


