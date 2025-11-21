using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Utils;
using KingdomsPersist.UI.Components;
#if UNITY_EDITOR
using UnityEditor;
#endif

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
        private Transform buildOptionsContainer;
        private TextMeshProUGUI buildSelectionLabel;
        private readonly List<Button> buildOptionButtons = new List<Button>();
        private string selectedBuildingType = "FARM";

        private static readonly (string code, string label, string description)[] BuildChoices =
        {
            ("FARM", "Farm", "Produces grain for your citizens."),
            ("LUMBER_MILL", "Lumber Mill", "Generates wood for structures."),
            ("QUARRY", "Quarry", "Cuts stone for advanced upgrades."),
            ("WAREHOUSE", "Warehouse", "Expands storage capacity."),
            ("MARKET", "Market", "Improves trading capability.")
        };

#if UNITY_EDITOR
        private const string ResourcePrefabAssetPath = "Assets/Resources/UI/ResourceItem.prefab";
        private const string BuildingPrefabAssetPath = "Assets/Resources/UI/BuildingItem.prefab";
        private const string QueuePrefabAssetPath = "Assets/Resources/Prefabs/QueueItem.prefab";
#endif

        private class ResourceVisualConfig
        {
            public readonly string DisplayName;
            public readonly string IconPath;
            public readonly Color AccentColor;

            public ResourceVisualConfig(string displayName, string iconPath, Color accentColor)
            {
                DisplayName = displayName;
                IconPath = iconPath;
                AccentColor = accentColor;
            }
        }

        private static readonly Dictionary<string, ResourceVisualConfig> ResourceVisuals = new Dictionary<string, ResourceVisualConfig>(System.StringComparer.OrdinalIgnoreCase)
        {
            { "COINS", new ResourceVisualConfig("Coins", "Icons/Icon_Gold", new Color32(255, 214, 0, 255)) },
            { "WOOD", new ResourceVisualConfig("Wood", "Icons/Icon_Hammer", new Color32(165, 101, 50, 255)) },
            { "STONE", new ResourceVisualConfig("Stone", "Icons/Icon_Nut", new Color32(170, 178, 189, 255)) },
            { "GRAIN", new ResourceVisualConfig("Grain", "Icons/Icon_Food_Meat", new Color32(238, 195, 113, 255)) },
            { "RATIONS", new ResourceVisualConfig("Rations", "Icons/Icon_Food_Can", new Color32(131, 202, 255, 255)) }
        };

        private static readonly string[] PreferredResourceOrder = { "COINS", "WOOD", "STONE", "GRAIN", "RATIONS" };
        private readonly Dictionary<string, Sprite> resourceIconCache = new Dictionary<string, Sprite>(System.StringComparer.OrdinalIgnoreCase);

        private void Awake()
        {
            UIManager.RequireInstance();
            LoadGUIAssets();
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (Application.isPlaying)
            {
                return;
            }

            AutoAssignPrefab(ref resourcePrefab, ResourcePrefabAssetPath);
            AutoAssignPrefab(ref buildingPrefab, BuildingPrefabAssetPath);
            AutoAssignPrefab(ref queueItemPrefab, QueuePrefabAssetPath);
        }

        private void AutoAssignPrefab(ref GameObject target, string assetPath)
        {
            if (target != null || string.IsNullOrEmpty(assetPath))
            {
                return;
            }

            GameObject asset = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
            if (asset != null)
            {
                target = asset;
                EditorUtility.SetDirty(this);
            }
        }
