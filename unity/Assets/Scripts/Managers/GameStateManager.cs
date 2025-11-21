using System;
using UnityEngine;
using KingdomsPersist.Models;
using KingdomsPersist.Services;
using KingdomsPersist.UI;

namespace KingdomsPersist.Managers
{
    public class GameStateManager : MonoBehaviour
    {
        public static GameStateManager Instance { get; private set; }

        [Header("Game State")]
        public string userId = "";
        public string cityId = "";
        public string kingdomId = "";
        public CityState currentCityState;
        public int currentVersion = 0;
        public RealmTimeResponse realmTime;
        private const string LogPrefix = "[GameStateManager]";

        [Header("Polling")]
        public float statePollInterval = 2f; // Poll every 2 seconds for responsive gameplay
        public float timePollInterval = 10f; // Poll realm time every 10 seconds

        private float statePollTimer = 0f;
        private float timePollTimer = 0f;
        private bool hasLoggedNetworkBypass = false;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Initial state fetch (only when credentials already exist)
            if (HasCityCredentials)
            {
                RefreshCityState();
            }
            if (HasUserCredentials)
            {
                RefreshRealmTime();
            }

            // Subscribe to milestone events
            if (MilestoneManager.Instance != null)
            {
                MilestoneManager.Instance.OnNewMilestoneAchieved += OnNewMilestoneAchieved;
            }
        }

        private void OnDestroy()
        {
            if (MilestoneManager.Instance != null)
            {
                MilestoneManager.Instance.OnNewMilestoneAchieved -= OnNewMilestoneAchieved;
            }
        }

        private void OnNewMilestoneAchieved(Models.Milestone milestone)
        {
            if (milestone == null) return;

            string notification = $"New Milestone Achieved: {milestone.milestone_type}!";
            if (milestone.reward_coins > 0)
            {
                notification += $" Reward: {milestone.reward_coins} coins";
            }
            if (milestone.reward_gems > 0)
            {
                notification += $" {milestone.reward_gems} gems";
            }

            Debug.Log(notification);
            OnMilestoneNotification?.Invoke(notification);
        }

        private void Update()
        {
            if (HasCityCredentials && !ShouldBypassNetworkCalls())
            {
                statePollTimer += Time.deltaTime;
                if (statePollTimer >= statePollInterval)
                {
                    statePollTimer = 0f;
                    RefreshCityState();
                }
            }

            if (HasUserCredentials && !ShouldBypassNetworkCalls())
            {
                timePollTimer += Time.deltaTime;
                if (timePollTimer >= timePollInterval)
                {
                    timePollTimer = 0f;
                    RefreshRealmTime();
                }
            }
        }

        public void RefreshCityState()
        {
            if (!HasCityCredentials)
            {
                return;
            }

            if (ShouldBypassNetworkCalls())
            {
                return;
            }

            if (string.IsNullOrEmpty(cityId))
            {
                Debug.LogWarning("City ID is not set. Cannot refresh city state.");
                return;
            }

            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                return;
            }

