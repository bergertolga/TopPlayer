using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;

namespace KingdomsPersist.UI
{
    public class CityUI : MonoBehaviour
    {
        [Header("UI References")]
        public TextMeshProUGUI tickLabel;
        public TextMeshProUGUI versionLabel;
        public Transform resourcesContainer;
        public Transform buildingsContainer;
        public Transform queuesContainer;
        public GameObject resourcePrefab;
        public GameObject buildingPrefab;
        public GameObject queueItemPrefab;

        [Header("Build Panel")]
        public GameObject buildPanel;
        public TMP_Dropdown buildingDropdown;
        public TMP_InputField slotInput;
        public Button buildButton;

        private void Start()
        {
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.OnCityStateUpdated += UpdateUI;
                GameStateManager.Instance.OnRealmTimeUpdated += UpdateTickDisplay;
            }
            else
            {
                Debug.LogError("GameStateManager.Instance is null. Make sure GameStateManager is initialized before CityUI.");
            }

            if (buildButton != null)
            {
                buildButton.onClick.AddListener(OnBuildClicked);
            }
        }

        private void OnDestroy()
        {
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.OnCityStateUpdated -= UpdateUI;
                GameStateManager.Instance.OnRealmTimeUpdated -= UpdateTickDisplay;
            }
        }

        private void UpdateTickDisplay(RealmTimeResponse time)
        {
            if (time == null) return;
            
            if (tickLabel != null)
            {
                tickLabel.text = $"Tick: {time.tick}";
            }
        }

        private void UpdateUI(CityState state)
        {
            if (state == null) return;

            // Update version
            if (versionLabel != null)
            {
                versionLabel.text = $"Version: {state.version}";
            }

            // Update resources
            UpdateResourcesDisplay(state.resources);

            // Update buildings
            UpdateBuildingsDisplay(state.buildings);

            // Update queues
            UpdateQueuesDisplay(state.queues);
        }

        private void UpdateResourcesDisplay(System.Collections.Generic.Dictionary<string, float> resources)
        {
            if (resourcesContainer == null)
            {
                Debug.LogWarning("ResourcesContainer is null. Cannot display resources.");
                return;
            }

            // Clear existing
            foreach (Transform child in resourcesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create resource entries directly (no prefab needed)
            foreach (var kvp in resources)
            {
                CreateResourceItem(kvp.Key, kvp.Value);
            }
        }

        private void CreateResourceItem(string resourceName, float amount)
        {
            GameObject item = new GameObject($"Resource_{resourceName}");
            item.transform.SetParent(resourcesContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(200, 30);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            bg.color = new Color(0.2f, 0.2f, 0.2f, 1f);

            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(item.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.offsetMin = new Vector2(10, 0);
            textRect.offsetMax = new Vector2(-10, 0);

            TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
            text.text = $"{resourceName}: {amount:F1}";
            text.fontSize = 14;
            text.color = Color.white;
            text.alignment = TextAlignmentOptions.Left;
        }

        private void UpdateBuildingsDisplay(System.Collections.Generic.List<Building> buildings)
        {
            if (buildingsContainer == null)
            {
                Debug.LogWarning("BuildingsContainer is null. Cannot display buildings.");
                return;
            }

            // Clear existing
            foreach (Transform child in buildingsContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create building entries directly
            foreach (var building in buildings)
            {
                CreateBuildingItem(building.id, building.lvl);
            }
        }

        private void CreateBuildingItem(string buildingId, int level)
        {
            GameObject item = new GameObject($"Building_{buildingId}");
            item.transform.SetParent(buildingsContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(200, 30);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            bg.color = new Color(0.2f, 0.2f, 0.3f, 1f);

            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(item.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.offsetMin = new Vector2(10, 0);
            textRect.offsetMax = new Vector2(-10, 0);

            TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
            text.text = $"{buildingId} (Lvl {level})";
            text.fontSize = 14;
            text.color = Color.white;
            text.alignment = TextAlignmentOptions.Left;
        }

        private void UpdateQueuesDisplay(Queues queues)
        {
            if (queuesContainer == null)
            {
                Debug.LogWarning("QueuesContainer is null. Cannot display queues.");
                return;
            }

            // Clear existing
            foreach (Transform child in queuesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Build queue
            foreach (var build in queues.build)
            {
                CreateQueueItem($"Building: {build.building} (Slot {build.slot})");
            }

            // Train queue
            foreach (var train in queues.train)
            {
                CreateQueueItem($"Training: {train.qty}x {train.unit}");
            }
        }

        private void CreateQueueItem(string text)
        {
            GameObject item = new GameObject("QueueItem");
            item.transform.SetParent(queuesContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(200, 30);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            bg.color = new Color(0.3f, 0.3f, 0.2f, 1f);

            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(item.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.offsetMin = new Vector2(10, 0);
            textRect.offsetMax = new Vector2(-10, 0);

            TextMeshProUGUI textComp = textGO.AddComponent<TextMeshProUGUI>();
            textComp.text = text;
            textComp.fontSize = 14;
            textComp.color = Color.white;
            textComp.alignment = TextAlignmentOptions.Left;
        }

        private void OnBuildClicked()
        {
            if (buildingDropdown == null || slotInput == null)
            {
                Debug.LogWarning("Building dropdown or slot input is not assigned.");
                return;
            }

            if (GameStateManager.Instance == null)
            {
                Debug.LogError("GameStateManager.Instance is null. Cannot submit build command.");
                return;
            }

            if (buildingDropdown.options == null || buildingDropdown.options.Count == 0)
            {
                Debug.LogWarning("Building dropdown has no options.");
                return;
            }

            string buildingType = buildingDropdown.options[buildingDropdown.value].text;
            if (int.TryParse(slotInput.text, out int slot))
            {
                var command = new BuildCommand
                {
                    building = buildingType,
                    slot = slot
                };

                GameStateManager.Instance.SubmitCommand(command, (success) =>
                {
                    if (success)
                    {
                        Debug.Log("Build command submitted successfully");
                        if (buildPanel != null)
                        {
                            buildPanel.SetActive(false);
                        }
                    }
                });
            }
            else
            {
                Debug.LogWarning($"Invalid slot number: {slotInput.text}");
            }
        }
    }
}