#endif

        private void LoadGUIAssets()
        {
            // Ensure EventSystem exists for UI interactions with correct Input Module
            EventSystemHelper.EnsureEventSystem();

            // Build panel is created lazily inside SetupBuildPanel to avoid bringing in prefabs with missing scripts.
        }


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

            // Setup build panel components
            SetupBuildPanel();
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
            UpdateResources(state.resources);

            // Update buildings
            UpdateBuildings(state.buildings);

            // Update queues
            UpdateQueuesDisplay(state.queues);
        }

        private void UpdateResources(Dictionary<string, float> resources)
        {
            if (resourcesContainer == null)
            {
                Debug.LogWarning("[CityUI] Resources container is not assigned. Please wire it via MainHUD.");
                return;
            }

            if (resources == null || resources.Count == 0)
            {
                ClearContainer(resourcesContainer);
                return;
            }

            ClearContainer(resourcesContainer);

            HashSet<string> shownKeys = new HashSet<string>();
            foreach (string key in PreferredResourceOrder)
            {
                if (resources.TryGetValue(key, out float amount))
                {
                    CreateResourceView(key, amount);
                    shownKeys.Add(key);
                }
            }

            foreach (var kvp in resources)
            {
                if (shownKeys.Contains(kvp.Key))
                {
                    continue;
                }

                CreateResourceView(kvp.Key, kvp.Value);
            }
        }

        private void CreateResourceView(string resourceName, float amount)
        {
            if (string.IsNullOrEmpty(resourceName))
            {
                return;
            }

            GameObject prefab = GetResourceItemPrefab();
            if (prefab == null)
            {
                Debug.LogWarning("[CityUI] Resource prefab could not be loaded.");
                return;
            }

            GameObject instance = Instantiate(prefab, resourcesContainer);
            instance.name = $"Resource_{resourceName}";

            ResourceItemView view = instance.GetComponent<ResourceItemView>();
            if (view == null)
            {
                Debug.LogWarning("[CityUI] ResourceItemView missing on prefab.");
                Destroy(instance);
                return;
            }

            string displayName = FormatResourceName(resourceName);
            Sprite icon = ResolveResourceIcon(resourceName, out Color accentColor, ref displayName);
            string formattedAmount = FormatResourceAmount(amount);

            view.SetData(icon, displayName, formattedAmount, accentColor);

            if (view.NameLabel != null)
            {
                view.NameLabel.fontSize = 36f;
            }
            if (view.AmountLabel != null)
            {
                view.AmountLabel.fontSize = 38f;
            }
        }

        private void UpdateBuildings(System.Collections.Generic.List<Building> buildings)
        {
            if (buildingsContainer == null)
            {
                Debug.LogWarning("[CityUI] Buildings container is not assigned. Please set it via MainHUD.");
                return;
            }

            ClearContainer(buildingsContainer);

            if (buildings == null || buildings.Count == 0)
            {
                return;
            }

            GameObject prefab = GetBuildingItemPrefab();
            if (prefab == null)
            {
                Debug.LogWarning("[CityUI] Building prefab could not be loaded.");
                return;
            }

            foreach (var building in buildings)
            {
                if (building == null)
                {
                    continue;
                }

                GameObject instance = Instantiate(prefab, buildingsContainer);
                instance.name = $"Building_{building.id}";

                BuildingItemView view = instance.GetComponent<BuildingItemView>();
                if (view == null)
                {
                    Debug.LogWarning("[CityUI] BuildingItemView missing on prefab.");
                    Destroy(instance);
                    continue;
                }

                string title = FormatBuildingName(building.id);
                string detail = $"Level {building.lvl}";

                view.SetData(title, detail);

                if (view.TitleLabel != null)
                {
                    view.TitleLabel.fontSize = 38f;
                }

                if (view.DetailLabel != null)
                {
                    view.DetailLabel.fontSize = 28f;
                }
            }
        }

        private void UpdateQueuesDisplay(Queues queues)
        {
            if (queuesContainer == null)
            {
                Debug.LogWarning("QueuesContainer is null. Cannot display queues.");
                return;
            }

            if (queues == null)
            {
                Debug.LogWarning("Queues is null. Cannot display queues.");
                return;
            }

            ClearContainer(queuesContainer);
            bool hasContent = false;

            if (queues.build != null && queues.build.Count > 0)
            {
                CreateQueueHeader("Build Queue");
                foreach (var build in queues.build)
                {
                    string primary = $"{FormatBuildingName(build.building)}";
                    string secondary = $"Slot {build.slot}";
                    CreateQueueItem(primary, secondary, new Color32(255, 204, 128, 255));
                }
                hasContent = true;
            }

            if (queues.train != null && queues.train.Count > 0)
            {
                CreateQueueHeader("Training Queue");
                foreach (var train in queues.train)
                {
                    string primary = $"{train.qty}x {FormatBuildingName(train.unit)}";
                    string secondary = "Training in progress";
                    CreateQueueItem(primary, secondary, new Color32(173, 216, 230, 255));
                }
                hasContent = true;
            }

            if (!hasContent)
            {
                CreateQueueHeader("No active queue items.");
            }
        }

        private void CreateQueueItem(string headline, string detail, Color? accent = null)
        {
            GameObject prefab = GetQueueItemPrefab();
            if (prefab != null)
            {
                GameObject item = Instantiate(prefab, queuesContainer);
                item.name = $"QueueItem_{headline}";
                Image background = item.GetComponent<Image>();
                if (accent.HasValue && background != null)
                {
                    Color baseColor = background.color;
                    Color target = accent.Value;
                    background.color = new Color(target.r / 255f, target.g / 255f, target.b / 255f, baseColor.a > 0 ? baseColor.a : 0.9f);
                }

                TextMeshProUGUI label = item.GetComponentInChildren<TextMeshProUGUI>();
                if (label == null)
                {
                    label = CreateTextLabel(item.transform, "Label", string.Empty, 16f, FontStyles.Bold);
                }
                label.alignment = TextAlignmentOptions.Left;
                label.text = $"<b>{headline}</b>\n<size=18>{detail}</size>";
            }
            else
            {
                GameObject fallback = GUIThemeHelper.CreatePanelCard(queuesContainer, "QueueItem", 64f);
                TextMeshProUGUI textComp = GUIThemeHelper.CreateLabel(fallback.transform, "Text", $"{headline} - {detail}", 15f, FontStyles.Bold, TextAlignmentOptions.Left);
                textComp.color = Color.white;
            }
        }



        private void SetupBuildPanel()
        {
            if (buildPanel == null)
            {
                LoadGUIAssets();
            }

            if (buildPanel == null)
            {
                Canvas canvas = CanvasManager.GetCanvas();
                buildPanel = new GameObject("BuildPanel");
                buildPanel.transform.SetParent(canvas.transform, false);
                RectTransform rect = buildPanel.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(420, 520);
                Image bg = buildPanel.AddComponent<Image>();
                bg.color = new Color(0.1f, 0.1f, 0.15f, 0.95f);
            }

            Transform contentRoot = EnsurePanelContent(buildPanel.transform);

            if (buildSelectionLabel == null)
            {
                buildSelectionLabel = CreateTextLabel(contentRoot, "Title", "Construct Building", 28f, FontStyles.Bold);
                buildSelectionLabel.alignment = TextAlignmentOptions.Left;
            }

            if (buildOptionsContainer == null)
            {
                GameObject optionsGO = new GameObject("BuildOptions", typeof(RectTransform));
                optionsGO.transform.SetParent(contentRoot, false);
                GridLayoutGroup grid = optionsGO.AddComponent<GridLayoutGroup>();
                grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
                grid.constraintCount = 2;
                grid.cellSize = new Vector2(240f, 68f);
                grid.spacing = new Vector2(12f, 12f);
                grid.padding = new RectOffset(10, 10, 10, 10);
                buildOptionsContainer = optionsGO.transform;
                CreateBuildOptionButtons();
            }

            slotInput = slotInput ?? CreateInputField(contentRoot, "SlotInput", "Slot number");
            slotInput.contentType = TMP_InputField.ContentType.IntegerNumber;
            if (string.IsNullOrEmpty(slotInput.text))
            {
                slotInput.text = "0";
            }

            if (buildButton == null)
            {
                buildButton = UIManager.Instance != null
                    ? UIManager.Instance.CreateButton(contentRoot, "Start Build", OnBuildClicked)
                    : CreateFallbackButton(contentRoot, "Start Build", OnBuildClicked);
            }
            else
            {
                buildButton.onClick.RemoveAllListeners();
                buildButton.onClick.AddListener(OnBuildClicked);
            }

            TextMeshProUGUI buttonText = buildButton.GetComponentInChildren<TextMeshProUGUI>();
            if (buttonText != null)
            {
                buttonText.text = "Start Build";
                buttonText.raycastTarget = false;
            }

            PanelHelper.EnsureCloseButton(buildPanel);
            buildPanel.SetActive(false);
            Debug.Log("[CityUI] Build panel setup complete.");
        }

        private void OnBuildClicked()
        {
            if (slotInput == null)
            {
                Debug.LogWarning("Slot input is not assigned.");
                return;
            }

            if (GameStateManager.Instance == null)
            {
                Debug.LogError("GameStateManager.Instance is null. Cannot submit build command.");
                return;
            }

            string buildingType = GetSelectedBuildingType();
            if (string.IsNullOrEmpty(buildingType))
            {
                Debug.LogWarning("No building type selected.");
                return;
            }

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

        private GameObject GetResourceItemPrefab()
        {
            if (resourcePrefab == null)
            {
#if UNITY_EDITOR
                resourcePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(ResourcePrefabAssetPath);
#endif
                if (resourcePrefab == null)
                {
                    resourcePrefab = Resources.Load<GameObject>("UI/ResourceItem");
                }
            }
            return resourcePrefab;
        }

        private GameObject GetBuildingItemPrefab()
        {
            if (buildingPrefab == null)
            {
#if UNITY_EDITOR
                buildingPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(BuildingPrefabAssetPath);
#endif
                if (buildingPrefab == null)
                {
                    buildingPrefab = Resources.Load<GameObject>("UI/BuildingItem");
                }
            }
            return buildingPrefab;
        }

        private GameObject GetQueueItemPrefab()
        {
            if (queueItemPrefab == null)
            {
#if UNITY_EDITOR
                queueItemPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(QueuePrefabAssetPath);
#endif
                if (queueItemPrefab == null)
                {
                    queueItemPrefab = Resources.Load<GameObject>("Prefabs/QueueItem");
                }
            }
            return queueItemPrefab;
        }

        private TextMeshProUGUI CreateTextLabel(Transform parent, string name, string text, float fontSize, FontStyles style)
        {
            GameObject labelGO = new GameObject(name, typeof(RectTransform));
            labelGO.transform.SetParent(parent, false);
            TextMeshProUGUI tmp = labelGO.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = fontSize;
            tmp.fontStyle = style;
            tmp.alignment = TextAlignmentOptions.Left;
            tmp.enableWordWrapping = false;
            return tmp;
        }

        private string FormatResourceName(string resourceKey)
        {
            resourceKey ??= "Resource";
            resourceKey = resourceKey.Replace("_", " ").ToLowerInvariant();
            TextInfo textInfo = CultureInfo.CurrentCulture.TextInfo;
            return textInfo.ToTitleCase(resourceKey);
        }

        private string FormatResourceAmount(float value)
        {
            if (value >= 1_000_000f)
            {
                return $"{value / 1_000_000f:0.##}M";
            }
            if (value >= 1_000f)
            {
                return $"{value / 1_000f:0.##}K";
            }
            return value.ToString("N0");
        }

        private Sprite ResolveResourceIcon(string resourceKey, out Color accentColor, ref string fallbackDisplay)
        {
            if (ResourceVisuals.TryGetValue(resourceKey, out var config))
            {
                accentColor = config.AccentColor;
                if (string.IsNullOrEmpty(fallbackDisplay))
                {
                    fallbackDisplay = config.DisplayName;
                }

                if (!resourceIconCache.TryGetValue(config.IconPath, out Sprite sprite) || sprite == null)
                {
                    sprite = Resources.Load<Sprite>(config.IconPath);
                    if (sprite != null)
                    {
                        resourceIconCache[config.IconPath] = sprite;
                    }
                }

                return sprite;
            }

            accentColor = Color.white;
            fallbackDisplay = FormatResourceName(resourceKey);
            return Resources.Load<Sprite>("Icons/Icon_Gold");
        }

        private Transform EnsurePanelContent(Transform panel)
        {
            Transform content = panel.Find("ContentRoot");
            if (content != null)
            {
                return content;
            }

            GameObject contentGO = new GameObject("ContentRoot", typeof(RectTransform));
            contentGO.transform.SetParent(panel, false);
            RectTransform rect = contentGO.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 0);
            rect.anchorMax = new Vector2(1, 1);
            rect.offsetMin = new Vector2(40, 40);
            rect.offsetMax = new Vector2(-40, -40);
            VerticalLayoutGroup layout = contentGO.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 14;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childAlignment = TextAnchor.UpperLeft;
            return contentGO.transform;
        }

        private void CreateBuildOptionButtons()
        {
            buildOptionButtons.Clear();
            foreach (var choice in BuildChoices)
            {
                var localChoice = choice;
                Button btn = UIManager.Instance != null
                    ? UIManager.Instance.CreateButton(buildOptionsContainer, localChoice.label, () => OnBuildOptionSelected(localChoice.code))
                    : CreateFallbackButton(buildOptionsContainer, localChoice.label, () => OnBuildOptionSelected(localChoice.code));

                btn.name = $"Build_{localChoice.code}";
                TextMeshProUGUI buttonLabel = btn.GetComponentInChildren<TextMeshProUGUI>();
                if (buttonLabel != null)
                {
                    buttonLabel.text = $"{localChoice.label}\n<size=16>{localChoice.description}</size>";
                    buttonLabel.alignment = TextAlignmentOptions.Left;
                }
                buildOptionButtons.Add(btn);
            }

            OnBuildOptionSelected(selectedBuildingType);
        }

        private void OnBuildOptionSelected(string buildingCode)
        {
            selectedBuildingType = buildingCode;
            foreach (Button btn in buildOptionButtons)
            {
                bool active = btn.name.EndsWith(buildingCode);
                ColorBlock colors = btn.colors;
                colors.normalColor = active ? new Color(0.3f, 0.6f, 0.3f, 0.9f) : new Color(0.25f, 0.25f, 0.25f, 0.8f);
                colors.highlightedColor = active ? new Color(0.4f, 0.75f, 0.4f, 1f) : new Color(0.35f, 0.35f, 0.35f, 1f);
                btn.colors = colors;
            }

            if (buildSelectionLabel != null)
            {
                string label = BuildChoices.FirstOrDefault(c => c.code == buildingCode).label ?? FormatBuildingName(buildingCode);
                buildSelectionLabel.text = $"Construct Building\n<size=18>Select a structure type ({label}) and slot to build.</size>";
            }
        }

        private TMP_InputField CreateInputField(Transform parent, string name, string placeholder)
        {
            GameObject prefab = GUIAssetLoader.LoadInputFieldPrefab();
            TMP_InputField field = null;
            if (prefab != null)
            {
                GameObject instance = Instantiate(prefab, parent);
                instance.name = name;
                field = instance.GetComponentInChildren<TMP_InputField>() ?? instance.AddComponent<TMP_InputField>();
            }
            else
            {
                GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(TMP_InputField));
                go.transform.SetParent(parent, false);
                field = go.GetComponent<TMP_InputField>();
                field.textComponent = CreateTextLabel(go.transform, "Text", string.Empty, 20f, FontStyles.Bold);
            }

            if (field != null)
            {
                TMP_Text placeholderLabel = field.placeholder as TMP_Text ?? field.transform.GetComponentInChildren<TMP_Text>();
                if (placeholderLabel != null)
                {
                    placeholderLabel.text = placeholder;
                    placeholderLabel.fontSize = 18f;
                    placeholderLabel.fontStyle = FontStyles.Italic;
                }
            }

            return field;
        }

        private Button CreateFallbackButton(Transform parent, string text, UnityEngine.Events.UnityAction onClick)
        {
            GameObject buttonGO = new GameObject(text.Replace(" ", string.Empty) + "Button", typeof(RectTransform), typeof(Image), typeof(Button));
            buttonGO.transform.SetParent(parent, false);
            Image img = buttonGO.GetComponent<Image>();
            img.color = new Color(0.25f, 0.4f, 0.65f, 0.95f);

            Button button = buttonGO.GetComponent<Button>();
            button.onClick.AddListener(onClick);

            TextMeshProUGUI label = CreateTextLabel(buttonGO.transform, "Text", text, 18f, FontStyles.Bold);
            label.alignment = TextAlignmentOptions.Center;
            label.color = Color.white;
            return button;
        }

        private void ClearContainer(Transform container)
        {
            foreach (Transform child in container)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }
        }

        private void CreateQueueHeader(string headerText)
        {
            TextMeshProUGUI header = CreateTextLabel(queuesContainer, headerText.Replace(" ", string.Empty) + "Header", headerText, 20f, FontStyles.Bold);
            header.color = new Color(0.85f, 0.88f, 1f, 1f);
        }

        private string FormatBuildingName(string rawId)
        {
            if (string.IsNullOrEmpty(rawId))
            {
                return "Unknown";
            }

            string normalized = rawId.Replace("_", " ").ToLowerInvariant();
            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(normalized);
        }

        private string GetSelectedBuildingType()
        {
            if (!string.IsNullOrEmpty(selectedBuildingType))
            {
                return selectedBuildingType;
            }

            if (buildingDropdown != null && buildingDropdown.options.Count > 0)
            {
                return buildingDropdown.options[buildingDropdown.value].text;
            }

            return "FARM";
        }
    }
}

