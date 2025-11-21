using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class ExpeditionUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject expeditionPanel;
        public TMP_Dropdown expeditionTypeDropdown;
        public TMP_InputField durationInput;
        public Button startButton;
        public Button closeButton;
        public TextMeshProUGUI statusLabel;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (expeditionPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    expeditionPanel = Instantiate(popupPrefab, canvas.transform);
                    expeditionPanel.name = "ExpeditionPanel";
                    expeditionPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
        }

        private void SetupUI()
        {
            if (expeditionPanel == null) return;

            // Setup expedition type dropdown
            if (expeditionTypeDropdown == null)
            {
                GameObject dropdownGO = new GameObject("ExpeditionTypeDropdown");
                dropdownGO.transform.SetParent(expeditionPanel.transform, false);
                RectTransform rect = dropdownGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(200, 40);
                expeditionTypeDropdown = dropdownGO.AddComponent<TMP_Dropdown>();
                
                expeditionTypeDropdown.options.Clear();
                expeditionTypeDropdown.options.Add(new TMP_Dropdown.OptionData("Exploration"));
                expeditionTypeDropdown.options.Add(new TMP_Dropdown.OptionData("Resource Gathering"));
                expeditionTypeDropdown.options.Add(new TMP_Dropdown.OptionData("Combat"));
                expeditionTypeDropdown.value = 0;
            }

            // Setup duration input
            if (durationInput == null)
            {
                GameObject durationGO = new GameObject("DurationInput");
                durationGO.transform.SetParent(expeditionPanel.transform, false);
                RectTransform rect = durationGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(200, 40);
                durationInput = durationGO.AddComponent<TMP_InputField>();
                
                // Create placeholder text
                GameObject placeholderGO = new GameObject("Placeholder");
                placeholderGO.transform.SetParent(durationGO.transform, false);
                RectTransform placeholderRect = placeholderGO.AddComponent<RectTransform>();
                placeholderRect.anchorMin = Vector2.zero;
                placeholderRect.anchorMax = Vector2.one;
                placeholderRect.sizeDelta = Vector2.zero;
                TextMeshProUGUI placeholderText = placeholderGO.AddComponent<TextMeshProUGUI>();
                placeholderText.text = "Duration (hours)";
                placeholderText.fontSize = 14;
                placeholderText.color = new Color(0.5f, 0.5f, 0.5f, 1f);
                placeholderText.alignment = TextAlignmentOptions.Left;
                durationInput.placeholder = placeholderText;
                
                // Create text component for input
                GameObject textGO = new GameObject("Text");
                textGO.transform.SetParent(durationGO.transform, false);
                RectTransform textRect = textGO.AddComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero;
                textRect.anchorMax = Vector2.one;
                textRect.sizeDelta = Vector2.zero;
                TextMeshProUGUI textComponent = textGO.AddComponent<TextMeshProUGUI>();
                textComponent.fontSize = 14;
                textComponent.color = Color.white;
                textComponent.alignment = TextAlignmentOptions.Left;
                durationInput.textComponent = textComponent;
                
                durationInput.contentType = TMP_InputField.ContentType.DecimalNumber;
            }

            if (startButton != null)
            {
                startButton.onClick.AddListener(OnStartExpeditionClicked);
            }
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }
        }

        public void ShowPanel()
        {
            if (expeditionPanel != null)
            {
                expeditionPanel.SetActive(true);
            }
        }

        public void ClosePanel()
        {
            if (expeditionPanel != null)
            {
                expeditionPanel.SetActive(false);
            }
        }

        private void OnStartExpeditionClicked()
        {
            if (expeditionTypeDropdown == null || durationInput == null)
            {
                Debug.LogWarning("Expedition form not fully initialized");
                return;
            }

            if (!float.TryParse(durationInput.text, out float duration) || duration <= 0)
            {
                Debug.LogWarning("Invalid duration");
                return;
            }

            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string expeditionType = expeditionTypeDropdown.options[expeditionTypeDropdown.value].text.ToUpper();
            // Convert hours to ticks (assuming 1 tick = 1 minute, so 1 hour = 60 ticks)
            int durationTicks = Mathf.RoundToInt(duration * 60);
            var command = new ExpeditionStartCommand
            {
                destination = expeditionType,
                duration_ticks = durationTicks,
                hero_ids = new string[0] // Empty for now - could add hero selection UI
            };

            string cityId = GameStateManager.Instance.cityId;
            string userId = GameStateManager.Instance.userId;
            NetworkService.Instance.StartExpedition(cityId, command, (response) =>
            {
                if (response.accepted)
                {
                    Debug.Log($"Expedition started successfully: {response.command_id}");
                    if (statusLabel != null)
                    {
                        statusLabel.text = $"Expedition started! Duration: {duration} hours";
                        statusLabel.color = Color.green;
                    }
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }
                }
                else
                {
                    Debug.LogError($"Expedition rejected: {response.error ?? "Unknown error"}");
                    if (statusLabel != null)
                    {
                        statusLabel.text = $"Failed: {response.error ?? "Unknown error"}";
                        statusLabel.color = Color.red;
                    }
                }
            }, (error) =>
            {
                Debug.LogError($"Start expedition failed: {error}");
                if (statusLabel != null)
                {
                    statusLabel.text = $"Error: {error}";
                    statusLabel.color = Color.red;
                }
            }, userId);
        }
    }
}

