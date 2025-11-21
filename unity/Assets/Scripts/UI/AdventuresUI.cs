using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class AdventuresUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject adventuresPanel;
        public Transform stagesContainer;
        public GameObject stageItemPrefab;
        public Button closeButton;
        public Button refreshButton;

        [Header("Battle Panel")]
        public GameObject battlePanel;
        public Transform heroSelectionContainer;
        public Button startBattleButton;
        public TextMeshProUGUI enemyPowerLabel;
        public TextMeshProUGUI teamPowerLabel;
        public TextMeshProUGUI battleResultLabel;

        private List<Adventure> stages = new List<Adventure>();
        private List<AdventureProgress> progress = new List<AdventureProgress>();
        private List<UserHero> availableHeroes = new List<UserHero>();
        private List<string> selectedHeroIds = new List<string>();
        private Adventure selectedStage;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (adventuresPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    adventuresPanel = Instantiate(popupPrefab, canvas.transform);
                    adventuresPanel.name = "AdventuresPanel";
                    adventuresPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshData();
        }

        private void SetupUI()
        {
            if (adventuresPanel == null) return;

            // Find or create container
            if (stagesContainer == null)
            {
                stagesContainer = adventuresPanel.transform.Find("Content");
                if (stagesContainer == null)
                {
                    GameObject containerGO = new GameObject("Content");
                    containerGO.transform.SetParent(adventuresPanel.transform, false);
                    RectTransform rect = containerGO.AddComponent<RectTransform>();
                    rect.anchorMin = Vector2.zero;
                    rect.anchorMax = Vector2.one;
                    rect.sizeDelta = Vector2.zero;
                    rect.offsetMin = new Vector2(20, 60);
                    rect.offsetMax = new Vector2(-20, -20);
                    
                    ScrollRect scrollRect = containerGO.AddComponent<ScrollRect>();
                    VerticalLayoutGroup layout = containerGO.AddComponent<VerticalLayoutGroup>();
                    layout.spacing = 10;
                    layout.padding = new RectOffset(10, 10, 10, 10);
                    layout.childControlHeight = false;
                    layout.childControlWidth = true;
                    layout.childForceExpandHeight = false;
                    layout.childForceExpandWidth = true;
                    
                    GameObject viewport = new GameObject("Viewport");
                    viewport.transform.SetParent(containerGO.transform, false);
                    RectTransform viewportRect = viewport.AddComponent<RectTransform>();
                    viewportRect.anchorMin = Vector2.zero;
                    viewportRect.anchorMax = Vector2.one;
                    viewportRect.sizeDelta = Vector2.zero;
                    Image viewportImage = viewport.AddComponent<Image>();
                    viewportImage.color = new Color(0, 0, 0, 0);
                    Mask mask = viewport.AddComponent<Mask>();
                    mask.showMaskGraphic = false;
                    
                    GameObject content = new GameObject("Content");
                    content.transform.SetParent(viewport.transform, false);
                    RectTransform contentRect = content.AddComponent<RectTransform>();
                    contentRect.anchorMin = new Vector2(0, 1);
                    contentRect.anchorMax = new Vector2(1, 1);
                    contentRect.pivot = new Vector2(0.5f, 1);
                    VerticalLayoutGroup contentLayout = content.AddComponent<VerticalLayoutGroup>();
                    contentLayout.spacing = 10;
                    contentLayout.padding = new RectOffset(10, 10, 10, 10);
                    contentLayout.childControlHeight = false;
                    contentLayout.childControlWidth = true;
                    contentLayout.childForceExpandHeight = false;
                    contentLayout.childForceExpandWidth = true;
                    
                    scrollRect.content = contentRect;
                    scrollRect.viewport = viewportRect;
                    scrollRect.horizontal = false;
                    scrollRect.vertical = true;
                    
                    stagesContainer = content.transform;
                }
            }

            // Find or create close button
            if (closeButton == null)
            {
                closeButton = adventuresPanel.GetComponentInChildren<Button>();
                if (closeButton == null)
                {
                    GameObject closeBtnGO = new GameObject("CloseButton");
                    closeBtnGO.transform.SetParent(adventuresPanel.transform, false);
                    RectTransform rect = closeBtnGO.AddComponent<RectTransform>();
                    rect.anchorMin = new Vector2(1, 1);
                    rect.anchorMax = new Vector2(1, 1);
                    rect.pivot = new Vector2(1, 1);
                    rect.anchoredPosition = new Vector2(-10, -10);
                    rect.sizeDelta = new Vector2(50, 50);
                    closeButton = closeBtnGO.AddComponent<Button>();
                    Image img = closeBtnGO.AddComponent<Image>();
                    img.color = Color.red;
                    closeButton.targetGraphic = img;
                    
                    GameObject textGO = new GameObject("Text");
                    textGO.transform.SetParent(closeBtnGO.transform, false);
                    RectTransform textRect = textGO.AddComponent<RectTransform>();
                    textRect.anchorMin = Vector2.zero;
                    textRect.anchorMax = Vector2.one;
                    textRect.sizeDelta = Vector2.zero;
                    TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
                    text.text = "X";
                    text.fontSize = 24;
                    text.alignment = TextAlignmentOptions.Center;
                    text.color = Color.white;
                    text.raycastTarget = false;
                }
            }

            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }

            // Find or create refresh button
            if (refreshButton == null)
            {
                refreshButton = adventuresPanel.transform.Find("RefreshButton")?.GetComponent<Button>();
                if (refreshButton == null)
                {
                    GameObject refreshBtnGO = new GameObject("RefreshButton");
                    refreshBtnGO.transform.SetParent(adventuresPanel.transform, false);
                    RectTransform rect = refreshBtnGO.AddComponent<RectTransform>();
                    rect.anchorMin = new Vector2(0, 1);
                    rect.anchorMax = new Vector2(0, 1);
                    rect.pivot = new Vector2(0, 1);
                    rect.anchoredPosition = new Vector2(10, -10);
                    rect.sizeDelta = new Vector2(100, 40);
                    refreshButton = refreshBtnGO.AddComponent<Button>();
                    Image img = refreshBtnGO.AddComponent<Image>();
                    img.color = new Color(0.2f, 0.4f, 0.6f, 1f);
                    refreshButton.targetGraphic = img;
                    
                    GameObject textGO = new GameObject("Text");
                    textGO.transform.SetParent(refreshBtnGO.transform, false);
                    RectTransform textRect = textGO.AddComponent<RectTransform>();
                    textRect.anchorMin = Vector2.zero;
                    textRect.anchorMax = Vector2.one;
                    textRect.sizeDelta = Vector2.zero;
                    TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
                    text.text = "Refresh";
                    text.fontSize = 16;
                    text.alignment = TextAlignmentOptions.Center;
                    text.color = Color.white;
                    text.raycastTarget = false;
                }
            }

            if (refreshButton != null)
            {
                refreshButton.onClick.AddListener(RefreshData);
            }
        }

        public void ShowPanel()
        {
            if (adventuresPanel != null)
            {
                adventuresPanel.SetActive(true);
            }
            RefreshData();
        }

        public void ClosePanel()
        {
            if (adventuresPanel != null)
            {
                adventuresPanel.SetActive(false);
            }
            if (battlePanel != null)
            {
                battlePanel.SetActive(false);
            }
        }

        private void RefreshData()
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                Debug.LogWarning("User ID not set");
                return;
            }

            // Load stages
            NetworkService.Instance.GetAdventureStages((stagesResponse) =>
            {
                if (stagesResponse != null && stagesResponse.stages != null)
                {
                    stages = stagesResponse.stages.OrderBy(s => s.stage_number).ToList();
                }

                // Load progress
                NetworkService.Instance.GetAdventureProgress(userId, (progressResponse) =>
                {
                    if (progressResponse != null && progressResponse.progress != null)
                    {
                        progress = progressResponse.progress;
                    }

                    // Load heroes for battle
                    NetworkService.Instance.GetUserHeroes(userId, (heroesResponse) =>
                    {
                        if (heroesResponse != null && heroesResponse.heroes != null)
                        {
                            availableHeroes = heroesResponse.heroes;
                        }

                        UpdateUI();
                    }, (error) => Debug.LogError($"Failed to load heroes: {error}"));
                }, (error) => Debug.LogError($"Failed to load progress: {error}"));
            }, (error) => Debug.LogError($"Failed to load stages: {error}"));
        }

        private void UpdateUI()
        {
            if (stagesContainer == null) return;

            // Clear existing
            foreach (Transform child in stagesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create stage items
            foreach (var stage in stages)
            {
                CreateStageItem(stage);
            }
        }

        private void CreateStageItem(Adventure stage)
        {
            GameObject item = new GameObject($"Stage_{stage.id}");
            item.transform.SetParent(stagesContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 120);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            bg.color = new Color(0.2f, 0.2f, 0.3f, 1f);

            Button button = item.AddComponent<Button>();
            button.onClick.AddListener(() => ShowBattlePanel(stage));

            VerticalLayoutGroup layout = item.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 5;
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;

            // Stage name
            GameObject nameLabel = new GameObject("NameLabel");
            nameLabel.transform.SetParent(item.transform, false);
            RectTransform nameRect = nameLabel.AddComponent<RectTransform>();
            nameRect.sizeDelta = new Vector2(0, 25);
            TextMeshProUGUI nameText = nameLabel.AddComponent<TextMeshProUGUI>();
            nameText.text = $"Stage {stage.stage_number}: {stage.name}";
            nameText.fontSize = 18;
            nameText.fontStyle = FontStyles.Bold;
            nameText.color = Color.white;

            // Enemy power
            GameObject powerLabel = new GameObject("PowerLabel");
            powerLabel.transform.SetParent(item.transform, false);
            RectTransform powerRect = powerLabel.AddComponent<RectTransform>();
            powerRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI powerText = powerLabel.AddComponent<TextMeshProUGUI>();
            powerText.text = $"Enemy Power: {stage.enemy_power}";
            powerText.fontSize = 14;
            powerText.color = new Color(1f, 0.5f, 0.5f, 1f);

            // Rewards
            GameObject rewardsLabel = new GameObject("RewardsLabel");
            rewardsLabel.transform.SetParent(item.transform, false);
            RectTransform rewardsRect = rewardsLabel.AddComponent<RectTransform>();
            rewardsRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI rewardsText = rewardsLabel.AddComponent<TextMeshProUGUI>();
            rewardsText.text = $"Rewards: {stage.reward_coins} coins, {stage.reward_gems} gems";
            rewardsText.fontSize = 14;
            rewardsText.color = new Color(1f, 0.84f, 0f, 1f);

            // Progress stars
            var stageProgress = progress.FirstOrDefault(p => p.adventure_id == stage.id);
            if (stageProgress != null && stageProgress.stars_earned > 0)
            {
                GameObject starsLabel = new GameObject("StarsLabel");
                starsLabel.transform.SetParent(item.transform, false);
                RectTransform starsRect = starsLabel.AddComponent<RectTransform>();
                starsRect.sizeDelta = new Vector2(0, 20);
                TextMeshProUGUI starsText = starsLabel.AddComponent<TextMeshProUGUI>();
                starsText.text = $"★ {stageProgress.stars_earned}/3";
                starsText.fontSize = 16;
                starsText.color = new Color(1f, 0.84f, 0f, 1f);
            }
        }

        private void ShowBattlePanel(Adventure stage)
        {
            selectedStage = stage;
            selectedHeroIds.Clear();

            if (battlePanel == null)
            {
                CreateBattlePanel();
            }

            if (battlePanel != null)
            {
                battlePanel.SetActive(true);
                UpdateBattlePanel();
            }
        }

        private void CreateBattlePanel()
        {
            Canvas canvas = CanvasManager.GetCanvas();
            if (canvas == null) return;

            GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
            if (popupPrefab != null)
            {
                battlePanel = Instantiate(popupPrefab, canvas.transform);
                battlePanel.name = "BattlePanel";
            }
            else
            {
                battlePanel = new GameObject("BattlePanel");
                battlePanel.transform.SetParent(canvas.transform, false);
                RectTransform rect = battlePanel.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(500, 600);
                rect.anchoredPosition = Vector2.zero;
                
                Image bg = battlePanel.AddComponent<Image>();
                bg.color = new Color(0.1f, 0.1f, 0.15f, 0.95f);
            }

            // Setup battle panel UI
            VerticalLayoutGroup layout = battlePanel.GetComponent<VerticalLayoutGroup>();
            if (layout == null)
            {
                layout = battlePanel.AddComponent<VerticalLayoutGroup>();
                layout.spacing = 10;
                layout.padding = new RectOffset(20, 20, 20, 20);
                layout.childControlHeight = false;
                layout.childControlWidth = true;
                layout.childForceExpandHeight = false;
                layout.childForceExpandWidth = true;
            }

            // Title
            GameObject titleGO = new GameObject("Title");
            titleGO.transform.SetParent(battlePanel.transform, false);
            RectTransform titleRect = titleGO.AddComponent<RectTransform>();
            titleRect.sizeDelta = new Vector2(0, 40);
            TextMeshProUGUI titleText = titleGO.AddComponent<TextMeshProUGUI>();
            titleText.text = "Battle Setup";
            titleText.fontSize = 24;
            titleText.fontStyle = FontStyles.Bold;
            titleText.color = Color.white;
            titleText.alignment = TextAlignmentOptions.Center;

            // Enemy power label
            GameObject enemyPowerGO = new GameObject("EnemyPowerLabel");
            enemyPowerGO.transform.SetParent(battlePanel.transform, false);
            RectTransform enemyPowerRect = enemyPowerGO.AddComponent<RectTransform>();
            enemyPowerRect.sizeDelta = new Vector2(0, 30);
            enemyPowerLabel = enemyPowerGO.AddComponent<TextMeshProUGUI>();
            enemyPowerLabel.fontSize = 18;
            enemyPowerLabel.color = new Color(1f, 0.5f, 0.5f, 1f);

            // Team power label
            GameObject teamPowerGO = new GameObject("TeamPowerLabel");
            teamPowerGO.transform.SetParent(battlePanel.transform, false);
            RectTransform teamPowerRect = teamPowerGO.AddComponent<RectTransform>();
            teamPowerRect.sizeDelta = new Vector2(0, 30);
            teamPowerLabel = teamPowerGO.AddComponent<TextMeshProUGUI>();
            teamPowerLabel.fontSize = 18;
            teamPowerLabel.color = new Color(0.5f, 1f, 0.5f, 1f);

            // Hero selection container
            GameObject heroSelectionGO = new GameObject("HeroSelectionContainer");
            heroSelectionGO.transform.SetParent(battlePanel.transform, false);
            RectTransform heroSelectionRect = heroSelectionGO.AddComponent<RectTransform>();
            heroSelectionRect.sizeDelta = new Vector2(0, 300);
            
            ScrollRect scrollRect = heroSelectionGO.AddComponent<ScrollRect>();
            scrollRect.horizontal = false;
            scrollRect.vertical = true;
            
            GameObject viewport = new GameObject("Viewport");
            viewport.transform.SetParent(heroSelectionGO.transform, false);
            RectTransform viewportRect = viewport.AddComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero;
            viewportRect.anchorMax = Vector2.one;
            viewportRect.sizeDelta = Vector2.zero;
            Image viewportImage = viewport.AddComponent<Image>();
            viewportImage.color = new Color(0, 0, 0, 0);
            Mask mask = viewport.AddComponent<Mask>();
            mask.showMaskGraphic = false;
            
            GameObject content = new GameObject("Content");
            content.transform.SetParent(viewport.transform, false);
            RectTransform contentRect = content.AddComponent<RectTransform>();
            contentRect.anchorMin = new Vector2(0, 1);
            contentRect.anchorMax = new Vector2(1, 1);
            contentRect.pivot = new Vector2(0.5f, 1);
            VerticalLayoutGroup contentLayout = content.AddComponent<VerticalLayoutGroup>();
            contentLayout.spacing = 5;
            contentLayout.padding = new RectOffset(5, 5, 5, 5);
            contentLayout.childControlHeight = false;
            contentLayout.childControlWidth = true;
            contentLayout.childForceExpandHeight = false;
            contentLayout.childForceExpandWidth = true;
            
            scrollRect.content = contentRect;
            scrollRect.viewport = viewportRect;
            
            heroSelectionContainer = content.transform;

            // Battle result label
            GameObject resultLabelGO = new GameObject("BattleResultLabel");
            resultLabelGO.transform.SetParent(battlePanel.transform, false);
            RectTransform resultRect = resultLabelGO.AddComponent<RectTransform>();
            resultRect.sizeDelta = new Vector2(0, 60);
            battleResultLabel = resultLabelGO.AddComponent<TextMeshProUGUI>();
            battleResultLabel.fontSize = 16;
            battleResultLabel.color = Color.white;
            battleResultLabel.alignment = TextAlignmentOptions.Center;

            // Start battle button
            GameObject startBattleBtnGO = new GameObject("StartBattleButton");
            startBattleBtnGO.transform.SetParent(battlePanel.transform, false);
            RectTransform startBattleBtnRect = startBattleBtnGO.AddComponent<RectTransform>();
            startBattleBtnRect.sizeDelta = new Vector2(0, 50);
            startBattleButton = startBattleBtnGO.AddComponent<Button>();
            Image startBattleImg = startBattleBtnGO.AddComponent<Image>();
            startBattleImg.color = new Color(0.6f, 0.2f, 0.2f, 1f);
            startBattleButton.targetGraphic = startBattleImg;
            
            GameObject startBattleTextGO = new GameObject("Text");
            startBattleTextGO.transform.SetParent(startBattleBtnGO.transform, false);
            RectTransform startBattleTextRect = startBattleTextGO.AddComponent<RectTransform>();
            startBattleTextRect.anchorMin = Vector2.zero;
            startBattleTextRect.anchorMax = Vector2.one;
            startBattleTextRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI startBattleText = startBattleTextGO.AddComponent<TextMeshProUGUI>();
            startBattleText.text = "Start Battle";
            startBattleText.fontSize = 20;
            startBattleText.alignment = TextAlignmentOptions.Center;
            startBattleText.color = Color.white;
            startBattleText.raycastTarget = false;

            // Close button
            GameObject closeBtnGO = new GameObject("CloseButton");
            closeBtnGO.transform.SetParent(battlePanel.transform, false);
            RectTransform closeBtnRect = closeBtnGO.AddComponent<RectTransform>();
            closeBtnRect.anchorMin = new Vector2(1, 1);
            closeBtnRect.anchorMax = new Vector2(1, 1);
            closeBtnRect.pivot = new Vector2(1, 1);
            closeBtnRect.anchoredPosition = new Vector2(-10, -10);
            closeBtnRect.sizeDelta = new Vector2(40, 40);
            Button closeBtn = closeBtnGO.AddComponent<Button>();
            Image closeImg = closeBtnGO.AddComponent<Image>();
            closeImg.color = Color.red;
            closeBtn.targetGraphic = closeImg;
            closeBtn.onClick.AddListener(() => battlePanel.SetActive(false));

            if (startBattleButton != null)
            {
                startBattleButton.onClick.AddListener(OnStartBattleClicked);
            }

            battlePanel.SetActive(false);
        }

        private void UpdateBattlePanel()
        {
            if (selectedStage == null || battlePanel == null) return;

            if (enemyPowerLabel != null)
            {
                enemyPowerLabel.text = $"Enemy Power: {selectedStage.enemy_power}";
            }

            UpdateTeamPower();
            UpdateHeroSelection();
        }

        private void UpdateHeroSelection()
        {
            if (heroSelectionContainer == null || availableHeroes == null) return;

            // Clear existing
            foreach (Transform child in heroSelectionContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create hero selection items
            foreach (var hero in availableHeroes)
            {
                CreateHeroSelectionItem(hero);
            }
        }

        private void CreateHeroSelectionItem(UserHero hero)
        {
            GameObject item = new GameObject($"HeroSelect_{hero.id}");
            item.transform.SetParent(heroSelectionContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 60);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            bool isSelected = selectedHeroIds.Contains(hero.id);
            bg.color = isSelected ? new Color(0.2f, 0.4f, 0.2f, 1f) : new Color(0.2f, 0.2f, 0.3f, 1f);

            Button button = item.AddComponent<Button>();
            button.onClick.AddListener(() => ToggleHeroSelection(hero.id));

            HorizontalLayoutGroup layout = item.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            // Checkbox
            GameObject checkboxGO = new GameObject("Checkbox");
            checkboxGO.transform.SetParent(item.transform, false);
            RectTransform checkboxRect = checkboxGO.AddComponent<RectTransform>();
            checkboxRect.sizeDelta = new Vector2(30, 30);
            Image checkboxImg = checkboxGO.AddComponent<Image>();
            checkboxImg.color = isSelected ? Color.green : Color.gray;

            // Hero name and power
            GameObject infoSection = new GameObject("InfoSection");
            infoSection.transform.SetParent(item.transform, false);
            RectTransform infoRect = infoSection.AddComponent<RectTransform>();
            infoRect.sizeDelta = new Vector2(200, 0);
            VerticalLayoutGroup infoLayout = infoSection.AddComponent<VerticalLayoutGroup>();
            infoLayout.spacing = 2;
            infoLayout.childControlHeight = false;
            infoLayout.childControlWidth = true;
            infoLayout.childForceExpandHeight = false;
            infoLayout.childForceExpandWidth = true;

            GameObject nameLabel = new GameObject("NameLabel");
            nameLabel.transform.SetParent(infoSection.transform, false);
            RectTransform nameRect = nameLabel.AddComponent<RectTransform>();
            nameRect.sizeDelta = new Vector2(0, 25);
            TextMeshProUGUI nameText = nameLabel.AddComponent<TextMeshProUGUI>();
            nameText.text = hero.name ?? "Unknown";
            nameText.fontSize = 16;
            nameText.fontStyle = FontStyles.Bold;
            nameText.color = Color.white;

            GameObject powerLabel = new GameObject("PowerLabel");
            powerLabel.transform.SetParent(infoSection.transform, false);
            RectTransform powerRect = powerLabel.AddComponent<RectTransform>();
            powerRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI powerText = powerLabel.AddComponent<TextMeshProUGUI>();
            powerText.text = $"Power: {hero.CurrentPower}";
            powerText.fontSize = 14;
            powerText.color = new Color(1f, 0.84f, 0f, 1f);
        }

        private void ToggleHeroSelection(string heroId)
        {
            if (selectedHeroIds.Contains(heroId))
            {
                selectedHeroIds.Remove(heroId);
            }
            else
            {
                if (selectedHeroIds.Count < 5) // Max 5 heroes
                {
                    selectedHeroIds.Add(heroId);
                }
            }

            UpdateHeroSelection();
            UpdateTeamPower();
        }

        private void UpdateTeamPower()
        {
            int totalPower = 0;
            foreach (var heroId in selectedHeroIds)
            {
                var hero = availableHeroes.FirstOrDefault(h => h.id == heroId);
                if (hero != null)
                {
                    totalPower += hero.CurrentPower;
                }
            }

            if (teamPowerLabel != null)
            {
                teamPowerLabel.text = $"Team Power: {totalPower}";
            }
        }

        public void OnStartBattleClicked()
        {
            if (selectedStage == null || selectedHeroIds.Count == 0)
            {
                Debug.LogWarning("Please select a stage and at least one hero");
                return;
            }

            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                return;
            }

            string userId = GameStateManager.Instance.userId;
            NetworkService.Instance.CompleteAdventure(userId, selectedStage.id, selectedHeroIds.ToArray(), (result) =>
            {
                if (battleResultLabel != null)
                {
                    if (result.victory)
                    {
                        string rewardText = $"Victory! {result.stars} stars\n";
                        rewardText += $"Rewards: {result.rewards.coins} coins";
                        if (result.rewards.gems > 0)
                        {
                            rewardText += $", {result.rewards.gems} gems";
                        }
                        if (result.rewards.heroXP > 0)
                        {
                            rewardText += $"\n+{result.rewards.heroXP} XP per hero";
                        }
                        if (result.rewards.resources != null && result.rewards.resources.Count > 0)
                        {
                            rewardText += "\nResources: ";
                            foreach (var kvp in result.rewards.resources)
                            {
                                rewardText += $"{kvp.Value} {kvp.Key} ";
                            }
                        }
                        if (result.leveledUpHeroes != null && result.leveledUpHeroes.Count > 0)
                        {
                            rewardText += $"\n\n⭐ {result.leveledUpHeroes.Count} Hero(s) Leveled Up!";
                        }
                        battleResultLabel.text = rewardText;
                        battleResultLabel.color = Color.green;
                    }
                    else
                    {
                        battleResultLabel.text = "Defeat! Try again with stronger heroes.";
                        battleResultLabel.color = Color.red;
                    }
                }

                // Show level-up notification if heroes leveled up
                if (result.leveledUpHeroes != null && result.leveledUpHeroes.Count > 0)
                {
                    Debug.Log($"🎉 {result.leveledUpHeroes.Count} hero(s) leveled up!");
                    // TODO: Show level-up animation/popup
                }

                // Refresh city state to get updated resources
                if (GameStateManager.Instance != null)
                {
                    GameStateManager.Instance.RefreshCityState();
                }

                // Refresh adventures and heroes to show updated XP/levels
                RefreshData();
                if (HeroesUI.Instance != null)
                {
                    HeroesUI.Instance.RefreshHeroes();
                }
            }, (error) =>
            {
                Debug.LogError($"Battle failed: {error}");
                if (battleResultLabel != null)
                {
                    battleResultLabel.text = $"Error: {error}";
                    battleResultLabel.color = Color.red;
                }
            });
        }
    }
}

