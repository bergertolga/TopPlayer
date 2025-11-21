using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class HeroesUI : MonoBehaviour
    {
        public static HeroesUI Instance { get; private set; }

        [Header("UI References")]
        public GameObject heroesPanel;
        public Transform heroesContainer;
        public GameObject heroItemPrefab;
        public Button closeButton;
        public Button refreshButton;
        public TextMeshProUGUI titleLabel;

        [Header("Hero Detail Panel")]
        public GameObject heroDetailPanel;
        public TextMeshProUGUI heroNameLabel;
        public TextMeshProUGUI heroLevelLabel;
        public TextMeshProUGUI heroPowerLabel;
        public TextMeshProUGUI heroRarityLabel;
        public TextMeshProUGUI heroElementLabel;
        public TextMeshProUGUI upgradeCostLabel;
        public Button upgradeButton;

        private List<UserHero> userHeroes = new List<UserHero>();
        private UserHero selectedHero;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else if (Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (heroesPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    heroesPanel = Instantiate(popupPrefab, canvas.transform);
                    heroesPanel.name = "HeroesPanel";
                    heroesPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshHeroes();
        }

        private void SetupUI()
        {
            if (heroesPanel == null) return;

            // Find or create container
            if (heroesContainer == null)
            {
                heroesContainer = heroesPanel.transform.Find("Content");
                if (heroesContainer == null)
                {
                    GameObject containerGO = new GameObject("Content");
                    containerGO.transform.SetParent(heroesPanel.transform, false);
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
                    
                    heroesContainer = content.transform;
                }
            }

            // Find or create close button
            if (closeButton == null)
            {
                closeButton = heroesPanel.GetComponentInChildren<Button>();
                if (closeButton == null)
                {
                    GameObject closeBtnGO = new GameObject("CloseButton");
                    closeBtnGO.transform.SetParent(heroesPanel.transform, false);
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
                refreshButton = heroesPanel.transform.Find("RefreshButton")?.GetComponent<Button>();
                if (refreshButton == null)
                {
                    GameObject refreshBtnGO = new GameObject("RefreshButton");
                    refreshBtnGO.transform.SetParent(heroesPanel.transform, false);
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
                refreshButton.onClick.AddListener(RefreshHeroes);
            }
        }

        public void ShowPanel()
        {
            if (heroesPanel != null)
            {
                heroesPanel.SetActive(true);
            }
            RefreshHeroes();
        }

        public void ClosePanel()
        {
            if (heroesPanel != null)
            {
                heroesPanel.SetActive(false);
            }
            if (heroDetailPanel != null)
            {
                heroDetailPanel.SetActive(false);
            }
        }

        public void RefreshHeroes()
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

            NetworkService.Instance.GetUserHeroes(userId, (response) =>
            {
                if (response == null || response.heroes == null)
                {
                    Debug.LogError("Failed to get user heroes");
                    return;
                }

                userHeroes = response.heroes;
                UpdateUI();
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch heroes: {error}");
            });
        }

        private void UpdateUI()
        {
            if (heroesContainer == null) return;

            // Clear existing
            foreach (Transform child in heroesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create hero items
            foreach (var hero in userHeroes)
            {
                CreateHeroItem(hero);
            }
        }

        private void CreateHeroItem(UserHero hero)
        {
            GameObject item = new GameObject($"Hero_{hero.id}");
            item.transform.SetParent(heroesContainer, false);

            RectTransform rect = item.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 100);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = item.AddComponent<Image>();
            Color rarityColor = GetRarityColor(hero.rarity);
            bg.color = new Color(rarityColor.r * 0.3f, rarityColor.g * 0.3f, rarityColor.b * 0.3f, 1f);

            Button button = item.AddComponent<Button>();
            button.onClick.AddListener(() => ShowHeroDetail(hero));

            HorizontalLayoutGroup layout = item.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            // Hero name and level
            GameObject infoSection = new GameObject("InfoSection");
            infoSection.transform.SetParent(item.transform, false);
            RectTransform infoRect = infoSection.AddComponent<RectTransform>();
            infoRect.sizeDelta = new Vector2(200, 0);
            VerticalLayoutGroup infoLayout = infoSection.AddComponent<VerticalLayoutGroup>();
            infoLayout.spacing = 5;
            infoLayout.childControlHeight = false;
            infoLayout.childControlWidth = true;
            infoLayout.childForceExpandHeight = false;
            infoLayout.childForceExpandWidth = true;

            GameObject nameLabel = new GameObject("NameLabel");
            nameLabel.transform.SetParent(infoSection.transform, false);
            RectTransform nameRect = nameLabel.AddComponent<RectTransform>();
            nameRect.sizeDelta = new Vector2(0, 25);
            TextMeshProUGUI nameText = nameLabel.AddComponent<TextMeshProUGUI>();
            nameText.text = hero.name ?? "Unknown Hero";
            nameText.fontSize = 18;
            nameText.fontStyle = FontStyles.Bold;
            nameText.color = Color.white;

            GameObject levelLabel = new GameObject("LevelLabel");
            levelLabel.transform.SetParent(infoSection.transform, false);
            RectTransform levelRect = levelLabel.AddComponent<RectTransform>();
            levelRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI levelText = levelLabel.AddComponent<TextMeshProUGUI>();
            levelText.text = $"Level {hero.level} | Stars: {hero.stars}";
            levelText.fontSize = 14;
            levelText.color = new Color(0.8f, 0.8f, 0.8f, 1f);

            // XP display
            GameObject xpLabel = new GameObject("XPLabel");
            xpLabel.transform.SetParent(infoSection.transform, false);
            RectTransform xpRect = xpLabel.AddComponent<RectTransform>();
            xpRect.sizeDelta = new Vector2(0, 18);
            TextMeshProUGUI xpText = xpLabel.AddComponent<TextMeshProUGUI>();
            int xpForNextLevel = hero.level * 100; // Simple: 100 XP per level
            int currentXP = hero.experience % xpForNextLevel;
            xpText.text = $"XP: {currentXP}/{xpForNextLevel}";
            xpText.fontSize = 12;
            xpText.color = new Color(0.6f, 0.8f, 1f, 1f);

            // Power
            GameObject powerSection = new GameObject("PowerSection");
            powerSection.transform.SetParent(item.transform, false);
            RectTransform powerRect = powerSection.AddComponent<RectTransform>();
            powerRect.sizeDelta = new Vector2(150, 0);
            VerticalLayoutGroup powerLayout = powerSection.AddComponent<VerticalLayoutGroup>();
            powerLayout.spacing = 5;
            powerLayout.childControlHeight = false;
            powerLayout.childControlWidth = true;
            powerLayout.childForceExpandHeight = false;
            powerLayout.childForceExpandWidth = true;

            GameObject powerLabel = new GameObject("PowerLabel");
            powerLabel.transform.SetParent(powerSection.transform, false);
            RectTransform powerLabelRect = powerLabel.AddComponent<RectTransform>();
            powerLabelRect.sizeDelta = new Vector2(0, 25);
            TextMeshProUGUI powerText = powerLabel.AddComponent<TextMeshProUGUI>();
            powerText.text = $"Power: {hero.CurrentPower}";
            powerText.fontSize = 16;
            powerText.fontStyle = FontStyles.Bold;
            powerText.color = new Color(1f, 0.84f, 0f, 1f); // Gold

            GameObject rarityLabel = new GameObject("RarityLabel");
            rarityLabel.transform.SetParent(powerSection.transform, false);
            RectTransform rarityLabelRect = rarityLabel.AddComponent<RectTransform>();
            rarityLabelRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI rarityText = rarityLabel.AddComponent<TextMeshProUGUI>();
            rarityText.text = hero.rarity?.ToUpper() ?? "COMMON";
            rarityText.fontSize = 12;
            rarityText.color = rarityColor;
        }

        private Color GetRarityColor(string rarity)
        {
            if (string.IsNullOrEmpty(rarity)) return Color.gray;
            
            switch (rarity.ToLower())
            {
                case "common": return Color.gray;
                case "rare": return Color.cyan;
                case "epic": return new Color(0.5f, 0f, 1f, 1f); // Purple
                case "legendary": return new Color(1f, 0.5f, 0f, 1f); // Orange
                default: return Color.white;
            }
        }

        private void ShowHeroDetail(UserHero hero)
        {
            selectedHero = hero;
            
            if (heroDetailPanel == null)
            {
                CreateHeroDetailPanel();
            }

            if (heroDetailPanel != null)
            {
                heroDetailPanel.SetActive(true);
                UpdateHeroDetail();
            }
        }

        private void CreateHeroDetailPanel()
        {
            Canvas canvas = CanvasManager.GetCanvas();
            if (canvas == null) return;

            GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
            if (popupPrefab != null)
            {
                heroDetailPanel = Instantiate(popupPrefab, canvas.transform);
                heroDetailPanel.name = "HeroDetailPanel";
            }
            else
            {
                heroDetailPanel = new GameObject("HeroDetailPanel");
                heroDetailPanel.transform.SetParent(canvas.transform, false);
                RectTransform rect = heroDetailPanel.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(400, 500);
                rect.anchoredPosition = Vector2.zero;
                
                Image bg = heroDetailPanel.AddComponent<Image>();
                bg.color = new Color(0.1f, 0.1f, 0.15f, 0.95f);
            }

            // Setup detail panel UI elements
            VerticalLayoutGroup layout = heroDetailPanel.GetComponent<VerticalLayoutGroup>();
            if (layout == null)
            {
                layout = heroDetailPanel.AddComponent<VerticalLayoutGroup>();
                layout.spacing = 10;
                layout.padding = new RectOffset(20, 20, 20, 20);
                layout.childControlHeight = false;
                layout.childControlWidth = true;
                layout.childForceExpandHeight = false;
                layout.childForceExpandWidth = true;
            }

            // Hero name label
            GameObject nameLabelGO = new GameObject("HeroNameLabel");
            nameLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform nameRect = nameLabelGO.AddComponent<RectTransform>();
            nameRect.sizeDelta = new Vector2(0, 40);
            heroNameLabel = nameLabelGO.AddComponent<TextMeshProUGUI>();
            heroNameLabel.fontSize = 24;
            heroNameLabel.fontStyle = FontStyles.Bold;
            heroNameLabel.color = Color.white;
            heroNameLabel.alignment = TextAlignmentOptions.Center;

            // Hero level label
            GameObject levelLabelGO = new GameObject("HeroLevelLabel");
            levelLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform levelRect = levelLabelGO.AddComponent<RectTransform>();
            levelRect.sizeDelta = new Vector2(0, 30);
            heroLevelLabel = levelLabelGO.AddComponent<TextMeshProUGUI>();
            heroLevelLabel.fontSize = 18;
            heroLevelLabel.color = Color.white;

            // Hero power label
            GameObject powerLabelGO = new GameObject("HeroPowerLabel");
            powerLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform powerRect = powerLabelGO.AddComponent<RectTransform>();
            powerRect.sizeDelta = new Vector2(0, 30);
            heroPowerLabel = powerLabelGO.AddComponent<TextMeshProUGUI>();
            heroPowerLabel.fontSize = 18;
            heroPowerLabel.color = new Color(1f, 0.84f, 0f, 1f);

            // Hero rarity label
            GameObject rarityLabelGO = new GameObject("HeroRarityLabel");
            rarityLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform rarityRect = rarityLabelGO.AddComponent<RectTransform>();
            rarityRect.sizeDelta = new Vector2(0, 30);
            heroRarityLabel = rarityLabelGO.AddComponent<TextMeshProUGUI>();
            heroRarityLabel.fontSize = 16;
            heroRarityLabel.color = Color.cyan;

            // Hero element label
            GameObject elementLabelGO = new GameObject("HeroElementLabel");
            elementLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform elementRect = elementLabelGO.AddComponent<RectTransform>();
            elementRect.sizeDelta = new Vector2(0, 30);
            heroElementLabel = elementLabelGO.AddComponent<TextMeshProUGUI>();
            heroElementLabel.fontSize = 16;
            heroElementLabel.color = Color.white;

            // Upgrade cost label
            GameObject costLabelGO = new GameObject("UpgradeCostLabel");
            costLabelGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform costRect = costLabelGO.AddComponent<RectTransform>();
            costRect.sizeDelta = new Vector2(0, 30);
            upgradeCostLabel = costLabelGO.AddComponent<TextMeshProUGUI>();
            upgradeCostLabel.fontSize = 16;
            upgradeCostLabel.color = new Color(1f, 0.84f, 0f, 1f);

            // Upgrade button
            GameObject upgradeBtnGO = new GameObject("UpgradeButton");
            upgradeBtnGO.transform.SetParent(heroDetailPanel.transform, false);
            RectTransform upgradeBtnRect = upgradeBtnGO.AddComponent<RectTransform>();
            upgradeBtnRect.sizeDelta = new Vector2(0, 50);
            upgradeButton = upgradeBtnGO.AddComponent<Button>();
            Image upgradeImg = upgradeBtnGO.AddComponent<Image>();
            upgradeImg.color = new Color(0.2f, 0.6f, 0.2f, 1f);
            upgradeButton.targetGraphic = upgradeImg;
            
            GameObject upgradeTextGO = new GameObject("Text");
            upgradeTextGO.transform.SetParent(upgradeBtnGO.transform, false);
            RectTransform upgradeTextRect = upgradeTextGO.AddComponent<RectTransform>();
            upgradeTextRect.anchorMin = Vector2.zero;
            upgradeTextRect.anchorMax = Vector2.one;
            upgradeTextRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI upgradeText = upgradeTextGO.AddComponent<TextMeshProUGUI>();
            upgradeText.text = "Upgrade";
            upgradeText.fontSize = 18;
            upgradeText.alignment = TextAlignmentOptions.Center;
            upgradeText.color = Color.white;
            upgradeText.raycastTarget = false;

            // Close button
            GameObject closeBtnGO = new GameObject("CloseButton");
            closeBtnGO.transform.SetParent(heroDetailPanel.transform, false);
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
            closeBtn.onClick.AddListener(() => heroDetailPanel.SetActive(false));

            heroDetailPanel.SetActive(false);
        }

        private void UpdateHeroDetail()
        {
            if (selectedHero == null || heroDetailPanel == null) return;

            if (heroNameLabel != null)
            {
                heroNameLabel.text = selectedHero.name ?? "Unknown Hero";
            }

            if (heroLevelLabel != null)
            {
                int xpForNextLevel = selectedHero.level * 100; // Simple: 100 XP per level
                int currentXP = selectedHero.experience % xpForNextLevel;
                heroLevelLabel.text = $"Level: {selectedHero.level} | Stars: {selectedHero.stars}\nXP: {currentXP}/{xpForNextLevel}";
            }

            if (heroPowerLabel != null)
            {
                heroPowerLabel.text = $"Power: {selectedHero.CurrentPower}";
            }

            if (heroRarityLabel != null)
            {
                heroRarityLabel.text = $"Rarity: {selectedHero.rarity?.ToUpper() ?? "COMMON"}";
                heroRarityLabel.color = GetRarityColor(selectedHero.rarity);
            }

            if (heroElementLabel != null)
            {
                heroElementLabel.text = $"Element: {selectedHero.element ?? "None"}";
            }

            if (upgradeCostLabel != null)
            {
                // Calculate upgrade cost (simplified - should come from backend)
                int baseCost = 100;
                int cost = baseCost * selectedHero.level;
                upgradeCostLabel.text = $"Upgrade Cost: {cost} coins";
            }

            if (upgradeButton != null)
            {
                upgradeButton.onClick.RemoveAllListeners();
                upgradeButton.onClick.AddListener(OnUpgradeClicked);
            }
        }

        public void OnUpgradeClicked()
        {
            if (selectedHero == null || NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                return;
            }

            string userId = GameStateManager.Instance.userId;
            NetworkService.Instance.UpgradeHero(userId, selectedHero.id, (response) =>
            {
                if (response.success)
                {
                    Debug.Log($"Hero upgraded! New level: {response.newLevel}, New power: {response.newPower}");
                    RefreshHeroes();
                    if (heroDetailPanel != null)
                    {
                        UpdateHeroDetail();
                    }
                }
                else
                {
                    Debug.LogError("Failed to upgrade hero");
                }
            }, (error) =>
            {
                Debug.LogError($"Upgrade failed: {error}");
            });
        }
    }
}

