using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class TrainingUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject trainingPanel;
        public TMP_Dropdown unitDropdown;
        public TMP_InputField quantityInput;
        public Button trainButton;
        public Button closeButton;
        public TextMeshProUGUI costLabel;
        public Transform unitsContainer;

        private readonly Dictionary<string, UnitCost> unitCosts = new Dictionary<string, UnitCost>
        {
            { "WARRIOR", new UnitCost { coins = 50, wood = 10, food = 5 } },
            { "ARCHER", new UnitCost { coins = 40, wood = 15, food = 5 } },
            { "CAVALRY", new UnitCost { coins = 100, wood = 5, food = 20 } },
            { "SPEARMAN", new UnitCost { coins = 60, wood = 10, food = 10 } }
        };

        private class UnitCost
        {
            public int coins;
            public int wood;
            public int food;
        }

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (trainingPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    trainingPanel = Instantiate(popupPrefab, canvas.transform);
                    trainingPanel.name = "TrainingPanel";
                    trainingPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            UpdateUnitsDisplay();
        }

        private void SetupUI()
        {
            if (trainingPanel == null) return;

            // Setup unit dropdown
            if (unitDropdown == null)
            {
                unitDropdown = trainingPanel.GetComponentInChildren<TMP_Dropdown>();
                if (unitDropdown == null)
                {
                    GameObject dropdownGO = new GameObject("UnitDropdown");
                    dropdownGO.transform.SetParent(trainingPanel.transform, false);
                    RectTransform rect = dropdownGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(200, 40);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, 100);
                    unitDropdown = dropdownGO.AddComponent<TMP_Dropdown>();
                    
                    unitDropdown.options.Clear();
                    foreach (var unit in unitCosts.Keys)
                    {
                        unitDropdown.options.Add(new TMP_Dropdown.OptionData(unit));
                    }
                    unitDropdown.value = 0;
                    unitDropdown.onValueChanged.AddListener(OnUnitSelected);
                }
            }

            // Setup quantity input
            if (quantityInput == null)
            {
                quantityInput = trainingPanel.GetComponentInChildren<TMP_InputField>();
                if (quantityInput == null)
                {
                    GameObject inputGO = new GameObject("QuantityInput");
                    inputGO.transform.SetParent(trainingPanel.transform, false);
                    RectTransform rect = inputGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(200, 40);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, 50);
                    quantityInput = inputGO.AddComponent<TMP_InputField>();
                    quantityInput.contentType = TMP_InputField.ContentType.IntegerNumber;
                    quantityInput.text = "1";
                    quantityInput.onValueChanged.AddListener(OnQuantityChanged);
                }
            }

            // Setup cost label
            if (costLabel == null)
            {
                GameObject costLabelGO = new GameObject("CostLabel");
                costLabelGO.transform.SetParent(trainingPanel.transform, false);
                RectTransform rect = costLabelGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(300, 60);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.anchoredPosition = new Vector2(0, 0);
                costLabel = costLabelGO.AddComponent<TextMeshProUGUI>();
                costLabel.fontSize = 14;
                costLabel.color = Color.white;
            }

            // Setup train button
            if (trainButton == null)
            {
                trainButton = trainingPanel.transform.Find("TrainButton")?.GetComponent<Button>();
                if (trainButton == null)
                {
                    GameObject trainBtnGO = new GameObject("TrainButton");
                    trainBtnGO.transform.SetParent(trainingPanel.transform, false);
                    RectTransform rect = trainBtnGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(150, 40);
                    rect.anchorMin = new Vector2(0.5f, 0.5f);
                    rect.anchorMax = new Vector2(0.5f, 0.5f);
                    rect.pivot = new Vector2(0.5f, 0.5f);
                    rect.anchoredPosition = new Vector2(0, -50);
                    trainButton = trainBtnGO.AddComponent<Button>();
                    Image img = trainBtnGO.AddComponent<Image>();
                    img.color = new Color(0.2f, 0.6f, 0.2f, 1f);
                    trainButton.targetGraphic = img;
                    
                    GameObject textGO = new GameObject("Text");
                    textGO.transform.SetParent(trainBtnGO.transform, false);
                    RectTransform textRect = textGO.AddComponent<RectTransform>();
                    textRect.anchorMin = Vector2.zero;
                    textRect.anchorMax = Vector2.one;
                    textRect.sizeDelta = Vector2.zero;
                    TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
                    text.text = "Train";
                    text.fontSize = 16;
                    text.alignment = TextAlignmentOptions.Center;
                    text.color = Color.white;
                    text.raycastTarget = false;
                }
            }

            if (trainButton != null)
            {
                trainButton.onClick.AddListener(OnTrainClicked);
            }

            // Setup close button - ensure it exists and works
            if (closeButton == null)
            {
                Button[] buttons = trainingPanel.GetComponentsInChildren<Button>();
                foreach (Button btn in buttons)
                {
                    if (btn != trainButton && (btn.name.Contains("Close") || btn.name.Contains("X")))
                    {
                        closeButton = btn;
                        break;
                    }
                }
            }
            
            // Use helper to ensure close button works
            if (trainingPanel != null)
            {
                closeButton = PanelHelper.EnsureCloseButton(trainingPanel, ClosePanel);
            }
            
            // Ensure dropdown has options
            if (unitDropdown != null)
            {
                string[] unitTypes = new string[unitCosts.Keys.Count];
                unitCosts.Keys.CopyTo(unitTypes, 0);
                PanelHelper.EnsureDropdownOptions(unitDropdown, unitTypes);
            }

            UpdateCostDisplay();
        }

        public void ShowPanel()
        {
            if (trainingPanel != null)
            {
                trainingPanel.SetActive(true);
            }
            UpdateUnitsDisplay();
        }

        public void ClosePanel()
        {
            if (trainingPanel != null)
            {
                trainingPanel.SetActive(false);
            }
        }

        private void OnUnitSelected(int index)
        {
            UpdateCostDisplay();
        }

        private void OnQuantityChanged(string value)
        {
            UpdateCostDisplay();
        }

        private void UpdateCostDisplay()
        {
            if (unitDropdown == null || quantityInput == null || costLabel == null) return;

            string selectedUnit = unitDropdown.options[unitDropdown.value].text;
            if (!unitCosts.ContainsKey(selectedUnit)) return;

            if (!int.TryParse(quantityInput.text, out int qty) || qty <= 0)
            {
                costLabel.text = "Invalid quantity";
                return;
            }

            var cost = unitCosts[selectedUnit];
            costLabel.text = $"Cost for {qty}x {selectedUnit}:\n" +
                           $"Coins: {cost.coins * qty}\n" +
                           $"Wood: {cost.wood * qty}\n" +
                           $"Food: {cost.food * qty}";
        }

        private void UpdateUnitsDisplay()
        {
            if (unitsContainer == null || GameStateManager.Instance == null) return;

            var cityState = GameStateManager.Instance.currentCityState;
            if (cityState == null || cityState.units == null) return;

            // Clear existing
            foreach (Transform child in unitsContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Display units
            foreach (var unit in cityState.units)
            {
                GameObject unitItem = new GameObject($"Unit_{unit.Key}");
                unitItem.transform.SetParent(unitsContainer, false);

                RectTransform rect = unitItem.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(0, 30);
                rect.anchorMin = new Vector2(0, 1);
                rect.anchorMax = new Vector2(1, 1);
                rect.pivot = new Vector2(0, 1);

                Image bg = unitItem.AddComponent<Image>();
                bg.color = new Color(0.2f, 0.2f, 0.3f, 1f);

                TextMeshProUGUI text = unitItem.AddComponent<TextMeshProUGUI>();
                text.text = $"{unit.Key}: {unit.Value}";
                text.fontSize = 14;
                text.color = Color.white;
            }
        }

        private void OnTrainClicked()
        {
            if (unitDropdown == null || quantityInput == null || GameStateManager.Instance == null)
            {
                Debug.LogWarning("Required components not assigned");
                return;
            }

            string selectedUnit = unitDropdown.options[unitDropdown.value].text;
            if (!int.TryParse(quantityInput.text, out int qty) || qty <= 0)
            {
                Debug.LogWarning("Invalid quantity");
                return;
            }

            var command = new TrainCommand
            {
                unit = selectedUnit,
                qty = qty
            };

            GameStateManager.Instance.SubmitCommand(command, (success) =>
            {
                if (success)
                {
                    Debug.Log($"Training command submitted: {qty}x {selectedUnit}");
                    UpdateUnitsDisplay();
                    if (trainingPanel != null)
                    {
                        trainingPanel.SetActive(false);
                    }
                }
                else
                {
                    Debug.LogError("Failed to submit training command");
                }
            });
        }
    }
}

