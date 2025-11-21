using UnityEngine;
using UnityEngine.UI;
using KingdomsPersist.Utils;

namespace KingdomsPersist.Managers
{
    /// <summary>
    /// Singleton manager that creates and manages the single Canvas instance for the game.
    /// Ensures all UI elements use the same Canvas and prevents duplicate Canvas creation.
    /// </summary>
    public class CanvasManager : MonoBehaviour
    {
        private static readonly Vector2 PortraitReferenceResolution = new Vector2(1080f, 1920f);
        private const float PortraitMatchWidthOrHeight = 0.5f;

        public static CanvasManager Instance { get; private set; }
        public static Vector2 ReferenceResolution => PortraitReferenceResolution;
        public static bool IsPortraitLayout => PortraitReferenceResolution.y >= PortraitReferenceResolution.x;
        
        private Canvas canvas;
        private Transform cachedContentArea;
        private bool hasLoggedContentAreaWarning;

        private void Awake()
        {
            Debug.Log($"[CanvasManager] Awake() called. Instance={Instance?.name ?? "null"}");
            
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                Debug.Log("[CanvasManager] Instance created and set. Initializing Canvas...");
                CreateCanvas();
                VerifyCanvasSetup();
            }
            else if (Instance != this)
            {
                Debug.LogWarning($"[CanvasManager] Duplicate instance detected. Destroying {gameObject.name}.");
                Destroy(gameObject);
            }
        }

        private void CreateCanvas()
        {
            Canvas[] existingCanvases = FindObjectsOfType<Canvas>();
            Debug.Log($"[CanvasManager] Found {existingCanvases.Length} existing Canvas(es) in scene.");
            
            if (existingCanvases.Length > 1)
            {
                Debug.LogWarning($"[CanvasManager] WARNING: Multiple Canvases detected ({existingCanvases.Length})! This should not happen.");
                foreach (Canvas c in existingCanvases)
                {
                    Debug.LogWarning($"[CanvasManager]   - Canvas: {c.name} (GameObject: {c.gameObject.name})");
                }
            }
            
            if (existingCanvases.Length > 0)
            {
                canvas = existingCanvases[0];
                Debug.Log($"[CanvasManager] Using existing Canvas: {canvas.name} (GameObject: {canvas.gameObject.name})");
                
                // Verify it has required components
                VerifyCanvasComponents(canvas.gameObject);
                return;
            }

            Debug.Log("[CanvasManager] No Canvas found. Creating new Canvas...");
            GameObject canvasGO = new GameObject("Canvas");
            canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            
            CanvasScaler scaler = canvasGO.AddComponent<CanvasScaler>();
            ApplyMobileScalerSettings(scaler);
            
            canvasGO.AddComponent<GraphicRaycaster>();

            Debug.Log($"[CanvasManager] Created new Canvas: {canvasGO.name}");
            Debug.Log($"[CanvasManager]   - RenderMode: {canvas.renderMode}");
            Debug.Log($"[CanvasManager]   - CanvasScaler: {scaler.uiScaleMode}, ReferenceResolution: {scaler.referenceResolution}");
            
            // Ensure EventSystem exists
            EventSystemHelper.EnsureEventSystem();
        }
        
        private void VerifyCanvasComponents(GameObject canvasGO)
        {
            CanvasScaler scaler = canvasGO.GetComponent<CanvasScaler>();

            if (scaler == null)
            {
                Debug.LogWarning($"[CanvasManager] Canvas '{canvasGO.name}' is missing a CanvasScaler. Please add one in the scene so scaling is preserved.");
            }
            else
            {
                Debug.Log($"[CanvasManager] CanvasScaler found on '{canvasGO.name}'. Mode={scaler.uiScaleMode}, ReferenceResolution={scaler.referenceResolution}, Match={scaler.matchWidthOrHeight}");
            }
        }

