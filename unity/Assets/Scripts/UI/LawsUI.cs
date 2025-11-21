using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class LawsUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject lawsPanel;
        public Slider taxSlider;
        public Slider marketFeeSlider;
        public TMP_Dropdown rationingDropdown;
        public Button applyButton;
        public Button closeButton;
        public TextMeshProUGUI taxLabel;
        public TextMeshProUGUI marketFeeLabel;
        public TextMeshProUGUI rationingLabel;
        public TextMeshProUGUI currentLawsLabel;

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (lawsPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    lawsPanel = Instantiate(popupPrefab, canvas.transform);
                    lawsPanel.name = "LawsPanel";
                    lawsPanel.SetActive(false);
                    
                    // Fix placeholder text in prefab
                    TextMeshProUGUI[] texts = lawsPanel.GetComponentsInChildren<TextMeshProUGUI>();
                    foreach (TextMeshProUGUI text in texts)
                    {
                        if (text.text == "TEXT" || text.text == "Text" || string.IsNullOrEmpty(text.text))
                        {
                            // Check if it's a title (usually larger font or first text)
                            if (text.fontSize > 20 || text == texts[0])
                            {
                                text.text = "City Laws";
                                text.fontSize = 24;
                                text.fontStyle = FontStyles.Bold;
                                text.color = Color.white;
                                text.alignment = TextAlignmentOptions.Center;
                            }
                        }
                    }
                }
                else
                {
                    // Create panel programmatically if no prefab
                    Canvas canvas = CanvasManager.GetCanvas();
                    lawsPanel = new GameObject("LawsPanel");
                    lawsPanel.transform.SetParent(canvas.transform, false);
                    RectTransform rect = lawsPanel.AddComponent<RectTransform>();
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.sizeDelta = new Vector2(500, 400);
                    rect.anchoredPosition = Vector2.zero;
                    
                    Image bg = lawsPanel.AddComponent<Image>();
                    bg.color = new Color(0.1f, 0.1f, 0.15f, 0.95f);
                    
                    // Create title
                    GameObject titleGO = new GameObject("Title");
                    titleGO.transform.SetParent(lawsPanel.transform, false);
                    RectTransform titleRect = titleGO.AddComponent<RectTransform>();
                    titleRect.anchorMin = new Vector2(0.5f, 1f);
                    titleRect.anchorMax = new Vector2(0.5f, 1f);
                    titleRect.pivot = new Vector2(0.5f, 1f);
                    titleRect.anchoredPosition = new Vector2(0, -20);
                    titleRect.sizeDelta = new Vector2(400, 40);
                    TextMeshProUGUI titleText = titleGO.AddComponent<TextMeshProUGUI>();
                    titleText.text = "City Laws";
                    titleText.fontSize = 24;
                    titleText.fontStyle = FontStyles.Bold;
                    titleText.color = Color.white;
                    titleText.alignment = TextAlignmentOptions.Center;
                    
                    lawsPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            UpdateCurrentLawsDisplay();
            
            // Ensure panel starts closed
            if (lawsPanel != null)
            {
                lawsPanel.SetActive(false);
            }
        }

        private void SetupUI()
        {
            if (lawsPanel == null) return;

            // Setup tax slider
            if (taxSlider == null)
            {
                taxSlider = lawsPanel.transform.Find("TaxSlider")?.GetComponent<Slider>();
                if (taxSlider == null)
                {
                    GameObject sliderGO = new GameObject("TaxSlider");
                    sliderGO.transform.SetParent(lawsPanel.transform, false);
                    RectTransform rect = sliderGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(300, 30);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, 100);
                    taxSlider = sliderGO.AddComponent<Slider>();
                    taxSlider.minValue = 0f;
                    taxSlider.maxValue = 0.05f; // Max 5%
                    taxSlider.value = 0f;
                    taxSlider.onValueChanged.AddListener(OnTaxChanged);
                }
            }

            // Setup market fee slider
            if (marketFeeSlider == null)
            {
                marketFeeSlider = lawsPanel.transform.Find("MarketFeeSlider")?.GetComponent<Slider>();
                if (marketFeeSlider == null)
                {
                    GameObject sliderGO = new GameObject("MarketFeeSlider");
                    sliderGO.transform.SetParent(lawsPanel.transform, false);
                    RectTransform rect = sliderGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(300, 30);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, 50);
                    marketFeeSlider = sliderGO.AddComponent<Slider>();
                    marketFeeSlider.minValue = 0.008f;
                    marketFeeSlider.maxValue = 0.02f;
                    marketFeeSlider.value = 0.01f;
                    marketFeeSlider.onValueChanged.AddListener(OnMarketFeeChanged);
                }
            }

            // Setup rationing dropdown
            if (rationingDropdown == null)
            {
                rationingDropdown = lawsPanel.GetComponentInChildren<TMP_Dropdown>();
                if (rationingDropdown == null)
                {
                    GameObject dropdownGO = new GameObject("RationingDropdown");
                    dropdownGO.transform.SetParent(lawsPanel.transform, false);
                    RectTransform rect = dropdownGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(200, 40);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, 0);
                    rationingDropdown = dropdownGO.AddComponent<TMP_Dropdown>();
                    
                    rationingDropdown.options.Clear();
                    rationingDropdown.options.Add(new TMP_Dropdown.OptionData("normal"));
                    rationingDropdown.options.Add(new TMP_Dropdown.OptionData("strict"));
                    rationingDropdown.options.Add(new TMP_Dropdown.OptionData("abundant"));
                    rationingDropdown.value = 0;
                }
            }

            // Setup labels
            if (taxLabel == null)
            {
                GameObject taxLabelGO = new GameObject("TaxLabel");
                taxLabelGO.transform.SetParent(lawsPanel.transform, false);
                RectTransform rect = taxLabelGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(200, 30);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.anchoredPosition = new Vector2(0, 130);
                taxLabel = taxLabelGO.AddComponent<TextMeshProUGUI>();
                taxLabel.fontSize = 14;
                taxLabel.color = Color.white;
            }

            if (marketFeeLabel == null)
            {
                GameObject feeLabelGO = new GameObject("MarketFeeLabel");
                feeLabelGO.transform.SetParent(lawsPanel.transform, false);
                RectTransform rect = feeLabelGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(200, 30);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.anchoredPosition = new Vector2(0, 80);
                marketFeeLabel = feeLabelGO.AddComponent<TextMeshProUGUI>();
                marketFeeLabel.fontSize = 14;
                marketFeeLabel.color = Color.white;
            }

            if (currentLawsLabel == null)
            {
                GameObject currentLawsLabelGO = new GameObject("CurrentLawsLabel");
                currentLawsLabelGO.transform.SetParent(lawsPanel.transform, false);
                RectTransform rect = currentLawsLabelGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(400, 100);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.anchoredPosition = new Vector2(0, -100);
                currentLawsLabel = currentLawsLabelGO.AddComponent<TextMeshProUGUI>();
                currentLawsLabel.fontSize = 12;
                currentLawsLabel.color = new Color(0.8f, 0.8f, 0.8f, 1f);
            }

            // Setup apply button
            if (applyButton == null)
            {
                applyButton = lawsPanel.transform.Find("ApplyButton")?.GetComponent<Button>();
                if (applyButton == null)
                {
                    GameObject applyBtnGO = new GameObject("ApplyButton");
                    applyBtnGO.transform.SetParent(lawsPanel.transform, false);
                    RectTransform rect = applyBtnGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(150, 40);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, -50);
                    applyButton = applyBtnGO.AddComponent<Button>();
                    Image img = applyBtnGO.AddComponent<Image>();
                    img.color = new Color(0.2f, 0.6f, 0.2f, 1f);
                    applyButton.targetGraphic = img;
                    
                    GameObject textGO = new GameObject("Text");
                    textGO.transform.SetParent(applyBtnGO.transform, false);
                    RectTransform textRect = textGO.AddComponent<RectTransform>();
                    textRect.anchorMin = Vector2.zero;
                    textRect.anchorMax = Vector2.one;
                    textRect.sizeDelta = Vector2.zero;
                    TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
                    text.text = "Apply";
                    text.fontSize = 16;
                    text.alignment = TextAlignmentOptions.Center;
                    text.color = Color.white;
                    text.raycastTarget = false;
                }
            }

            if (applyButton != null)
            {
                applyButton.onClick.AddListener(OnApplyClicked);
            }

            // Setup close button
            if (closeButton == null)
            {
                closeButton = lawsPanel.GetComponentInChildren<Button>();
                if (closeButton != null && closeButton != applyButton)
                {
                    closeButton.onClick.AddListener(ClosePanel);
                }
            }

            UpdateLabels();
        }

        public void ShowPanel()
        {
            if (lawsPanel != null)
            {
                lawsPanel.SetActive(true);
            }
            UpdateCurrentLawsDisplay();
        }

        public void ClosePanel()
        {
            if (lawsPanel != null)
            {
                lawsPanel.SetActive(false);
            }
        }

        private void OnTaxChanged(float value)
        {
            UpdateLabels();
        }

        private void OnMarketFeeChanged(float value)
        {
            UpdateLabels();
        }

        private void UpdateLabels()
        {
            if (taxLabel != null && taxSlider != null)
            {
                taxLabel.text = $"Tax Rate: {(taxSlider.value * 100):F2}%";
            }

            if (marketFeeLabel != null && marketFeeSlider != null)
            {
                marketFeeLabel.text = $"Market Fee: {(marketFeeSlider.value * 100):F2}%";
            }
        }

        private void UpdateCurrentLawsDisplay()
        {
            if (currentLawsLabel == null || GameStateManager.Instance == null) return;

            var cityState = GameStateManager.Instance.currentCityState;
            if (cityState == null || cityState.laws == null) return;

            currentLawsLabel.text = $"Current Laws:\n" +
                                  $"Tax: {(cityState.laws.tax * 100):F2}%\n" +
                                  $"Market Fee: {(cityState.laws.market_fee * 100):F2}%\n" +
                                  $"Rationing: {cityState.laws.rationing}";

            // Update sliders to match current values
            if (taxSlider != null)
            {
                taxSlider.value = cityState.laws.tax;
            }
            if (marketFeeSlider != null)
            {
                marketFeeSlider.value = cityState.laws.market_fee;
            }
            if (rationingDropdown != null)
            {
                int index = rationingDropdown.options.FindIndex(opt => opt.text == cityState.laws.rationing);
                if (index >= 0)
                {
                    rationingDropdown.value = index;
                }
            }
        }

        private void OnApplyClicked()
        {
            if (taxSlider == null || marketFeeSlider == null || rationingDropdown == null || GameStateManager.Instance == null)
            {
                Debug.LogWarning("Required components not assigned");
                return;
            }

            var command = new LawSetCommand
            {
                tax = taxSlider.value,
                market_fee = marketFeeSlider.value,
                rationing = rationingDropdown.options[rationingDropdown.value].text
            };

            GameStateManager.Instance.SubmitCommand(command, (success) =>
            {
                if (success)
                {
                    Debug.Log("Laws updated successfully");
                    UpdateCurrentLawsDisplay();
                    if (lawsPanel != null)
                    {
                        lawsPanel.SetActive(false);
                    }
                }
                else
                {
                    Debug.LogError("Failed to update laws");
                }
            });
        }
    }
}

