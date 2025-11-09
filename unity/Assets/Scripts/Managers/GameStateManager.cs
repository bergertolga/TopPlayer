using System;
using UnityEngine;
using KingdomsPersist.Models;
using KingdomsPersist.Services;

namespace KingdomsPersist.Managers
{
    public class GameStateManager : MonoBehaviour
    {
        public static GameStateManager Instance { get; private set; }

        [Header("Game State")]
        public string cityId = "city-1"; // Set this from login/registration
        public string kingdomId = "kingdom-1";
        public CityState currentCityState;
        public int currentVersion = 0;
        public RealmTimeResponse realmTime;

        [Header("Polling")]
        public float statePollInterval = 2f; // Poll every 2 seconds
        public float timePollInterval = 10f; // Poll realm time every 10 seconds

        private float statePollTimer = 0f;
        private float timePollTimer = 0f;

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
            // Initial state fetch
            RefreshCityState();
            RefreshRealmTime();
        }

        private void Update()
        {
            // Poll for state updates
            statePollTimer += Time.deltaTime;
            if (statePollTimer >= statePollInterval)
            {
                statePollTimer = 0f;
                RefreshCityState();
            }

            // Poll for realm time
            timePollTimer += Time.deltaTime;
            if (timePollTimer >= timePollInterval)
            {
                timePollTimer = 0f;
                RefreshRealmTime();
            }
        }

        public void RefreshCityState()
        {
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
                
                // Only update if version changed (optimistic updates)
                if (response.version > currentVersion)
                {
                    currentCityState = response.state;
                    currentVersion = response.version;
                    OnCityStateUpdated?.Invoke(currentCityState);
                }
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch city state: {error}");
            });
        }

        public void RefreshRealmTime()
        {
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
            });
        }

        public void SubmitCommand(Command command, Action<bool> onComplete = null)
        {
            if (command == null)
            {
                Debug.LogError("Cannot submit null command");
                onComplete?.Invoke(false);
                return;
            }

            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                onComplete?.Invoke(false);
                return;
            }

            if (string.IsNullOrEmpty(cityId))
            {
                Debug.LogError("City ID is not set. Cannot submit command.");
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
                    // Optimistically refresh state after a short delay
                    Invoke(nameof(RefreshCityState), 0.5f);
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
            });
        }

        // Events
        public event Action<CityState> OnCityStateUpdated;
        public event Action<RealmTimeResponse> OnRealmTimeUpdated;

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
    }
}