        private void ApplyMobileScalerSettings(CanvasScaler scaler)
        {
            if (scaler == null) return;

            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.referenceResolution = PortraitReferenceResolution;
            scaler.matchWidthOrHeight = PortraitMatchWidthOrHeight;
        }
        
        private void VerifyCanvasSetup()
        {
            Canvas[] allCanvases = FindObjectsOfType<Canvas>();
            Debug.Log($"[CanvasManager] === Canvas Verification ===");
            Debug.Log($"[CanvasManager] Total Canvases in scene: {allCanvases.Length}");
            
            if (allCanvases.Length == 1)
            {
                Debug.Log($"[CanvasManager] ✓ SUCCESS: Only one Canvas exists ({allCanvases[0].name})");
            }
            else if (allCanvases.Length == 0)
            {
                Debug.LogError("[CanvasManager] ✗ ERROR: No Canvas found in scene!");
            }
            else
            {
                Debug.LogError($"[CanvasManager] ✗ ERROR: Multiple Canvases detected ({allCanvases.Length})!");
                for (int i = 0; i < allCanvases.Length; i++)
                {
                    Debug.LogError($"[CanvasManager]   Canvas {i + 1}: {allCanvases[i].name} (GameObject: {allCanvases[i].gameObject.name})");
                }
            }
            
            if (canvas != null)
            {
                Debug.Log($"[CanvasManager] Managed Canvas: {canvas.name}");
                Debug.Log($"[CanvasManager]   - RenderMode: {canvas.renderMode}");
                Debug.Log($"[CanvasManager]   - Child Count: {canvas.transform.childCount}");
            }
            else
            {
                Debug.LogError("[CanvasManager] ✗ ERROR: CanvasManager.canvas is null!");
            }
            
            Debug.Log($"[CanvasManager] ============================");
        }


        /// <summary>
        /// Gets the main Canvas instance. Creates it if it doesn't exist.
        /// </summary>
        public static Canvas GetCanvas()
        {
            if (Instance == null)
            {
                Debug.LogWarning("[CanvasManager] GetCanvas() called but Instance is null! Creating CanvasManager...");
                // Create CanvasManager if it doesn't exist
                GameObject managerGO = new GameObject("CanvasManager");
                Instance = managerGO.AddComponent<CanvasManager>();
            }

            if (Instance.canvas == null)
            {
                Debug.LogWarning("[CanvasManager] GetCanvas() called but canvas is null! Creating Canvas...");
                Instance.CreateCanvas();
            }

            Debug.Log($"[CanvasManager] GetCanvas() returning: {Instance.canvas.name}");
            return Instance.canvas;
        }

        public static Transform GetUIControllersContainer()
        {
            if (Instance == null)
            {
                Debug.Log("[CanvasManager] GetUIControllersContainer() called but Instance is null. Creating...");
                GetCanvas();
            }

            Transform contentArea = Instance?.ResolveContentArea();
            if (contentArea != null)
            {
                Debug.Log($"[CanvasManager] Returning ContentArea '{contentArea.name}'. Child count: {contentArea.childCount}");
            }
            else if (Instance != null && !Instance.hasLoggedContentAreaWarning)
            {
                Instance.hasLoggedContentAreaWarning = true;
                Debug.LogWarning("[CanvasManager] ContentArea could not be found. Scene-driven HUD should assign panel parents manually.");
            }

            return contentArea;
        }

        private Transform ResolveContentArea()
        {
            if (cachedContentArea != null)
            {
                return cachedContentArea;
            }

            if (canvas != null)
            {
                Transform mainHudRoot = canvas.transform.Find("MainHUDRoot");
                if (mainHudRoot != null)
                {
                    cachedContentArea = mainHudRoot.Find("ContentArea");
                    if (cachedContentArea != null)
                    {
                        return cachedContentArea;
                    }
                }
            }

            GameObject fallback = GameObject.Find("ContentArea");
            if (fallback != null)
            {
                cachedContentArea = fallback.transform;
            }

            return cachedContentArea;
        }
    }
}

