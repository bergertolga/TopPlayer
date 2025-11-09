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
        [Header("Test Mode")]
        public bool enableTestMode = true;
        public bool simulateTickProgression = true;
        
        private float tickTimer = 0f;
        private int mockTick = 1000;

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
            if (enableTestMode && simulateTickProgression)
            {
                tickTimer += Time.deltaTime;
                if (tickTimer >= 1f) // Update every second
                {
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
            }
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
                heroes = new System.Collections.Generic.List<Hero>
                {
                    new Hero { id = "H#1", cmd = 3, crf = 2, cng = 1, traits = new System.Collections.Generic.List<string> { "Stoic", "Forager" } }
                },
                queues = new Queues
                {
                    build = new System.Collections.Generic.List<BuildCommand>(),
                    train = new System.Collections.Generic.List<TrainCommand>()
                }
            };

            GameStateManager.Instance.currentCityState = state;
            GameStateManager.Instance.currentVersion = state.version;

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
    }
}

