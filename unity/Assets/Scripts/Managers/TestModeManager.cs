using UnityEngine;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;

namespace KingdomsPersist.Managers
{
    /// <summary>
    /// Test mode that generates mock data when backend is not available.
    /// This allows testing the UI without a running backend server.
    /// </summary>
    public class TestModeManager : MonoBehaviour
    {
        public static TestModeManager Instance { get; private set; }

        [Header("Test Mode")]
        public bool enableTestMode = true;
        public bool simulateTickProgression = true;

        [Header("Network Override")]
        [Tooltip("Skip all backend calls while Test Mode is enabled and respond with mock data instead.")]
        public bool interceptNetworkCalls = true;
        [Tooltip("Log whenever a mock command is applied while running in Test Mode.")]
        public bool logHandledCommands = true;
        
        private float tickTimer = 0f;
        private int mockTick = 1000;

        public bool ShouldInterceptNetwork => enableTestMode && interceptNetworkCalls;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Start()
        {
            if (enableTestMode && GameStateManager.Instance != null)
            {
                // Generate initial mock data
                GenerateMockCityState();
                GenerateMockRealmTime();
            }
        }

        private void Update()
        {
            if (!enableTestMode || !simulateTickProgression)
            {
                return;
            }

            tickTimer += Time.deltaTime;
            if (tickTimer < 1f)
            {
                return;
            }

            tickTimer = 0f;
            mockTick++;
                    
            // Simulate resource production
            if (GameStateManager.Instance?.currentCityState != null)
            {
                SimulateProduction();
                GenerateMockRealmTime();
                        
                // Trigger UI update using public method
                GameStateManager.Instance.TriggerCityStateUpdate(GameStateManager.Instance.currentCityState);
            }
        }

        public bool TryHandleCommand(Command command)
        {
            if (!ShouldInterceptNetwork || command == null)
            {
                return false;
            }

            CityState state = EnsureCityState();
            if (state == null)
            {
                return false;
            }

            bool handled = false;
            switch (command)
            {
                case BuildCommand buildCommand:
                    handled = HandleBuildCommand(state, buildCommand);
                    break;
                case TrainCommand trainCommand:
                    handled = HandleTrainCommand(state, trainCommand);
                    break;
                case LawSetCommand lawCommand:
                    handled = HandleLawCommand(state, lawCommand);
                    break;
                default:
                    handled = false;
                    break;
            }

            if (handled)
            {
                MarkStateChanged(state);
                if (logHandledCommands)
                {
                    Debug.Log($"[TestMode] Handled offline command: {command.type}");
                }
            }

            return handled;
        }

        private void GenerateMockCityState()
        {
            var state = new CityState
            {
                ticks = mockTick,
                version = 1,
                seed = 12345,
                resources = new System.Collections.Generic.Dictionary<string, float>
                {
                    { "grain", 500f },
                    { "timber", 200f },
                    { "stone", 100f },
                    { "ore", 50f },
                    { "coins", 1000f }
                },
                labor = new LaborState
                {
                    free = 30,
                    assigned = new System.Collections.Generic.Dictionary<string, int>
                    {
                        { "fields", 20 },
                        { "lumber", 10 }
                    }
                },
                buildings = new System.Collections.Generic.List<Building>
                {
                    new Building { id = "b_fields_1", lvl = 2, slot = 1 },
                    new Building { id = "b_lumber_1", lvl = 1, slot = 2 },
                    new Building { id = "b_kiln_1", lvl = 1, slot = 3 }
                },
                laws = new Laws
                {
                    tax = 0.08f,
                    market_fee = 0.02f,
                    rationing = "normal"
                },
                units = new System.Collections.Generic.Dictionary<string, int>
                {
                    { "levy", 50 },
                    { "pikes", 10 }
                },
                heroes = new System.Collections.Generic.List<CityHero>
                {
                    new CityHero { id = "H#1", cmd = 3, crf = 2, cng = 1, traits = new System.Collections.Generic.List<string> { "Stoic", "Forager" } }
                },
                queues = new Queues
                {
                    build = new System.Collections.Generic.List<BuildCommand>(),
                    train = new System.Collections.Generic.List<TrainCommand>()
                }
            };

            GameStateManager.Instance.currentCityState = state;
            GameStateManager.Instance.currentVersion = state.version;

            if (string.IsNullOrEmpty(GameStateManager.Instance.userId))
            {
                GameStateManager.Instance.userId = "test-user";
            }
            if (string.IsNullOrEmpty(GameStateManager.Instance.cityId))
            {
                GameStateManager.Instance.cityId = "test-city";
            }
            if (string.IsNullOrEmpty(GameStateManager.Instance.kingdomId))
            {
                GameStateManager.Instance.kingdomId = "test-kingdom";
            }

            // Trigger UI update using public method
            GameStateManager.Instance.TriggerCityStateUpdate(state);
        }

