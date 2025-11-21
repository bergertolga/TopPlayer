using UnityEngine;
using UnityEngine.UI;
using KingdomsPersist.Services;
using KingdomsPersist.Managers;
using KingdomsPersist.UI;
using KingdomsPersist.Utils;

namespace KingdomsPersist
{
    /// <summary>
    /// Verifies the game can start and be played. Run this to check if everything is set up correctly.
    /// </summary>
    public class GameStartupVerifier : MonoBehaviour
    {
        [ContextMenu("Verify Game Can Start")]
        public void VerifyGameStartup()
        {
            Debug.Log("========================================");
            Debug.Log("GAME STARTUP VERIFICATION");
            Debug.Log("========================================");
            
            bool allGood = true;
            
            // 1. Check if GameManager exists
            allGood &= CheckGameManager();
            
            // 2. Check Canvas setup
            allGood &= CheckCanvas();
            
            // 3. Check EventSystem
            allGood &= CheckEventSystem();
            
            // 4. Check Services
            allGood &= CheckServices();
            
            // 5. Check UI
            allGood &= CheckUI();
            
            // 6. Check Network
            allGood &= CheckNetwork();
            
            Debug.Log("========================================");
            if (allGood)
            {
                Debug.Log("✓ ALL CHECKS PASSED - GAME SHOULD BE PLAYABLE!");
                Debug.Log("If you still can't play, check Console for runtime errors.");
            }
            else
            {
                Debug.LogError("✗ SOME CHECKS FAILED - SEE ERRORS ABOVE");
                Debug.Log("Fix the issues above, then try again.");
            }
            Debug.Log("========================================");
        }
        
        private bool CheckGameManager()
        {
            Debug.Log("\n[1] Checking GameManager...");
            GameManager gm = FindObjectOfType<GameManager>();
            if (gm == null)
            {
                Debug.LogError("❌ GameManager not found in scene!");
                Debug.LogError("SOLUTION: Create empty GameObject, add GameManager component");
                return false;
            }
            Debug.Log("✓ GameManager exists");
            return true;
        }
        
        private bool CheckCanvas()
        {
            Debug.Log("\n[2] Checking Canvas...");
            Canvas[] canvases = FindObjectsOfType<Canvas>();
            if (canvases.Length == 0)
            {
                Debug.LogWarning("⚠ No Canvas found, but CanvasManager will create one");
                return true; // Not a blocker, will be created
            }
            
            bool hasRaycaster = true;
            foreach (Canvas canvas in canvases)
            {
                GraphicRaycaster raycaster = canvas.GetComponent<GraphicRaycaster>();
                if (raycaster == null)
                {
                    Debug.LogError($"❌ Canvas '{canvas.name}' missing GraphicRaycaster!");
                    hasRaycaster = false;
                }
                else if (!raycaster.enabled)
                {
                    Debug.LogWarning($"⚠ GraphicRaycaster disabled on '{canvas.name}'");
                    raycaster.enabled = true;
                }
            }
            
            if (hasRaycaster)
                Debug.Log($"✓ Canvas setup OK ({canvases.Length} canvas(es))");
            return hasRaycaster;
        }
        
        private bool CheckEventSystem()
        {
            Debug.Log("\n[3] Checking EventSystem...");
            if (UnityEngine.EventSystems.EventSystem.current == null)
            {
                Debug.LogWarning("⚠ EventSystem not found, but EventSystemHelper will create one");
                EventSystemHelper.EnsureEventSystem();
                return true; // Not a blocker, will be created
            }
            
            var module = UnityEngine.EventSystems.EventSystem.current.GetComponent<UnityEngine.EventSystems.BaseInputModule>();
            if (module == null)
            {
                Debug.LogError("❌ EventSystem missing Input Module!");
                EventSystemHelper.EnsureEventSystem();
                return false;
            }
            
            Debug.Log($"✓ EventSystem OK (Module: {module.GetType().Name})");
            return true;
        }
        
        private bool CheckServices()
        {
            Debug.Log("\n[4] Checking Services...");
            
            if (NetworkService.Instance == null)
            {
                Debug.LogWarning("⚠ NetworkService.Instance is null (will be created by GameManager)");
            }
            else
            {
                Debug.Log("✓ NetworkService.Instance exists");
            }
            
            if (GameStateManager.Instance == null)
            {
                Debug.LogWarning("⚠ GameStateManager.Instance is null (will be created by GameManager)");
            }
            else
            {
                Debug.Log("✓ GameStateManager.Instance exists");
            }
            
            if (CanvasManager.Instance == null)
            {
                Debug.LogWarning("⚠ CanvasManager.Instance is null (will be created by GameManager)");
            }
            else
            {
                Debug.Log("✓ CanvasManager.Instance exists");
            }
            
            return true; // Services are created at runtime, so this is OK
        }
        
        private bool CheckUI()
        {
            Debug.Log("\n[5] Checking UI...");
            bool uiGood = true;
            
            MainHUD mainHUD = FindObjectOfType<MainHUD>();
            if (mainHUD == null)
            {
                Debug.LogWarning("⚠ MainHUD not found (will be created by GameManager)");
            }
            else
            {
                Debug.Log("✓ MainHUD exists");
                
                // Check if buttons exist
                if (mainHUD.buildButton == null)
                    Debug.LogWarning("⚠ MainHUD.buildButton is null");
                if (mainHUD.heroesButton == null)
                    Debug.LogWarning("⚠ MainHUD.heroesButton is null");
            }
            
            LoginUI loginUI = FindObjectOfType<LoginUI>();
            if (loginUI == null)
            {
                Debug.LogWarning("⚠ LoginUI not found (will be created by MainHUD)");
            }
            else
            {
                Debug.Log("✓ LoginUI exists");
                if (loginUI.loginButton == null)
                {
                    Debug.LogError("❌ LoginUI.loginButton is null!");
                    uiGood = false;
                }
            }
            
            return uiGood;
        }
        
        private bool CheckNetwork()
        {
            Debug.Log("\n[6] Checking Network Configuration...");
            if (NetworkService.Instance != null)
            {
                string baseUrl = NetworkService.Instance.baseUrl;
                if (string.IsNullOrEmpty(baseUrl))
                {
                    Debug.LogError("❌ NetworkService.baseUrl is empty!");
                    Debug.LogError("SOLUTION: Set baseUrl in NetworkService component");
                    return false;
                }
                Debug.Log($"✓ NetworkService.baseUrl: {baseUrl}");
            }
            else
            {
                Debug.LogWarning("⚠ NetworkService.Instance is null (will check at runtime)");
            }
            return true;
        }
        
        private void Start()
        {
            // Auto-run verification after 2 seconds
            Invoke(nameof(VerifyGameStartup), 2f);
        }
    }
}

