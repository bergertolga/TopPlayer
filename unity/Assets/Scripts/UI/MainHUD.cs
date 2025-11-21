using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.UI;
using KingdomsPersist.Utils;
using KingdomsPersist.Managers;
using UnityEngine.Serialization;
using UnityEngine.SceneManagement;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace KingdomsPersist.UI
{
    public class MainHUD : MonoBehaviour
    {
        [Header("Layout References")]
        [SerializeField] private RectTransform mainHUDRoot;
        [SerializeField] private RectTransform topBar;
        [SerializeField] private RectTransform resourceBar;
        [SerializeField] private RectTransform contentArea;
        [SerializeField] private RectTransform bottomNavBar;

        [Header("Top Bar")]
        public GameObject topBarPanel;
        public TextMeshProUGUI tickLabel;
        public TextMeshProUGUI versionLabel;
        public Transform resourcesBar;
        [SerializeField] private TextMeshProUGUI topBarCityNameLabel;
        [SerializeField] private TextMeshProUGUI topBarCityLevelLabel;

        [Header("Bottom Navigation")]
        [SerializeField] private Button cityNavButton;
        [SerializeField] private Button heroesNavButton;
        [SerializeField] private Button marketNavButton;
        [SerializeField] private Button adventuresNavButton;
        [SerializeField] private Button routesNavButton;
        [SerializeField] private Button milestonesNavButton;
        [SerializeField] private Button lawsNavButton;
        [SerializeField] private Button trainingNavButton;

        [Header("Content Panels")]
        [SerializeField] private GameObject cityPanel;
        [SerializeField] private GameObject heroesPanel;
        [SerializeField] private GameObject marketPanelRoot;
        [SerializeField] private GameObject adventuresPanel;
        [SerializeField] private GameObject routesPanel;
        [SerializeField] private GameObject milestonesPanel;
        [SerializeField] private GameObject lawsPanelRoot;
        [SerializeField] private GameObject trainingPanelRoot;

        [Header("Action Buttons")]
        public Button buildButton;
        public Button trainButton;
        public Button marketButton;
        public Button lawsButton;
        public Button milestonesButton;
        public Button heroesButton;
        public Button routesButton;

        [Header("Panels")]
        public LoginUI loginUI;
        public CityUI cityUI;
        public MilestoneUI milestoneUI;
        public HeroesUI heroesUI;
        public AdventuresUI adventuresUI;
        public MarketUI marketUI;
        public TrainingUI trainingUI;
        public LawsUI lawsUI;
        public RoutesUI routesUI;
        public DailyRewardsUI dailyRewardsUI;
        public LeaderboardUI leaderboardUI;
        public ExpeditionUI expeditionUI;
        public GameObject buildPanel;
        public GameObject trainingPanel;
        public GameObject marketPanel;
        public GameObject lawsPanel;

        [Header("Instructions")]
        public GameObject instructionsPanel;
        public TextMeshProUGUI instructionsText;

        private readonly Dictionary<HUDPanelType, GameObject> panelLookup = new Dictionary<HUDPanelType, GameObject>();
        private HUDPanelType activePanel = HUDPanelType.City;
        private bool useSceneLayout;

        private void Awake()
        {
            UIManager.RequireInstance();
            Debug.Log("[MainHUD] Awake() called. Preparing HUD...");
            
            // Ensure EventSystem exists FIRST
            EventSystemHelper.EnsureEventSystem();

            useSceneLayout = mainHUDRoot != null && contentArea != null;
            if (useSceneLayout)
            {
                Debug.Log("[MainHUD] Scene-driven HUD detected. Skipping dynamic construction.");
            }
            else
            {
                Debug.Log("[MainHUD] Scene layout not provided. Falling back to dynamic HUD creation.");
                CreateHUD();
                Debug.Log("[MainHUD] HUD creation complete.");
            }
        }

        private void OnEnable()
        {
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.OnCityStateUpdated += UpdateHUD;
                if (GameStateManager.Instance.currentCityState != null)
                {
                    UpdateHUD(GameStateManager.Instance.currentCityState);
                }
            }
        }

        private void OnDisable()
        {
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.OnCityStateUpdated -= UpdateHUD;
            }
        }

        private void Start()
        {
            Debug.Log("[MainHUD] Start() called. Setting up UI panels...");
            
            // Ensure EventSystem is working
            EventSystemHelper.EnsureEventSystem();
            EventSystemHelper.VerifyEventSystem();
            
            SetupButtons();
            SetupBottomNavButtons();

            if (resourceBar != null)
            {
                resourcesBar = resourceBar;
            }

            if (useSceneLayout)
            {
                InitializeSceneDrivenMode();
            }
            else
            {
                InitializeLegacyMode();
            }

            CachePanels();
            ShowPanel(activePanel);
        }

        private void InitializeSceneDrivenMode()
        {
            Debug.Log("[MainHUD] Initializing scene-driven HUD references...");

            loginUI = loginUI ?? FindSceneComponentIncludingInactive<LoginUI>();

            if (GameStateManager.Instance == null || string.IsNullOrEmpty(GameStateManager.Instance.userId))
            {
                loginUI?.ShowLoginPanel();
            }
            else
            {
                ShowInstructionsOnce();
            }

            ResolvePanelReference(ref cityPanel, ref cityUI);
            if (cityUI != null)
            {
                cityUI.tickLabel = tickLabel;
                cityUI.versionLabel = versionLabel;
                if (resourcesBar != null)
                {
                    cityUI.resourcesContainer = resourcesBar;
                }
            }

            ResolvePanelReference(ref heroesPanel, ref heroesUI);
            ResolvePanelReference(ref marketPanelRoot, ref marketUI);
            ResolvePanelReference(ref adventuresPanel, ref adventuresUI);
            ResolvePanelReference(ref routesPanel, ref routesUI);
            ResolvePanelReference(ref milestonesPanel, ref milestoneUI);
            ResolvePanelReference(ref lawsPanelRoot, ref lawsUI);
            ResolvePanelReference(ref trainingPanelRoot, ref trainingUI);

            if (dailyRewardsUI == null)
            {
                dailyRewardsUI = FindSceneComponentIncludingInactive<DailyRewardsUI>();
            }

            if (leaderboardUI == null)
            {
                leaderboardUI = FindSceneComponentIncludingInactive<LeaderboardUI>();
            }

            if (expeditionUI == null)
            {
                expeditionUI = FindSceneComponentIncludingInactive<ExpeditionUI>();
            }
        }

        private void InitializeLegacyMode()
        {
            Transform uiControllersContainer = CanvasManager.GetUIControllersContainer();
            if (uiControllersContainer == null)
            {
                uiControllersContainer = CreateLegacyUIContainer();
            }

            if (uiControllersContainer == null)
            {
                Debug.LogError("[MainHUD] Unable to find or create UIControllers container. Legacy HUD cannot be initialized.");
                return;
            }

            Debug.Log($"[MainHUD] UIControllers container: {uiControllersContainer.name} (Current child count: {uiControllersContainer.childCount})");

            Debug.Log("[MainHUD] Setting up LoginUI...");
            loginUI = EnsureUIComponent(loginUI, uiControllersContainer, "LoginUI");

            if (GameStateManager.Instance == null || string.IsNullOrEmpty(GameStateManager.Instance.userId))
            {
                loginUI?.ShowLoginPanel();
            }
            else
            {
                ShowInstructionsOnce();
            }

            cityUI = EnsureUIComponent(cityUI, uiControllersContainer, "CityUI");
            if (cityUI != null)
            {
                cityUI.tickLabel = tickLabel;
                cityUI.versionLabel = versionLabel;
                cityUI.resourcesContainer = resourcesBar;
                if (cityPanel == null)
                {
                    cityPanel = cityUI.gameObject;
                }
            }

            Debug.Log("[MainHUD] Setting up MilestoneUI...");
            milestoneUI = EnsureUIComponent(milestoneUI, uiControllersContainer, "MilestoneUI");
            if (milestonesPanel == null && milestoneUI != null)
            {
                milestonesPanel = milestoneUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up HeroesUI...");
            heroesUI = EnsureUIComponent(heroesUI, uiControllersContainer, "HeroesUI");
            if (heroesPanel == null && heroesUI != null)
            {
                heroesPanel = heroesUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up AdventuresUI...");
            adventuresUI = EnsureUIComponent(adventuresUI, uiControllersContainer, "AdventuresUI");
            if (adventuresPanel == null && adventuresUI != null)
            {
                adventuresPanel = adventuresUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up MarketUI...");
            marketUI = EnsureUIComponent(marketUI, uiControllersContainer, "MarketUI");
            if (marketPanelRoot == null && marketUI != null)
            {
                marketPanelRoot = marketUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up TrainingUI...");
            trainingUI = EnsureUIComponent(trainingUI, uiControllersContainer, "TrainingUI");
            if (trainingPanelRoot == null && trainingUI != null)
            {
                trainingPanelRoot = trainingUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up LawsUI...");
            lawsUI = EnsureUIComponent(lawsUI, uiControllersContainer, "LawsUI");
            if (lawsPanelRoot == null && lawsUI != null)
            {
                lawsPanelRoot = lawsUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up RoutesUI...");
            routesUI = EnsureUIComponent(routesUI, uiControllersContainer, "RoutesUI");
            if (routesPanel == null && routesUI != null)
            {
                routesPanel = routesUI.gameObject;
            }

            Debug.Log("[MainHUD] Setting up DailyRewardsUI...");
            dailyRewardsUI = EnsureUIComponent(dailyRewardsUI, uiControllersContainer, "DailyRewardsUI");

            Debug.Log("[MainHUD] Setting up LeaderboardUI...");
            leaderboardUI = EnsureUIComponent(leaderboardUI, uiControllersContainer, "LeaderboardUI");

            Debug.Log("[MainHUD] Setting up ExpeditionUI...");
            expeditionUI = EnsureUIComponent(expeditionUI, uiControllersContainer, "ExpeditionUI");

            Debug.Log($"[MainHUD] All UI panels setup complete. UIControllers container now has {uiControllersContainer.childCount} children.");
        }

        private Transform CreateLegacyUIContainer()
        {
            Canvas targetCanvas = CanvasManager.GetCanvas();
            if (targetCanvas == null)
            {
                return null;
            }

            GameObject containerGO = new GameObject("UIControllers");
            containerGO.transform.SetParent(targetCanvas.transform, false);
            return containerGO.transform;
        }

        private T EnsureUIComponent<T>(T existing, Transform parent, string fallbackName) where T : MonoBehaviour
        {
            if (existing != null)
            {
                return existing;
            }

            T found = FindSceneComponentIncludingInactive<T>();
            if (found != null)
            {
                Debug.Log($"[MainHUD] Found existing {typeof(T).Name}: {found.name}");
                return found;
            }

            if (parent == null)
            {
                return null;
            }

            Debug.Log($"[MainHUD] Creating {typeof(T).Name} GameObject...");
            GameObject go = new GameObject(fallbackName);
            go.transform.SetParent(parent, false);
            T component = go.AddComponent<T>();
            Debug.Log($"[MainHUD] {typeof(T).Name} created and parented to {parent.name}");
            return component;
        }

        private void ResolvePanelReference<T>(ref GameObject panelField, ref T uiComponent) where T : MonoBehaviour
        {
            if (uiComponent != null && panelField == null)
            {
                panelField = uiComponent.gameObject;
                return;
            }

            if (panelField != null)
            {
                T component = panelField.GetComponent<T>();
                if (component != null)
                {
                    uiComponent = component;
                    return;
                }
            }

            uiComponent = uiComponent ?? FindSceneComponentIncludingInactive<T>();
            if (panelField == null && uiComponent != null)
            {
                panelField = uiComponent.gameObject;
            }
        }

        private T FindSceneComponentIncludingInactive<T>() where T : MonoBehaviour
        {
            T instance = FindObjectOfType<T>();
            if (instance != null)
            {
                return instance;
            }

            T[] candidates = Resources.FindObjectsOfTypeAll<T>();
            foreach (T candidate in candidates)
            {
                if (candidate == null) continue;
                if (!candidate.gameObject.scene.IsValid()) continue;
#if UNITY_EDITOR
                if (UnityEditor.EditorUtility.IsPersistent(candidate)) continue;
#endif
                return candidate;
            }

            return null;
        }

        private void CreateHUD()
        {
            if (useSceneLayout || topBar != null || bottomNavBar != null || contentArea != null)
            {
                Debug.Log("[MainHUD] Scene already provides HUD layout. Skipping dynamic construction.");
                if (resourcesBar == null && resourceBar != null)
                {
                    resourcesBar = resourceBar;
                }
                return;
            }

            EventSystemHelper.EnsureEventSystem();
            EventSystemHelper.VerifyEventSystem();

            Canvas canvas = CanvasManager.GetCanvas();
            Debug.Log($"[MainHUD] Using Canvas: {canvas.name} (Child count: {canvas.transform.childCount})");

            CreateTopBar(canvas.transform);
            CreateActionBar(canvas.transform);
        }

        private Button CreateActionButton(Transform parent, string text, UnityEngine.Events.UnityAction onClick)
        {
            Button button = null;
            if (UIManager.Instance != null)
            {
                button = UIManager.Instance.CreateButton(parent, text, onClick);
            }
            else
            {
                System.Action panelAction = () => onClick?.Invoke();
                button = PanelHelper.CreateButton(
                    parent.gameObject,
                    $"Button_{text}",
                    text,
                    Vector2.zero,
                    new Vector2(140, 44),
                    panelAction);
            }

            if (button == null)
            {
                return null;
            }

            RectTransform rect = button.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(140, 44);

            LayoutElement layout = button.gameObject.GetComponent<LayoutElement>();
            if (layout == null)
            {
                layout = button.gameObject.AddComponent<LayoutElement>();
            }
            layout.preferredWidth = 140;
            layout.minWidth = 120;
            layout.preferredHeight = 52;

            return button;
        }

        private void SetupButtons()
        {
            // Ensure buttons are clickable
            if (buildButton != null)
            {
                buildButton.interactable = true;
                buildButton.onClick.RemoveAllListeners();
                buildButton.onClick.AddListener(ShowBuildPanel);
            }
            if (trainButton != null)
            {
                trainButton.interactable = true;
                trainButton.onClick.RemoveAllListeners();
                trainButton.onClick.AddListener(ShowTrainingPanel);
            }
            if (marketButton != null)
            {
                marketButton.interactable = true;
                marketButton.onClick.RemoveAllListeners();
                marketButton.onClick.AddListener(ShowMarketPanel);
            }
            if (lawsButton != null)
            {
                lawsButton.interactable = true;
                lawsButton.onClick.RemoveAllListeners();
                lawsButton.onClick.AddListener(ShowLawsPanel);
            }
            if (milestonesButton != null)
            {
                milestonesButton.interactable = true;
                milestonesButton.onClick.RemoveAllListeners();
                milestonesButton.onClick.AddListener(ShowMilestonesPanel);
            }
            if (heroesButton != null)
            {
                heroesButton.interactable = true;
                heroesButton.onClick.RemoveAllListeners();
                heroesButton.onClick.AddListener(ShowHeroesPanel);
            }
            if (routesButton != null)
            {
                routesButton.interactable = true;
                routesButton.onClick.RemoveAllListeners();
                routesButton.onClick.AddListener(ShowRoutesPanel);
            }
            
            // Verify EventSystem
            EventSystemHelper.EnsureEventSystem();
            EventSystemHelper.VerifyEventSystem();
            
            Debug.Log("[MainHUD] Buttons setup complete");
        }

        public void ShowBuildPanel()
        {
            if (buildPanel != null)
            {
                buildPanel.SetActive(true);
            }
            else if (cityUI != null && cityUI.buildPanel != null)
            {
                cityUI.buildPanel.SetActive(true);
            }
        }

        public void ShowTrainingPanel()
        {
            if (trainingUI != null)
            {
                trainingUI.ShowPanel();
            }
            else if (trainingPanel != null)
            {
                trainingPanel.SetActive(true);
            }
        }

        public void ShowMarketPanel()
        {
            if (marketUI != null)
            {
                marketUI.ShowPanel();
            }
            else if (marketPanel != null)
            {
                marketPanel.SetActive(true);
            }
        }

        public void ShowLawsPanel()
        {
            if (lawsUI != null)
            {
                lawsUI.ShowPanel();
            }
            else if (lawsPanel != null)
            {
                lawsPanel.SetActive(true);
            }
        }

        public void ShowMilestonesPanel()
        {
            if (milestoneUI != null)
            {
                milestoneUI.ShowPanel();
            }
        }

        public void ShowHeroesPanel()
        {
            if (heroesUI != null)
            {
                heroesUI.ShowPanel();
            }
            else
            {
                Debug.LogWarning("HeroesUI not assigned");
            }
        }

        public void ShowRoutesPanel()
        {
            if (routesUI != null)
            {
                routesUI.ShowPanel();
            }
            else
            {
                Debug.LogWarning("RoutesUI not assigned");
            }
        }

        public void ShowAdventuresPanel()
        {
            if (adventuresUI != null)
            {
                adventuresUI.ShowPanel();
            }
            else
            {
                Debug.LogWarning("AdventuresUI not assigned");
            }
        }

        private void ShowInstructionsOnce()
        {
            // Check if instructions already shown
            if (PlayerPrefs.GetInt("InstructionsShown", 0) == 1)
            {
                return;
            }

            CreateInstructionsPanel();
            if (instructionsPanel != null)
            {
                instructionsPanel.SetActive(true);
            }
        }

        private void CreateInstructionsPanel()
        {
            if (instructionsPanel != null) return;

            Canvas canvas = CanvasManager.GetCanvas();
            if (canvas == null) return;

            instructionsPanel = new GameObject("InstructionsPanel");
            instructionsPanel.transform.SetParent(canvas.transform, false);
            RectTransform rect = instructionsPanel.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = new Vector2(600, 400);
            rect.anchoredPosition = Vector2.zero;

            Image bg = instructionsPanel.AddComponent<Image>();
            bg.color = new Color(0.1f, 0.1f, 0.15f, 0.98f);

            VerticalLayoutGroup layout = instructionsPanel.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 15;
            layout.padding = new RectOffset(30, 30, 30, 30);
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;

            // Title
            GameObject titleGO = new GameObject("Title");
            titleGO.transform.SetParent(instructionsPanel.transform, false);
            RectTransform titleRect = titleGO.AddComponent<RectTransform>();
            titleRect.sizeDelta = new Vector2(0, 40);
            TextMeshProUGUI titleText = titleGO.AddComponent<TextMeshProUGUI>();
            titleText.text = "Welcome to Kingdom Ledger!";
            titleText.fontSize = 24;
            titleText.fontStyle = FontStyles.Bold;
            titleText.color = Color.white;
            titleText.alignment = TextAlignmentOptions.Center;

            // Instructions
            GameObject instructionsGO = new GameObject("InstructionsText");
            instructionsGO.transform.SetParent(instructionsPanel.transform, false);
            RectTransform instructionsRect = instructionsGO.AddComponent<RectTransform>();
            instructionsRect.sizeDelta = new Vector2(0, 250);
            instructionsText = instructionsGO.AddComponent<TextMeshProUGUI>();
            instructionsText.text = "HOW TO PLAY:\n\n" +
                "1. Click 'Heroes' to view your heroes\n" +
                "2. Click 'Adventures' to start battles\n" +
                "3. Select heroes and complete stages\n" +
                "4. Earn XP, coins, and resources\n" +
                "5. Upgrade heroes and buildings\n\n" +
                "Resources produce automatically every 5 minutes!\n" +
                "Check your city state in the top bar.";
            instructionsText.fontSize = 16;
            instructionsText.color = Color.white;
            instructionsText.alignment = TextAlignmentOptions.Left;

            // Close button
            GameObject closeBtnGO = new GameObject("CloseButton");
            closeBtnGO.transform.SetParent(instructionsPanel.transform, false);
            RectTransform closeBtnRect = closeBtnGO.AddComponent<RectTransform>();
            closeBtnRect.sizeDelta = new Vector2(0, 40);
            Button closeBtn = closeBtnGO.AddComponent<Button>();
            Image closeImg = closeBtnGO.AddComponent<Image>();
            closeImg.color = new Color(0.2f, 0.4f, 0.6f, 1f);
            closeBtn.targetGraphic = closeImg;
            closeBtn.onClick.AddListener(() =>
            {
                instructionsPanel.SetActive(false);
                PlayerPrefs.SetInt("InstructionsShown", 1);
            });

            GameObject closeTextGO = new GameObject("Text");
            closeTextGO.transform.SetParent(closeBtnGO.transform, false);
            RectTransform closeTextRect = closeTextGO.AddComponent<RectTransform>();
            closeTextRect.anchorMin = Vector2.zero;
            closeTextRect.anchorMax = Vector2.one;
            closeTextRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI closeText = closeTextGO.AddComponent<TextMeshProUGUI>();
            closeText.text = "Got it!";
            closeText.fontSize = 18;
            closeText.alignment = TextAlignmentOptions.Center;
            closeText.color = Color.white;
            closeText.raycastTarget = false;

            instructionsPanel.SetActive(false);
        }

        private void CreateTopBar(Transform parent)
        {
            if (topBarPanel == null)
            {
                topBarPanel = CreateUIPanel(parent, "TopBar");
            }

            bool portrait = CanvasManager.IsPortraitLayout;

            RectTransform rect = topBarPanel.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0.5f, 1);
            rect.sizeDelta = new Vector2(0, portrait ? 240 : 140);
            rect.anchoredPosition = Vector2.zero;

            var existingHorizontal = topBarPanel.GetComponent<HorizontalLayoutGroup>();
            if (existingHorizontal == null)
            {
                existingHorizontal = topBarPanel.AddComponent<HorizontalLayoutGroup>();
            }
            existingHorizontal.spacing = portrait ? 20 : 30;
            existingHorizontal.padding = portrait ? new RectOffset(24, 24, 20, 20) : new RectOffset(40, 40, 20, 20);
            existingHorizontal.childAlignment = portrait ? TextAnchor.UpperCenter : TextAnchor.MiddleLeft;
            existingHorizontal.childControlWidth = portrait;
            existingHorizontal.childControlHeight = true;
            existingHorizontal.childForceExpandWidth = portrait;
            existingHorizontal.childForceExpandHeight = !portrait;

            Image bg = topBarPanel.GetComponent<Image>();
            if (bg != null)
            {
                bg.color = new Color(0.92f, 0.95f, 1f, 0.9f);
            }

            Transform statsGroup = new GameObject("StatsGroup").transform;
            statsGroup.SetParent(topBarPanel.transform, false);
            HorizontalLayoutGroup statsLayout = statsGroup.gameObject.AddComponent<HorizontalLayoutGroup>();
            statsLayout.spacing = portrait ? 12 : 15;
            statsLayout.childAlignment = portrait ? TextAnchor.MiddleCenter : TextAnchor.MiddleLeft;
            statsLayout.childForceExpandWidth = false;
            statsLayout.childForceExpandHeight = true;

            tickLabel = CreateStatCard(statsGroup, "Tick");
            versionLabel = CreateStatCard(statsGroup, "Version");

            GameObject resourcesGO = CreateUIPanel(topBarPanel.transform, "ResourcesBar");
            RectTransform resourcesRect = resourcesGO.GetComponent<RectTransform>();
            resourcesRect.sizeDelta = portrait ? new Vector2(0, 120) : new Vector2(600, 80);
            HorizontalLayoutGroup resourcesLayout = resourcesGO.GetComponent<HorizontalLayoutGroup>() ?? resourcesGO.AddComponent<HorizontalLayoutGroup>();
            resourcesLayout.spacing = 10;
            resourcesLayout.childAlignment = portrait ? TextAnchor.MiddleCenter : TextAnchor.MiddleLeft;
            resourcesLayout.childForceExpandWidth = portrait;
            resourcesLayout.childControlWidth = portrait;
            resourcesLayout.childControlHeight = true;
            LayoutElement resourcesElement = resourcesGO.GetComponent<LayoutElement>() ?? resourcesGO.AddComponent<LayoutElement>();
            resourcesElement.flexibleWidth = portrait ? 1 : 0;
            resourcesElement.preferredWidth = portrait ? 0 : 600;
            resourcesBar = resourcesGO.transform;
        }

        private void CreateActionBar(Transform parent)
        {
            bool portrait = CanvasManager.IsPortraitLayout;

            GameObject buttonsBar = CreateUIPanel(parent, "ActionButtons");
            RectTransform buttonsRect = buttonsBar.GetComponent<RectTransform>();
            buttonsRect.anchorMin = new Vector2(0, 0);
            buttonsRect.anchorMax = new Vector2(1, 0);
            buttonsRect.pivot = new Vector2(0.5f, 0);
            buttonsRect.sizeDelta = new Vector2(0, portrait ? 260 : 90);
            buttonsRect.anchoredPosition = Vector2.zero;

            HorizontalLayoutGroup hLayout = buttonsBar.GetComponent<HorizontalLayoutGroup>();
            GridLayoutGroup gridLayout = buttonsBar.GetComponent<GridLayoutGroup>();

            if (portrait)
            {
                if (hLayout != null)
                {
                    hLayout.enabled = false;
                }

                if (gridLayout == null)
                {
                    gridLayout = buttonsBar.AddComponent<GridLayoutGroup>();
                }
                gridLayout.enabled = true;
                gridLayout.padding = new RectOffset(24, 24, 18, 30);
                gridLayout.spacing = new Vector2(18, 18);
                gridLayout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
                gridLayout.constraintCount = 3;
                float availableWidth = CanvasManager.ReferenceResolution.x - (gridLayout.padding.left + gridLayout.padding.right) - (gridLayout.spacing.x * (gridLayout.constraintCount - 1));
                float cellWidth = availableWidth / gridLayout.constraintCount;
                gridLayout.cellSize = new Vector2(cellWidth, 72f);
            }
            else
            {
                if (gridLayout != null)
                {
                    gridLayout.enabled = false;
                }

                if (hLayout == null)
                {
                    hLayout = buttonsBar.AddComponent<HorizontalLayoutGroup>();
                }

                hLayout.enabled = true;
                hLayout.spacing = 12;
                hLayout.padding = new RectOffset(30, 30, 15, 15);
                hLayout.childAlignment = TextAnchor.MiddleCenter;
                hLayout.childControlHeight = true;
                hLayout.childForceExpandWidth = false;
            }

            buildButton = CreateActionButton(buttonsBar.transform, "Build", ShowBuildPanel);
            trainButton = CreateActionButton(buttonsBar.transform, "Train", ShowTrainingPanel);
            marketButton = CreateActionButton(buttonsBar.transform, "Market", ShowMarketPanel);
            lawsButton = CreateActionButton(buttonsBar.transform, "Laws", ShowLawsPanel);
            milestonesButton = CreateActionButton(buttonsBar.transform, "Milestones", ShowMilestonesPanel);
            heroesButton = CreateActionButton(buttonsBar.transform, "Heroes", ShowHeroesPanel);
            routesButton = CreateActionButton(buttonsBar.transform, "Routes", ShowRoutesPanel);
            CreateActionButton(buttonsBar.transform, "Adventures", ShowAdventuresPanel);
        }

        private GameObject CreateUIPanel(Transform parent, string name)
        {
            GameObject panel;
            if (UIManager.Instance != null)
            {
                panel = UIManager.Instance.CreatePanel(parent, name);
            }
            else
            {
                panel = new GameObject(name);
                panel.transform.SetParent(parent, false);
                RectTransform rect = panel.AddComponent<RectTransform>();
                rect.anchorMin = Vector2.zero;
                rect.anchorMax = Vector2.one;
                rect.sizeDelta = Vector2.zero;
                Image bg = panel.AddComponent<Image>();
                bg.color = new Color(0.08f, 0.1f, 0.15f, 0.95f);
            }

            panel.name = name;
            GUIThemeHelper.StripPlaceholderTexts(panel.transform);
            return panel;
        }

        private TextMeshProUGUI CreateStatCard(Transform parent, string label)
        {
            GameObject panelPrefab = GUIAssetLoader.LoadPanelPrefab();
            GameObject card;
            if (panelPrefab != null)
            {
                card = Instantiate(panelPrefab, parent);
            }
            else
            {
                card = new GameObject($"{label}Card");
                card.transform.SetParent(parent, false);
                RectTransform fallbackRect = card.AddComponent<RectTransform>();
                fallbackRect.sizeDelta = new Vector2(180, 80);
                Image img = card.AddComponent<Image>();
                img.color = new Color(0.2f, 0.2f, 0.28f, 0.95f);
            }

            card.name = $"{label}Card";
            GUIThemeHelper.StripPlaceholderTexts(card.transform);
            VerticalLayoutGroup layout = card.GetComponent<VerticalLayoutGroup>() ?? card.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 4;
            layout.padding = new RectOffset(12, 12, 10, 10);
            layout.childAlignment = TextAnchor.UpperLeft;

            TextMeshProUGUI labelText = CreateLabel(card.transform, label, 14, FontStyles.Bold);
            labelText.color = new Color(0.7f, 0.84f, 1f, 1f);

            TextMeshProUGUI valueText = CreateLabel(card.transform, "0", 26, FontStyles.Bold);
            valueText.color = Color.white;

            return valueText;
        }

        private TextMeshProUGUI CreateLabel(Transform parent, string text, float size, FontStyles style = FontStyles.Normal)
        {
            GameObject labelGO = new GameObject($"{text}_Label");
            labelGO.transform.SetParent(parent, false);
            TextMeshProUGUI tmp = labelGO.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = size;
            tmp.fontStyle = style;
            tmp.alignment = TextAlignmentOptions.Left;
            tmp.raycastTarget = false;
            return tmp;
        }

        private void SetupBottomNavButtons()
        {
            ConfigureNavButton(cityNavButton, cityPanel, HUDPanelType.City);
            ConfigureNavButton(heroesNavButton, heroesPanel, HUDPanelType.Heroes);
            ConfigureNavButton(marketNavButton, marketPanelRoot, HUDPanelType.Market);
            ConfigureNavButton(adventuresNavButton, adventuresPanel, HUDPanelType.Adventures);
            ConfigureNavButton(routesNavButton, routesPanel, HUDPanelType.Routes);
            ConfigureNavButton(milestonesNavButton, milestonesPanel, HUDPanelType.Milestones);
            ConfigureNavButton(lawsNavButton, lawsPanelRoot, HUDPanelType.Laws);
            ConfigureNavButton(trainingNavButton, trainingPanelRoot, HUDPanelType.Training);
        }

        private void ConfigureNavButton(Button button, GameObject targetPanel, HUDPanelType panelType)
        {
            if (button == null)
            {
                return;
            }

            button.onClick.RemoveAllListeners();
            button.onClick.AddListener(() =>
            {
                if (panelLookup.Count == 0)
                {
                    CachePanels();
                }

                GameObject panelToShow = targetPanel;
                if (panelToShow == null && panelLookup.TryGetValue(panelType, out GameObject fallbackPanel))
                {
                    panelToShow = fallbackPanel;
                }

                ShowPanel(panelToShow ?? (panelLookup.ContainsKey(panelType) ? panelLookup[panelType] : null));
            });
        }

        private void CachePanels()
        {
            panelLookup.Clear();
            RegisterPanel(HUDPanelType.City, cityPanel ?? cityUI?.gameObject);
            RegisterPanel(HUDPanelType.Heroes, heroesPanel ?? heroesUI?.gameObject);
            RegisterPanel(HUDPanelType.Market, marketPanelRoot ?? marketPanel ?? marketUI?.gameObject);
            RegisterPanel(HUDPanelType.Adventures, adventuresPanel ?? adventuresUI?.gameObject);
            RegisterPanel(HUDPanelType.Routes, routesPanel ?? routesUI?.gameObject);
            RegisterPanel(HUDPanelType.Milestones, milestonesPanel ?? milestoneUI?.gameObject);
            RegisterPanel(HUDPanelType.Laws, lawsPanelRoot ?? lawsPanel ?? lawsUI?.gameObject);
            RegisterPanel(HUDPanelType.Training, trainingPanelRoot ?? trainingPanel ?? trainingUI?.gameObject);
        }

        private void RegisterPanel(HUDPanelType type, GameObject panel)
        {
            if (panel == null)
            {
                return;
            }

            AttachPanelToContentArea(panel);
            panelLookup[type] = panel;
        }

        private void AttachPanelToContentArea(GameObject panel)
        {
            if (panel == null)
            {
                return;
            }

            Transform targetParent = contentArea != null ? contentArea : CanvasManager.GetCanvas()?.transform;
            if (targetParent == null)
            {
                return;
            }

            if (panel.transform.parent != targetParent)
            {
                panel.transform.SetParent(targetParent, false);
            }

            RectTransform rect = panel.GetComponent<RectTransform>();
            if (rect != null && contentArea != null)
            {
                rect.anchorMin = Vector2.zero;
                rect.anchorMax = Vector2.one;
                rect.offsetMin = Vector2.zero;
                rect.offsetMax = Vector2.zero;
                rect.pivot = new Vector2(0.5f, 0.5f);
            }
        }

        public void ShowPanel(HUDPanelType panel)
        {
            if (panelLookup.Count == 0)
            {
                CachePanels();
            }

            if (panelLookup.TryGetValue(panel, out GameObject targetPanel))
            {
                ShowPanel(targetPanel);
            }
        }

        public void ShowPanel(GameObject panel)
        {
            if (panelLookup.Count == 0)
            {
                CachePanels();
            }

            foreach (KeyValuePair<HUDPanelType, GameObject> kvp in panelLookup)
            {
                if (kvp.Value == null) continue;
                bool shouldShow = kvp.Value == panel;
                kvp.Value.SetActive(shouldShow);
                if (shouldShow)
                {
                    activePanel = kvp.Key;
                }
            }
        }

        public void UpdateHUD(CityState state)
        {
            if (state == null)
            {
                return;
            }

            if (topBarCityNameLabel != null)
            {
                topBarCityNameLabel.text = ResolveCityName(state);
            }

            if (topBarCityLevelLabel != null)
            {
                int level = CalculateCityLevel(state);
                topBarCityLevelLabel.text = $"Lv. {level}";
            }
        }

        private string ResolveCityName(CityState state)
        {
            if (state == null)
            {
                return "City";
            }

            if (!string.IsNullOrEmpty(GameStateManager.Instance?.cityId))
            {
                string id = GameStateManager.Instance.cityId;
                if (id.Length > 6)
                {
                    id = id.Substring(id.Length - 6);
                }
                return $"City {id}";
            }

            return "Your City";
        }

        private int CalculateCityLevel(CityState state)
        {
            if (state?.buildings == null || state.buildings.Count == 0)
            {
                return 1;
            }

            int level = 1;
            foreach (var building in state.buildings)
            {
                if (building == null) continue;
                if (building.id == "city_center" || building.id == "town_hall")
                {
                    level = Mathf.Max(level, building.lvl);
                }
            }

            if (level <= 1)
            {
                foreach (var building in state.buildings)
                {
                    if (building == null) continue;
                    level = Mathf.Max(level, building.lvl);
                }
            }

            return Mathf.Max(level, 1);
        }

        public enum HUDPanelType
        {
            City,
            Heroes,
            Market,
            Adventures,
            Routes,
            Milestones,
            Laws,
            Training
        }

    }
}

