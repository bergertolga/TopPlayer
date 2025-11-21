using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class MilestoneUI : MonoBehaviour
    {
        [Header("UI References")]
        [Tooltip("Main panel container. Can use GUI Pro Bundle panel prefab.")]
        public GameObject milestonePanel;
        
        [Tooltip("Container for milestone items. Should have VerticalLayoutGroup or ScrollRect.")]
        public Transform milestonesContainer;
        
        [Tooltip("Prefab for individual milestone items. Can use GUI Pro Bundle button/panel prefab.")]
        public GameObject milestoneItemPrefab;
        
        [Tooltip("Close button. Can use GUI Pro Bundle button prefab.")]
        public Button closeButton;
        
        [Tooltip("Label showing unclaimed milestone count.")]
        public TextMeshProUGUI unclaimedCountLabel;

        [Header("GUI Pro Bundle Integration")]
        [Tooltip("If true, will use prefabs instead of creating UI programmatically.")]
        public bool usePrefabs = true;
        
        [Tooltip("GUI Pro Bundle button prefab for claim buttons (optional).")]
        public GameObject guiProClaimButtonPrefab;
        
        [Tooltip("GUI Pro Bundle panel prefab for milestone items (optional).")]
        public GameObject guiProMilestonePanelPrefab;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            // Ensure EventSystem exists for UI interactions with correct Input Module
            EventSystemHelper.EnsureEventSystem();

            // Auto-find GUI Pro Bundle prefabs if not assigned
            if (guiProClaimButtonPrefab == null)
            {
                guiProClaimButtonPrefab = GUIAssetLoader.LoadButtonPrefab();
            }
            
            if (guiProMilestonePanelPrefab == null)
            {
                guiProMilestonePanelPrefab = GUIAssetLoader.LoadPanelPrefab();
            }

            // Auto-create milestone panel if not assigned
            if (milestonePanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    milestonePanel = Instantiate(popupPrefab, canvas.transform);
                    milestonePanel.name = "MilestonePanel";
                    milestonePanel.SetActive(false);
                }
            }
        }

        private System.Collections.IEnumerator SubscribeToMilestoneManager()
        {
            // Wait a frame for managers to initialize
            yield return null;
            
            // Try to find or wait for MilestoneManager
            int attempts = 0;
            while (MilestoneManager.Instance == null && attempts < 10)
            {
                yield return new WaitForSeconds(0.1f);
                attempts++;
            }

            if (MilestoneManager.Instance != null)
            {
                MilestoneManager.Instance.OnMilestonesUpdated += UpdateUI;
                MilestoneManager.Instance.OnMilestoneClaimed += OnMilestoneClaimed;
                
                // Initial UI update
                UpdateUI(MilestoneManager.Instance.milestones ?? new List<Milestone>());
            }
            else
            {
                Debug.LogWarning("MilestoneManager.Instance is null after waiting. Milestones will not be displayed.");
            }
        }

        private void SetupUI()
        {
            // Setup close button
            if (closeButton == null && milestonePanel != null)
            {
                closeButton = milestonePanel.GetComponentInChildren<Button>();
                if (closeButton == null)
                {
                    // Create close button if not found
                    GameObject closeBtnGO = new GameObject("CloseButton");
                    closeBtnGO.transform.SetParent(milestonePanel.transform, false);
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
                    closeButton.interactable = true;
                    
                    // Add button colors for better feedback
                    ColorBlock colors = closeButton.colors;
                    colors.normalColor = Color.red;
                    colors.highlightedColor = new Color(1f, 0.5f, 0.5f, 1f);
                    colors.pressedColor = new Color(0.8f, 0f, 0f, 1f);
                    colors.disabledColor = new Color(0.5f, 0.5f, 0.5f, 0.5f);
                    closeButton.colors = colors;
                }
            }

            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }

            // Setup container if not assigned
            if (milestonesContainer == null && milestonePanel != null)
            {
                milestonesContainer = milestonePanel.transform.Find("Content") ?? milestonePanel.transform;
            }
        }

        private void Start()
        {
            SetupUI();
            // Delay subscription to ensure MilestoneManager is initialized
            StartCoroutine(SubscribeToMilestoneManager());
        }

        private void OnDestroy()
        {
            if (MilestoneManager.Instance != null)
            {
                MilestoneManager.Instance.OnMilestonesUpdated -= UpdateUI;
                MilestoneManager.Instance.OnMilestoneClaimed -= OnMilestoneClaimed;
            }
        }

        public void ShowPanel()
        {
            if (milestonePanel != null)
            {
                milestonePanel.SetActive(true);
            }
            else
            {
                gameObject.SetActive(true);
            }

            // Refresh milestones when showing
            if (MilestoneManager.Instance != null)
            {
                MilestoneManager.Instance.RefreshMilestones();
            }
        }

        public void ClosePanel()
        {
            if (milestonePanel != null)
            {
                milestonePanel.SetActive(false);
            }
            else
            {
                gameObject.SetActive(false);
            }
        }

        private void UpdateUI(List<Milestone> milestones)
        {
            if (milestonesContainer == null)
            {
                Debug.LogWarning("MilestonesContainer is null. Cannot display milestones.");
                return;
            }

            // Update unclaimed count
            if (unclaimedCountLabel != null)
            {
                int unclaimed = 0;
                foreach (var milestone in milestones)
                {
                    if (!milestone.IsClaimed)
                    {
                        unclaimed++;
                    }
                }
                unclaimedCountLabel.text = $"Unclaimed: {unclaimed}";
            }

            // Clear existing items
            foreach (Transform child in milestonesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Create milestone items
            foreach (var milestone in milestones)
            {
                CreateMilestoneItem(milestone);
            }
        }

        private void CreateMilestoneItem(Milestone milestone)
        {
            GameObject item;
            bool usingPrefab = false;
            
            // Try to use GUI Pro Bundle prefab first, then regular prefab, then create programmatically
            if (guiProMilestonePanelPrefab != null && usePrefabs)
            {
                item = Instantiate(guiProMilestonePanelPrefab, milestonesContainer);
                usingPrefab = true;
                PopulateMilestonePrefab(item, milestone);
            }
            else if (milestoneItemPrefab != null && usePrefabs)
            {
                item = Instantiate(milestoneItemPrefab, milestonesContainer);
                usingPrefab = true;
                PopulateMilestonePrefab(item, milestone);
            }
            else
            {
                // Create item programmatically if no prefab
                item = new GameObject($"Milestone_{milestone.id}");
                item.transform.SetParent(milestonesContainer, false);

                RectTransform rect = item.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(0, 100);
                rect.anchorMin = new Vector2(0, 1);
                rect.anchorMax = new Vector2(1, 1);
                rect.pivot = new Vector2(0, 1);

                Image bg = item.AddComponent<Image>();
                bg.color = milestone.IsClaimed ? new Color(0.3f, 0.3f, 0.3f, 1f) : new Color(0.2f, 0.4f, 0.2f, 1f);

                HorizontalLayoutGroup layout = item.AddComponent<HorizontalLayoutGroup>();
                layout.spacing = 10;
                layout.padding = new RectOffset(10, 10, 10, 10);
                layout.childControlHeight = true;
                layout.childControlWidth = false;
                layout.childForceExpandHeight = true;
                layout.childForceExpandWidth = false;

                // Milestone info section
                GameObject infoSection = new GameObject("InfoSection");
                infoSection.transform.SetParent(item.transform, false);
                RectTransform infoRect = infoSection.AddComponent<RectTransform>();
                infoRect.sizeDelta = new Vector2(300, 0);
                VerticalLayoutGroup infoLayout = infoSection.AddComponent<VerticalLayoutGroup>();
                infoLayout.spacing = 5;
                infoLayout.childControlHeight = false;
                infoLayout.childControlWidth = true;
                infoLayout.childForceExpandHeight = false;
                infoLayout.childForceExpandWidth = true;

                // Milestone type label
                GameObject typeLabel = new GameObject("TypeLabel");
                typeLabel.transform.SetParent(infoSection.transform, false);
                RectTransform typeRect = typeLabel.AddComponent<RectTransform>();
                typeRect.sizeDelta = new Vector2(0, 25);
                TextMeshProUGUI typeText = typeLabel.AddComponent<TextMeshProUGUI>();
                typeText.text = milestone.milestone_type;
                typeText.fontSize = 16;
                typeText.fontStyle = FontStyles.Bold;
                typeText.color = Color.white;

                // Achievement date label
                GameObject dateLabel = new GameObject("DateLabel");
                dateLabel.transform.SetParent(infoSection.transform, false);
                RectTransform dateRect = dateLabel.AddComponent<RectTransform>();
                dateRect.sizeDelta = new Vector2(0, 20);
                TextMeshProUGUI dateText = dateLabel.AddComponent<TextMeshProUGUI>();
                System.DateTime dateTime = System.DateTimeOffset.FromUnixTimeMilliseconds(milestone.achieved_at).DateTime;
                dateText.text = $"Achieved: {dateTime:yyyy-MM-dd HH:mm}";
                dateText.fontSize = 12;
                dateText.color = new Color(0.8f, 0.8f, 0.8f, 1f);

                // Rewards section
                GameObject rewardsSection = new GameObject("RewardsSection");
                rewardsSection.transform.SetParent(item.transform, false);
                RectTransform rewardsRect = rewardsSection.AddComponent<RectTransform>();
                rewardsRect.sizeDelta = new Vector2(200, 0);
                VerticalLayoutGroup rewardsLayout = rewardsSection.AddComponent<VerticalLayoutGroup>();
                rewardsLayout.spacing = 5;
                rewardsLayout.childControlHeight = false;
                rewardsLayout.childControlWidth = true;
                rewardsLayout.childForceExpandHeight = false;
                rewardsLayout.childForceExpandWidth = true;

                // Coins reward
                if (milestone.reward_coins > 0)
                {
                    GameObject coinsLabel = new GameObject("CoinsLabel");
                    coinsLabel.transform.SetParent(rewardsSection.transform, false);
                    RectTransform coinsRect = coinsLabel.AddComponent<RectTransform>();
                    coinsRect.sizeDelta = new Vector2(0, 20);
                    TextMeshProUGUI coinsText = coinsLabel.AddComponent<TextMeshProUGUI>();
                    coinsText.text = $"Coins: {milestone.reward_coins}";
                    coinsText.fontSize = 14;
                    coinsText.color = new Color(1f, 0.84f, 0f, 1f); // Gold color
                }

                // Gems reward
                if (milestone.reward_gems > 0)
                {
                    GameObject gemsLabel = new GameObject("GemsLabel");
                    gemsLabel.transform.SetParent(rewardsSection.transform, false);
                    RectTransform gemsRect = gemsLabel.AddComponent<RectTransform>();
                    gemsRect.sizeDelta = new Vector2(0, 20);
                    TextMeshProUGUI gemsText = gemsLabel.AddComponent<TextMeshProUGUI>();
                    gemsText.text = $"Gems: {milestone.reward_gems}";
                    gemsText.fontSize = 14;
                    gemsText.color = new Color(0.5f, 0f, 1f, 1f); // Purple color
                }

                // Resources reward
                if (milestone.reward_resources != null && milestone.reward_resources.Count > 0)
                {
                    foreach (var resource in milestone.reward_resources)
                    {
                        GameObject resourceLabel = new GameObject($"Resource_{resource.Key}");
                        resourceLabel.transform.SetParent(rewardsSection.transform, false);
                        RectTransform resourceRect = resourceLabel.AddComponent<RectTransform>();
                        resourceRect.sizeDelta = new Vector2(0, 20);
                        TextMeshProUGUI resourceText = resourceLabel.AddComponent<TextMeshProUGUI>();
                        resourceText.text = $"{resource.Key}: {resource.Value}";
                        resourceText.fontSize = 14;
                        resourceText.color = Color.white;
                    }
                }

                // Claim button (only if not claimed)
                if (!milestone.IsClaimed)
                {
                    Button button;
                    
                    // Try to use GUI Pro Bundle button prefab first
                    if (guiProClaimButtonPrefab != null && usePrefabs)
                    {
                        GameObject buttonGO = Instantiate(guiProClaimButtonPrefab, item.transform);
                        button = buttonGO.GetComponent<Button>();
                        if (button == null)
                        {
                            button = buttonGO.AddComponent<Button>();
                        }
                        
                        // Ensure button is interactive
                        button.interactable = true;
                        
                        // Try to find text component in prefab
                        TextMeshProUGUI buttonText = buttonGO.GetComponentInChildren<TextMeshProUGUI>();
                        if (buttonText != null)
                        {
                            buttonText.text = "Claim";
                            buttonText.raycastTarget = false; // Don't block button clicks
                        }
                    }
                    else
                    {
                        // Create button programmatically
                        GameObject buttonGO = new GameObject("ClaimButton");
                        buttonGO.transform.SetParent(item.transform, false);
                        RectTransform buttonRect = buttonGO.AddComponent<RectTransform>();
                        buttonRect.sizeDelta = new Vector2(100, 40);
                        button = buttonGO.AddComponent<Button>();
                        Image buttonImage = buttonGO.AddComponent<Image>();
                        buttonImage.color = new Color(0.2f, 0.6f, 0.2f, 1f);
                        button.targetGraphic = buttonImage;
                        button.interactable = true;
                        
                        // Add button colors for better feedback
                        ColorBlock colors = button.colors;
                        colors.normalColor = new Color(0.2f, 0.6f, 0.2f, 1f);
                        colors.highlightedColor = new Color(0.3f, 0.7f, 0.3f, 1f);
                        colors.pressedColor = new Color(0.1f, 0.5f, 0.1f, 1f);
                        colors.disabledColor = new Color(0.2f, 0.2f, 0.2f, 0.5f);
                        button.colors = colors;

                        GameObject buttonText = new GameObject("Text");
                        buttonText.transform.SetParent(buttonGO.transform, false);
                        RectTransform buttonTextRect = buttonText.AddComponent<RectTransform>();
                        buttonTextRect.anchorMin = Vector2.zero;
                        buttonTextRect.anchorMax = Vector2.one;
                        buttonTextRect.sizeDelta = Vector2.zero;
                        TextMeshProUGUI buttonTextComp = buttonText.AddComponent<TextMeshProUGUI>();
                        buttonTextComp.text = "Claim";
                        buttonTextComp.fontSize = 16;
                        buttonTextComp.alignment = TextAlignmentOptions.Center;
                        buttonTextComp.color = Color.white;
                        buttonTextComp.raycastTarget = false; // Don't block button clicks
                    }

                    button.onClick.AddListener(() => OnClaimButtonClicked(milestone.id));
                }
                else if (!usingPrefab)
                {
                    // Show "Claimed" label (only if not using prefab)
                    GameObject claimedLabel = new GameObject("ClaimedLabel");
                    claimedLabel.transform.SetParent(item.transform, false);
                    RectTransform claimedRect = claimedLabel.AddComponent<RectTransform>();
                    claimedRect.sizeDelta = new Vector2(100, 40);
                    TextMeshProUGUI claimedText = claimedLabel.AddComponent<TextMeshProUGUI>();
                    claimedText.text = "Claimed";
                    claimedText.fontSize = 16;
                    claimedText.alignment = TextAlignmentOptions.Center;
                    claimedText.color = new Color(0.6f, 0.6f, 0.6f, 1f);
                }
            }
        }

        private void PopulateMilestonePrefab(GameObject item, Milestone milestone)
        {
            // Find and populate text components in the prefab
            TextMeshProUGUI[] texts = item.GetComponentsInChildren<TextMeshProUGUI>();
            
            if (texts.Length > 0)
            {
                // First text = milestone type
                texts[0].text = milestone.milestone_type;
                if (texts.Length > 1)
                {
                    // Second text = date
                    System.DateTime dateTime = System.DateTimeOffset.FromUnixTimeMilliseconds(milestone.achieved_at).DateTime;
                    texts[1].text = $"Achieved: {dateTime:yyyy-MM-dd HH:mm}";
                }
            }

            // Add reward info if there are more text components
            if (texts.Length > 2 && milestone.reward_coins > 0)
            {
                texts[2].text = $"Coins: {milestone.reward_coins}";
            }

            // If not claimed, ensure button exists
            if (!milestone.IsClaimed)
            {
                Button button = item.GetComponentInChildren<Button>();
                if (button == null && guiProClaimButtonPrefab != null)
                {
                    GameObject btnGO = Instantiate(guiProClaimButtonPrefab, item.transform);
                    button = btnGO.GetComponent<Button>();
                    TextMeshProUGUI btnText = btnGO.GetComponentInChildren<TextMeshProUGUI>();
                    if (btnText != null) btnText.text = "Claim";
                }
                
                if (button != null)
                {
                    button.interactable = true;
                    button.onClick.RemoveAllListeners();
                    button.onClick.AddListener(() => OnClaimButtonClicked(milestone.id));
                }
            }
        }

        private void OnClaimButtonClicked(string milestoneId)
        {
            if (MilestoneManager.Instance == null)
            {
                Debug.LogError("MilestoneManager.Instance is null. Cannot claim milestone.");
                return;
            }

            MilestoneManager.Instance.ClaimMilestone(milestoneId, (success) =>
            {
                if (success)
                {
                    Debug.Log($"Milestone {milestoneId} claimed successfully");
                }
                else
                {
                    Debug.LogError($"Failed to claim milestone {milestoneId}");
                }
            });
        }

        private void OnMilestoneClaimed(Milestone milestone)
        {
            Debug.Log($"Milestone claimed: {milestone.milestone_type}");
            // UI will be updated automatically via OnMilestonesUpdated event
        }
    }
}