        private void GenerateMockRealmTime()
        {
            var realmTime = new RealmTimeResponse
            {
                tick = mockTick,
                iso_time = System.DateTime.UtcNow.ToString("o")
            };

            GameStateManager.Instance.realmTime = realmTime;

            // Trigger UI update using public method
            GameStateManager.Instance.TriggerRealmTimeUpdate(realmTime);
        }

        private void SimulateProduction()
        {
            if (GameStateManager.Instance?.currentCityState == null) return;

            var state = GameStateManager.Instance.currentCityState;

            // Simulate grain production from fields
            if (state.buildings.Exists(b => b.id.StartsWith("b_fields")))
            {
                state.resources["grain"] = (state.resources.ContainsKey("grain") ? state.resources["grain"] : 0) + 2.5f;
            }

            // Simulate timber production from lumberyard
            if (state.buildings.Exists(b => b.id.StartsWith("b_lumber")))
            {
                state.resources["timber"] = (state.resources.ContainsKey("timber") ? state.resources["timber"] : 0) + 1.5f;
            }

            // Simulate stone production (if we had a quarry)
            if (state.buildings.Exists(b => b.id.StartsWith("b_quarry")))
            {
                state.resources["stone"] = (state.resources.ContainsKey("stone") ? state.resources["stone"] : 0) + 0.5f;
            }

            state.ticks = mockTick;
            state.version++;
            GameStateManager.Instance.currentVersion = state.version;
        }

        private CityState EnsureCityState()
        {
            if (GameStateManager.Instance == null)
            {
                return null;
            }

            if (GameStateManager.Instance.currentCityState == null)
            {
                GenerateMockCityState();
            }

            return GameStateManager.Instance.currentCityState;
        }

        private bool HandleBuildCommand(CityState state, BuildCommand command)
        {
            if (state.buildings == null)
            {
                state.buildings = new System.Collections.Generic.List<Building>();
            }

            if (command.slot >= 0)
            {
                state.buildings.RemoveAll(b => b.slot.HasValue && b.slot.Value == command.slot);
            }

            string buildingId = $"b_{command.building.ToLower()}_{state.buildings.Count + 1}";
            state.buildings.Add(new Building
            {
                id = buildingId,
                lvl = 1,
                slot = command.slot
            });

            if (state.resources == null)
            {
                state.resources = new System.Collections.Generic.Dictionary<string, float>();
            }

            if (!state.resources.ContainsKey("coins"))
            {
                state.resources["coins"] = 1000f;
            }

            state.resources["coins"] = Mathf.Max(0f, state.resources["coins"] - 50f);

            if (state.queues == null)
            {
                state.queues = new Queues();
            }

            state.queues.build ??= new System.Collections.Generic.List<BuildCommand>();
            state.queues.build.Add(command);

            return true;
        }

        private bool HandleTrainCommand(CityState state, TrainCommand command)
        {
            if (state.units == null)
            {
                state.units = new System.Collections.Generic.Dictionary<string, int>();
            }

            if (!state.units.ContainsKey(command.unit))
            {
                state.units[command.unit] = 0;
            }
            state.units[command.unit] += Mathf.Max(1, command.qty);

            if (state.queues == null)
            {
                state.queues = new Queues();
            }

            state.queues.train ??= new System.Collections.Generic.List<TrainCommand>();
            state.queues.train.Add(command);

            return true;
        }

        private bool HandleLawCommand(CityState state, LawSetCommand command)
        {
            if (state.laws == null)
            {
                state.laws = new Laws();
            }

            if (command.tax.HasValue)
            {
                state.laws.tax = command.tax.Value;
            }

            if (command.market_fee.HasValue)
            {
                state.laws.market_fee = command.market_fee.Value;
            }

            if (!string.IsNullOrEmpty(command.rationing))
            {
                state.laws.rationing = command.rationing;
            }

            return true;
        }

        private void MarkStateChanged(CityState state)
        {
            if (state == null || GameStateManager.Instance == null)
            {
                return;
            }

            state.version++;
            GameStateManager.Instance.currentVersion = state.version;
            GameStateManager.Instance.TriggerCityStateUpdate(state);
        }
    }
}

