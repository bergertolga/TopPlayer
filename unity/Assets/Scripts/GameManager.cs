using UnityEngine;
using KingdomsPersist.Services;
using KingdomsPersist.Managers;

namespace KingdomsPersist
{
    public class GameManager : MonoBehaviour
    {
        [Header("Services")]
        public NetworkService networkServicePrefab;
        public GameStateManager gameStateManagerPrefab;
        public MilestoneManager milestoneManagerPrefab;

        [Header("Test Mode")]
        [Tooltip("Automatically spin up the offline TestModeManager when running inside the Unity Editor.")]
        public bool autoEnableTestModeInEditor = false;
        [Tooltip("Automatically spin up the offline TestModeManager when running in a built player.")]
        public bool autoEnableTestModeInPlayerBuilds = false;
        [Tooltip("Optional prefab to use when instantiating the TestModeManager. When left empty, a new GameObject will be created at runtime.")]
        public TestModeManager testModeManagerPrefab;

        [Header("UI")]
        public UI.MainHUD mainHUDPrefab;
        public UI.CityUI cityUIPrefab;
        public UI.MilestoneUI milestoneUIPrefab;

        private void Awake()
        {
            Debug.Log("[GameManager] ===== Initialization Started =====");
            
            // Initialize CanvasManager FIRST (before everything else)
            // This ensures Canvas exists before any UI scripts initialize
            Debug.Log("[GameManager] Step 1: Initializing CanvasManager...");
            if (CanvasManager.Instance == null)
            {
                CanvasManager existing = FindObjectOfType<CanvasManager>();
                if (existing == null)
                {
                    Debug.Log("[GameManager] Creating CanvasManager GameObject...");
                    GameObject canvasMgrGO = new GameObject("CanvasManager");
                    canvasMgrGO.AddComponent<CanvasManager>();
                }
                else
                {
                    Debug.Log($"[GameManager] Found existing CanvasManager: {existing.name}");
                }
            }
            else
            {
                Debug.Log($"[GameManager] CanvasManager.Instance already exists: {CanvasManager.Instance.name}");
            }
            
            // Ensure Canvas exists
            Debug.Log("[GameManager] Step 2: Ensuring Canvas exists...");
            Canvas canvas = CanvasManager.GetCanvas();
            Debug.Log($"[GameManager] Canvas verified: {canvas.name}");
            EnsureUIManager();
            
            // Initialize services (before UI)
            Debug.Log("[GameManager] Step 3: Initializing Services...");
            // Check if instances already exist in scene (not from prefabs)
            
            // NetworkService
            Debug.Log("[GameManager]   - NetworkService...");
            if (NetworkService.Instance == null)
            {
                NetworkService existing = FindObjectOfType<NetworkService>();
                if (existing == null)
                {
                    if (networkServicePrefab != null)
                    {
                        Instantiate(networkServicePrefab);
                    }
                    else
                    {
                        // Create NetworkService programmatically if prefab not assigned
                        GameObject networkServiceGO = new GameObject("NetworkService");
                        networkServiceGO.AddComponent<NetworkService>();
                        DontDestroyOnLoad(networkServiceGO);
                    }
                }
            }

            // GameStateManager
            Debug.Log("[GameManager]   - GameStateManager...");
            if (GameStateManager.Instance == null)
            {
                GameStateManager existing = FindObjectOfType<GameStateManager>();
                if (existing == null)
                {
                    if (gameStateManagerPrefab != null)
                    {
                        Instantiate(gameStateManagerPrefab);
                    }
                    else
                    {
                        // Create GameStateManager programmatically if prefab not assigned
                        GameObject gameStateMgrGO = new GameObject("GameStateManager");
                        gameStateMgrGO.AddComponent<GameStateManager>();
                        DontDestroyOnLoad(gameStateMgrGO);
                    }
                }
            }

            // MilestoneManager
            Debug.Log("[GameManager]   - MilestoneManager...");
            if (MilestoneManager.Instance == null)
            {
                MilestoneManager existing = FindObjectOfType<MilestoneManager>();
                if (existing == null)
                {
                    if (milestoneManagerPrefab != null)
                    {
                        Instantiate(milestoneManagerPrefab);
                    }
                    else
                    {
                        // Create MilestoneManager programmatically if prefab not assigned
                        GameObject milestoneMgrGO = new GameObject("MilestoneManager");
                        milestoneMgrGO.AddComponent<MilestoneManager>();
                        DontDestroyOnLoad(milestoneMgrGO);
                    }
                }
            }
            
            // Ensure services are ready before UI initialization
            // Small delay to ensure Awake() methods complete
            EnsureTestModeManager();
            StartCoroutine(InitializeUIAfterServices());
        }
        
