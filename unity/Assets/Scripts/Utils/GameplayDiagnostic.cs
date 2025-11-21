using UnityEngine;
using KingdomsPersist.Managers;
using KingdomsPersist.UI;
using KingdomsPersist.Services;
using KingdomsPersist.Models;

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Diagnostic tool to check why the game might not be playable
    /// </summary>
    public class GameplayDiagnostic : MonoBehaviour
    {
        [ContextMenu("Run Gameplay Diagnostics")]
        public void RunDiagnostics()
        {
            Debug.Log("\n========== GAMEPLAY DIAGNOSTICS ==========");
            
            CheckLoginStatus();
            CheckCityState();
            CheckUI();
            CheckPolling();
            CheckNetwork();
            
            Debug.Log("==========================================\n");
        }
        
        private void CheckLoginStatus()
        {
            Debug.Log("\n--- Login Status ---");
            if (GameStateManager.Instance == null)
            {
                Debug.LogError("❌ GameStateManager.Instance is NULL!");
                return;
            }
            
            string userId = GameStateManager.Instance.userId;
            string cityId = GameStateManager.Instance.cityId;
            
            if (string.IsNullOrEmpty(userId))
            {
                Debug.LogWarning("⚠️ User NOT logged in! userId is empty.");
                Debug.Log("   → User needs to login first!");
            }
            else
            {
                Debug.Log($"✓ User logged in: {userId}");
            }
            
            if (string.IsNullOrEmpty(cityId))
            {
                Debug.LogWarning("⚠️ City ID is empty! Cannot fetch city state.");
                Debug.Log("   → Login should set cityId automatically.");
            }
            else
            {
                Debug.Log($"✓ City ID: {cityId}");
            }
        }
        
        private void CheckCityState()
        {
            Debug.Log("\n--- City State ---");
            if (GameStateManager.Instance == null)
            {
                Debug.LogError("❌ GameStateManager.Instance is NULL!");
                return;
            }
            
            var state = GameStateManager.Instance.currentCityState;
            if (state == null)
            {
                Debug.LogWarning("⚠️ City state is NULL! UI won't show anything.");
                Debug.Log("   → Try calling GameStateManager.Instance.RefreshCityState()");
            }
            else
            {
                Debug.Log($"✓ City state exists. Version: {state.version}");
                Debug.Log($"  Resources: {state.resources?.Count ?? 0}");
                Debug.Log($"  Buildings: {state.buildings?.Count ?? 0}");
                
                int queueCount = 0;
                if (state.queues != null)
                {
                    queueCount = (state.queues.build?.Count ?? 0) + (state.queues.train?.Count ?? 0);
                }
                Debug.Log($"  Queues: {queueCount} (Build: {state.queues?.build?.Count ?? 0}, Train: {state.queues?.train?.Count ?? 0})");
            }
        }
        
        private void CheckUI()
        {
            Debug.Log("\n--- UI Status ---");
            
            CityUI cityUI = FindObjectOfType<CityUI>();
            if (cityUI == null)
            {
                Debug.LogError("❌ CityUI not found in scene!");
                return;
            }
            
            Debug.Log("✓ CityUI found");
            
            if (cityUI.resourcesContainer == null)
            {
                Debug.LogError("❌ ResourcesContainer is NULL! Resources won't display!");
            }
            else
            {
                Debug.Log($"✓ ResourcesContainer exists. Child count: {cityUI.resourcesContainer.childCount}");
            }
            
            if (cityUI.buildingsContainer == null)
            {
                Debug.LogError("❌ BuildingsContainer is NULL! Buildings won't display!");
            }
            else
            {
                Debug.Log($"✓ BuildingsContainer exists. Child count: {cityUI.buildingsContainer.childCount}");
            }
            
            if (cityUI.tickLabel == null)
            {
                Debug.LogWarning("⚠️ Tick label is NULL");
            }
            else
            {
                Debug.Log($"✓ Tick label exists: '{cityUI.tickLabel.text}'");
            }
        }
        
        private void CheckPolling()
        {
            Debug.Log("\n--- Polling Status ---");
            if (GameStateManager.Instance == null)
            {
                Debug.LogError("❌ GameStateManager.Instance is NULL!");
                return;
            }
            
            float interval = GameStateManager.Instance.statePollInterval;
            Debug.Log($"Poll interval: {interval} seconds");
            
            if (interval > 5f)
            {
                Debug.LogWarning($"⚠️ Poll interval is {interval}s - this is quite slow!");
                Debug.Log("   → Consider reducing to 2-3 seconds for better responsiveness.");
            }
            else
            {
                Debug.Log("✓ Poll interval is reasonable");
            }
        }
        
        private void CheckNetwork()
        {
            Debug.Log("\n--- Network Status ---");
            if (NetworkService.Instance == null)
            {
                Debug.LogError("❌ NetworkService.Instance is NULL!");
                return;
            }
            
            Debug.Log("✓ NetworkService exists");
            Debug.Log($"  Base URL: {NetworkService.Instance.baseUrl}");
        }
        
        private void Start()
        {
            // Auto-run diagnostics after a short delay
            Invoke(nameof(RunDiagnostics), 2f);
        }
    }
}

