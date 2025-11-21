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
    public class LeaderboardUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject leaderboardPanel;
        public Transform entriesContainer;
        public TMP_Dropdown typeDropdown;
        public Button refreshButton;
        public Button closeButton;

        private LeaderboardResponse currentLeaderboard;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (leaderboardPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    leaderboardPanel = Instantiate(popupPrefab, canvas.transform);
                    leaderboardPanel.name = "LeaderboardPanel";
                    leaderboardPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshLeaderboard();
        }

        private void SetupUI()
        {
            if (leaderboardPanel == null) return;

            // Setup type dropdown
            if (typeDropdown == null)
            {
                GameObject dropdownGO = new GameObject("TypeDropdown");
                dropdownGO.transform.SetParent(leaderboardPanel.transform, false);
                RectTransform rect = dropdownGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(200, 40);
                rect.anchorMin = new Vector2(0, 1);
                rect.anchorMax = new Vector2(0, 1);
                rect.pivot = new Vector2(0, 1);
                rect.anchoredPosition = new Vector2(20, -20);
                typeDropdown = dropdownGO.AddComponent<TMP_Dropdown>();
                
                typeDropdown.options.Clear();
                typeDropdown.options.Add(new TMP_Dropdown.OptionData("Power"));
                typeDropdown.options.Add(new TMP_Dropdown.OptionData("Coins"));
                typeDropdown.options.Add(new TMP_Dropdown.OptionData("Gems"));
                typeDropdown.value = 0;
                typeDropdown.onValueChanged.AddListener(OnTypeChanged);
            }

            if (refreshButton != null)
            {
                refreshButton.onClick.AddListener(RefreshLeaderboard);
            }
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }
        }

        public void ShowPanel()
        {
            if (leaderboardPanel != null)
            {
                leaderboardPanel.SetActive(true);
            }
            RefreshLeaderboard();
        }

        public void ClosePanel()
        {
            if (leaderboardPanel != null)
            {
                leaderboardPanel.SetActive(false);
            }
        }

        private void OnTypeChanged(int index)
        {
            RefreshLeaderboard();
        }

        private void RefreshLeaderboard()
        {
            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService not initialized");
                return;
            }

            string type = "power";
            if (typeDropdown != null && typeDropdown.options.Count > typeDropdown.value)
            {
                type = typeDropdown.options[typeDropdown.value].text.ToLower();
            }

            NetworkService.Instance.GetLeaderboard(type, (response) =>
            {
                if (response == null || response.entries == null)
                {
                    Debug.LogError("Failed to get leaderboard");
                    return;
                }

                currentLeaderboard = response;
                UpdateDisplay();
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch leaderboard: {error}");
            });
        }

        private void UpdateDisplay()
        {
            if (currentLeaderboard == null || currentLeaderboard.entries == null) return;

            if (entriesContainer == null) return;

            // Clear existing
            foreach (Transform child in entriesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Display entries
            foreach (var entry in currentLeaderboard.entries)
            {
                CreateEntry(entry);
            }
        }

        private void CreateEntry(LeaderboardEntry entry)
        {
            GameObject entryGO = new GameObject($"Entry_{entry.rank}");
            entryGO.transform.SetParent(entriesContainer, false);

            RectTransform rect = entryGO.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 50);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = entryGO.AddComponent<Image>();
            bg.color = entry.rank <= 3 ? new Color(0.3f, 0.2f, 0.1f, 0.8f) : new Color(0.2f, 0.2f, 0.3f, 0.8f);

            HorizontalLayoutGroup layout = entryGO.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            GameObject rankLabel = new GameObject("RankLabel");
            rankLabel.transform.SetParent(entryGO.transform, false);
            RectTransform rankRect = rankLabel.AddComponent<RectTransform>();
            rankRect.sizeDelta = new Vector2(60, 0);
            TextMeshProUGUI rankText = rankLabel.AddComponent<TextMeshProUGUI>();
            rankText.text = $"#{entry.rank}";
            rankText.fontSize = 18;
            rankText.fontStyle = FontStyles.Bold;
            rankText.color = entry.rank <= 3 ? Color.yellow : Color.white;

            GameObject nameLabel = new GameObject("NameLabel");
            nameLabel.transform.SetParent(entryGO.transform, false);
            RectTransform nameRect = nameLabel.AddComponent<RectTransform>();
            nameRect.sizeDelta = new Vector2(200, 0);
            TextMeshProUGUI nameText = nameLabel.AddComponent<TextMeshProUGUI>();
            nameText.text = entry.username ?? entry.userId;
            nameText.fontSize = 16;
            nameText.color = Color.white;

            GameObject valueLabel = new GameObject("ValueLabel");
            valueLabel.transform.SetParent(entryGO.transform, false);
            RectTransform valueRect = valueLabel.AddComponent<RectTransform>();
            valueRect.sizeDelta = new Vector2(150, 0);
            TextMeshProUGUI valueText = valueLabel.AddComponent<TextMeshProUGUI>();
            valueText.text = entry.value.ToString("N0");
            valueText.fontSize = 16;
            valueText.fontStyle = FontStyles.Bold;
            valueText.color = new Color(1f, 0.84f, 0f, 1f);
            valueText.alignment = TextAlignmentOptions.Right;
        }
    }
}