        private System.Collections.IEnumerator InitializeUIAfterServices()
        {
            // Wait one frame to ensure all service Awake() methods complete
            yield return null;
            
            // Verify services are ready
            Debug.Log("[GameManager] Step 4: Verifying services...");
            bool networkServiceReady = NetworkService.Instance != null;
            bool gameStateManagerReady = GameStateManager.Instance != null;
            bool milestoneManagerReady = MilestoneManager.Instance != null;
            
            Debug.Log($"[GameManager]   - NetworkService: {(networkServiceReady ? "✓ Ready" : "✗ NULL")}");
            Debug.Log($"[GameManager]   - GameStateManager: {(gameStateManagerReady ? "✓ Ready" : "✗ NULL")}");
            Debug.Log($"[GameManager]   - MilestoneManager: {(milestoneManagerReady ? "✓ Ready" : "✗ NULL")}");
            
            if (!networkServiceReady || !gameStateManagerReady)
            {
                Debug.LogError("[GameManager] ✗ CRITICAL: Critical services failed to initialize!");
                yield break;
            }

            // Initialize UI after services are ready
            Debug.Log("[GameManager] Step 5: Initializing UI...");
            UI.MainHUD existingHUD = FindObjectOfType<UI.MainHUD>();
            if (existingHUD == null)
            {
                Debug.Log("[GameManager] Creating MainHUD...");
                GameObject hudGO = new GameObject("MainHUD");
                UI.MainHUD hud = hudGO.AddComponent<UI.MainHUD>();
                
                // Link CityUI if exists
                UI.CityUI cityUI = FindObjectOfType<UI.CityUI>();
                if (cityUI == null && cityUIPrefab != null)
                {
                    Debug.Log("[GameManager] Instantiating CityUI from prefab...");
                    cityUI = Instantiate(cityUIPrefab).GetComponent<UI.CityUI>();
                }
                hud.cityUI = cityUI;

                // Link MilestoneUI if exists
                UI.MilestoneUI milestoneUI = FindObjectOfType<UI.MilestoneUI>();
                if (milestoneUI == null && milestoneUIPrefab != null)
                {
                    Debug.Log("[GameManager] Instantiating MilestoneUI from prefab...");
                    milestoneUI = Instantiate(milestoneUIPrefab).GetComponent<UI.MilestoneUI>();
                }
                hud.milestoneUI = milestoneUI;
                
                Debug.Log("[GameManager] MainHUD created successfully.");
            }
            else
            {
                Debug.Log($"[GameManager] MainHUD already exists: {existingHUD.name}");
            }
            
            Debug.Log("[GameManager] ===== Initialization Complete =====");
            Debug.Log("[GameManager] All services initialized. UI can now safely initialize.");
        }

        private void EnsureTestModeManager()
        {
            bool shouldEnable = autoEnableTestModeInPlayerBuilds;
#if UNITY_EDITOR
            shouldEnable = autoEnableTestModeInEditor;
#endif

            if (!shouldEnable)
            {
                return;
            }

            TestModeManager existing = FindObjectOfType<TestModeManager>();
            if (existing == null)
            {
                if (testModeManagerPrefab != null)
                {
                    existing = Instantiate(testModeManagerPrefab);
                }
                else
                {
                    GameObject testModeGO = new GameObject("TestModeManager");
                    existing = testModeGO.AddComponent<TestModeManager>();
                }
            }

            existing.enableTestMode = true;
            existing.simulateTickProgression = true;
        }

        private void EnsureUIManager()
        {
            if (UI.UIManager.Instance != null)
            {
                return;
            }

            GameObject managerGO = new GameObject("UIManager");
            managerGO.AddComponent<UI.UIManager>();
        }
    }
}


