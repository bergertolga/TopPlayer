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
    public class DailyRewardsUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject dailyRewardsPanel;
        public Transform rewardsContainer;
        public Button claimButton;
        public Button closeButton;
        public TextMeshProUGUI statusLabel;

        private DailyRewardsStatusResponse currentStatus;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (dailyRewardsPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    dailyRewardsPanel = Instantiate(popupPrefab, canvas.transform);
                    dailyRewardsPanel.name = "DailyRewardsPanel";
                    dailyRewardsPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshStatus();
        }

        private void SetupUI()
        {
            if (dailyRewardsPanel == null) return;

            if (claimButton != null)
            {
                claimButton.onClick.AddListener(OnClaimClicked);
            }
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }
        }

        public void ShowPanel()
        {
            if (dailyRewardsPanel != null)
            {
                dailyRewardsPanel.SetActive(true);
            }
            RefreshStatus();
        }

        public void ClosePanel()
        {
            if (dailyRewardsPanel != null)
            {
                dailyRewardsPanel.SetActive(false);
            }
        }

        private void RefreshStatus()
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }
            NetworkService.Instance.GetDailyRewardsStatus(userId, (response) =>
            {
                if (response == null)
                {
                    Debug.LogError("Failed to get daily rewards status");
                    return;
                }

                currentStatus = response;
                UpdateDisplay();
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch daily rewards status: {error}");
            });
        }

        private void UpdateDisplay()
        {
            if (currentStatus == null) return;

            if (statusLabel != null)
            {
                if (currentStatus.canClaim)
                {
                    statusLabel.text = $"Day {currentStatus.day} - Ready to claim!";
                    statusLabel.color = Color.green;
                }
                else
                {
                    System.DateTime nextClaim = System.DateTimeOffset.FromUnixTimeSeconds(currentStatus.nextClaimTime).DateTime;
                    statusLabel.text = $"Day {currentStatus.day} - Next claim: {nextClaim:HH:mm:ss}";
                    statusLabel.color = Color.yellow;
                }
            }

            if (claimButton != null)
            {
                claimButton.interactable = currentStatus.canClaim;
            }

            UpdateRewardsDisplay();
        }

        private void UpdateRewardsDisplay()
        {
            if (rewardsContainer == null || currentStatus.rewards == null) return;

            // Clear existing
            foreach (Transform child in rewardsContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Display rewards
            foreach (var reward in currentStatus.rewards)
            {
                CreateRewardEntry(reward);
            }
        }

        private void CreateRewardEntry(DailyReward reward)
        {
            GameObject entry = new GameObject($"Reward_Day{reward.day}");
            entry.transform.SetParent(rewardsContainer, false);

            RectTransform rect = entry.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 60);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = entry.AddComponent<Image>();
            bg.color = reward.claimed ? new Color(0.3f, 0.3f, 0.3f, 0.8f) : new Color(0.2f, 0.4f, 0.2f, 0.8f);

            HorizontalLayoutGroup layout = entry.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            GameObject dayLabel = new GameObject("DayLabel");
            dayLabel.transform.SetParent(entry.transform, false);
            RectTransform dayRect = dayLabel.AddComponent<RectTransform>();
            dayRect.sizeDelta = new Vector2(80, 0);
            TextMeshProUGUI dayText = dayLabel.AddComponent<TextMeshProUGUI>();
            dayText.text = $"Day {reward.day}";
            dayText.fontSize = 18;
            dayText.fontStyle = FontStyles.Bold;
            dayText.color = Color.white;

            GameObject rewardsLabel = new GameObject("RewardsLabel");
            rewardsLabel.transform.SetParent(entry.transform, false);
            RectTransform rewardsRect = rewardsLabel.AddComponent<RectTransform>();
            rewardsRect.sizeDelta = new Vector2(200, 0);
            TextMeshProUGUI rewardsText = rewardsLabel.AddComponent<TextMeshProUGUI>();
            rewardsText.text = $"{reward.coins} coins, {reward.gems} gems";
            rewardsText.fontSize = 14;
            rewardsText.color = Color.white;

            if (reward.claimed)
            {
                GameObject claimedLabel = new GameObject("ClaimedLabel");
                claimedLabel.transform.SetParent(entry.transform, false);
                RectTransform claimedRect = claimedLabel.AddComponent<RectTransform>();
                claimedRect.sizeDelta = new Vector2(100, 0);
                TextMeshProUGUI claimedText = claimedLabel.AddComponent<TextMeshProUGUI>();
                claimedText.text = "✓ Claimed";
                claimedText.fontSize = 14;
                claimedText.color = Color.green;
            }
        }

        private void OnClaimClicked()
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            if (!currentStatus.canClaim)
            {
                Debug.LogWarning("Cannot claim reward yet");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }
            NetworkService.Instance.ClaimDailyReward(userId, (response) =>
            {
                if (response.success)
                {
                    Debug.Log($"Daily reward claimed successfully");
                    RefreshStatus();
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }
                }
                else
                {
                    Debug.LogError($"Claim failed: {response.error ?? "Unknown error"}");
                }
            }, (error) =>
            {
                Debug.LogError($"Claim daily reward failed: {error}");
            });
        }
    }
}