            NetworkService.Instance.GetCityState(cityId, (response) =>
            {
                if (response == null || response.state == null)
                {
                    Debug.LogError("Received null response or state from server");
                    return;
                }
                
                // Always update on first load, or if version changed
                bool shouldUpdate = currentCityState == null || response.version > currentVersion;
                
                if (shouldUpdate)
                {
                    currentCityState = response.state;
                    currentVersion = response.version;
                    OnCityStateUpdated?.Invoke(currentCityState);
                    Debug.Log($"[GameStateManager] City state updated. Version: {currentVersion}, Resources: {response.state.resources?.Count ?? 0}");
                }
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch city state: {error}");
            }, userId);
        }

        public void RefreshRealmTime()
        {
            if (!HasUserCredentials)
            {
                return;
            }

            if (ShouldBypassNetworkCalls())
            {
                return;
            }

            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                return;
            }

            NetworkService.Instance.GetRealmTime((response) =>
            {
                if (response == null)
                {
                    Debug.LogError("Received null response from server");
                    return;
                }
                
                realmTime = response;
                OnRealmTimeUpdated?.Invoke(response);
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch realm time: {error}");
            }, userId);
        }

        public void SubmitCommand(Command command, Action<bool> onComplete = null)
        {
            if (command == null)
            {
                Debug.LogError("Cannot submit null command");
                onComplete?.Invoke(false);
                return;
            }

            bool bypassNetwork = ShouldBypassNetworkCalls();

            if (TestModeManager.Instance != null && TestModeManager.Instance.TryHandleCommand(command))
            {
                onComplete?.Invoke(true);
                return;
            }

            if (bypassNetwork)
            {
                Debug.LogWarning($"[GameStateManager] Test mode active, but no local simulation implemented for command type '{command.type}'.");
                onComplete?.Invoke(false);
                return;
            }

            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                onComplete?.Invoke(false);
                return;
            }

            if (!HasCityCredentials)
            {
                Debug.LogError("City credentials are not set. Cannot submit command.");
                LoginUI.PromptLogin("Please log in to issue commands.");
                onComplete?.Invoke(false);
                return;
            }

            NetworkService.Instance.SubmitCommand(cityId, command, (response) =>
            {
                if (response == null)
                {
                    Debug.LogError("Received null response from server");
                    onComplete?.Invoke(false);
                    return;
                }
                
                if (response.accepted)
                {
                    Debug.Log($"Command accepted: {response.command_id}");
                    // Immediately refresh state to show changes
                    RefreshCityState();
                    // Also refresh again after a short delay to catch any delayed updates
                    Invoke(nameof(RefreshCityState), 1f);
                    onComplete?.Invoke(true);
                }
                else
                {
                    Debug.LogError($"Command rejected: {response.error ?? "Unknown error"}");
                    onComplete?.Invoke(false);
                }
            }, (error) =>
            {
                Debug.LogError($"Command failed: {error}");
                onComplete?.Invoke(false);
            }, userId);
        }

        // Events
        public event Action<CityState> OnCityStateUpdated;
        public event Action<RealmTimeResponse> OnRealmTimeUpdated;
        public event Action<string> OnMilestoneNotification; // Notification message

        // Public methods for test mode to trigger updates
        public void TriggerCityStateUpdate(CityState state)
        {
            if (state != null)
            {
                currentCityState = state;
                currentVersion = state.version;
                OnCityStateUpdated?.Invoke(state);
            }
        }

        public void TriggerRealmTimeUpdate(RealmTimeResponse time)
        {
            if (time != null)
            {
                realmTime = time;
                OnRealmTimeUpdated?.Invoke(time);
            }
        }

        private bool ShouldBypassNetworkCalls()
        {
            bool shouldBypass = TestModeManager.Instance != null && TestModeManager.Instance.ShouldInterceptNetwork;
            if (shouldBypass && !hasLoggedNetworkBypass)
            {
                Debug.Log("[GameStateManager] Test mode active - skipping backend network calls.");
                hasLoggedNetworkBypass = true;
            }
            return shouldBypass;
        }

        public bool HasCityCredentials => !string.IsNullOrEmpty(cityId) && !string.IsNullOrEmpty(userId);
        public bool HasUserCredentials => !string.IsNullOrEmpty(userId);

        public void SetUserContext(string newUserId, string newCityId = null, string newKingdomId = null)
        {
            if (string.IsNullOrEmpty(newUserId))
            {
                Debug.LogWarning($"{LogPrefix} Attempted to set empty user context.");
                return;
            }

            bool userChanged = !string.Equals(userId, newUserId, StringComparison.Ordinal);
            userId = newUserId;

            if (!string.IsNullOrEmpty(newCityId))
            {
                cityId = newCityId;
            }

            if (!string.IsNullOrEmpty(newKingdomId))
            {
                kingdomId = newKingdomId;
            }

            Debug.Log($"{LogPrefix} User context set. UserId={userId}, CityId={cityId}, KingdomId={kingdomId}");

            if (userChanged)
            {
                currentCityState = null;
                currentVersion = 0;
            }

            statePollTimer = 0f;
            timePollTimer = 0f;

            if (HasUserCredentials)
            {
                RefreshRealmTime();
                if (MilestoneManager.Instance != null)
                {
                    MilestoneManager.Instance.RefreshMilestones();
                }
            }

            if (HasCityCredentials)
            {
                RefreshCityState();
            }
        }

        public void ClearUserContext()
        {
            userId = "";
            cityId = "";
            kingdomId = "";
            currentCityState = null;
            currentVersion = 0;
            realmTime = null;
            Debug.Log($"{LogPrefix} User context cleared.");
        }
    }
}

