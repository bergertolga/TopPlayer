using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.UI;

namespace KingdomsPersist.UI
{
    /// <summary>
    /// Helper script to automatically set up CityUI references.
    /// Attach this to CityUI GameObject and it will find/create all required UI elements.
    /// </summary>
    [RequireComponent(typeof(CityUI))]
    public class SetupCityUI : MonoBehaviour
    {
        private void Awake()
        {
            var cityUI = GetComponent<CityUI>();
            if (cityUI == null) return;

            // Find or create UI elements
            SetupUIElements(cityUI);
        }

        private void SetupUIElements(CityUI cityUI)
        {
            // Find Canvas
            Canvas canvas = FindObjectOfType<Canvas>();
            if (canvas == null)
            {
                Debug.LogError("No Canvas found in scene!");
                return;
            }

            // Create header labels
            if (cityUI.tickLabel == null)
            {
                cityUI.tickLabel = CreateLabel("TickLabel", "Tick: 0", new Vector2(10, -10), canvas.transform);
            }

            if (cityUI.versionLabel == null)
            {
                cityUI.versionLabel = CreateLabel("VersionLabel", "Version: 0", new Vector2(10, -40), canvas.transform);
            }

            // Create containers
            if (cityUI.resourcesContainer == null)
            {
                cityUI.resourcesContainer = CreateContainer("ResourcesContainer", new Vector2(10, -100), canvas.transform);
            }

            if (cityUI.buildingsContainer == null)
            {
                cityUI.buildingsContainer = CreateContainer("BuildingsContainer", new Vector2(10, -300), canvas.transform);
            }

            if (cityUI.queuesContainer == null)
            {
                cityUI.queuesContainer = CreateContainer("QueuesContainer", new Vector2(10, -500), canvas.transform);
            }

            // Prefabs are no longer needed - UI elements are created directly in CityUI
            // Keeping prefab fields for backwards compatibility, but they're not used

            // Create Build Panel
            if (cityUI.buildPanel == null)
            {
                cityUI.buildPanel = CreateBuildPanel(canvas.transform);
            }

            // Find Build Panel components
            if (cityUI.buildPanel != null)
            {
                if (cityUI.buildingDropdown == null)
                {
                    cityUI.buildingDropdown = cityUI.buildPanel.GetComponentInChildren<TMP_Dropdown>();
                }

                if (cityUI.slotInput == null)
                {
                    cityUI.slotInput = cityUI.buildPanel.GetComponentInChildren<TMP_InputField>();
                }

                if (cityUI.buildButton == null)
                {
                    cityUI.buildButton = cityUI.buildPanel.GetComponentInChildren<Button>();
                }
            }

            Debug.Log("CityUI setup complete!");
        }

        private TextMeshProUGUI CreateLabel(string name, string text, Vector2 position, Transform parent)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);

            RectTransform rect = go.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(0, 1);
            rect.pivot = new Vector2(0, 1);
            rect.anchoredPosition = position;
            rect.sizeDelta = new Vector2(300, 30);

            TextMeshProUGUI label = go.AddComponent<TextMeshProUGUI>();
            label.text = text;
            label.fontSize = 18;
            label.color = Color.white;

            return label;
        }

        private Transform CreateContainer(string name, Vector2 position, Transform parent)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);

            RectTransform rect = go.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(0.5f, 1);
            rect.pivot = new Vector2(0, 1);
            rect.anchoredPosition = position;
            rect.sizeDelta = new Vector2(400, 200);

            VerticalLayoutGroup layout = go.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 5;
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;

            ContentSizeFitter fitter = go.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            return go.transform;
        }

        private GameObject CreateBuildPanel(Transform parent)
        {
            GameObject panel = new GameObject("BuildPanel");
            panel.transform.SetParent(parent, false);

            RectTransform rect = panel.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(400, 300);

            Image bg = panel.AddComponent<Image>();
            bg.color = new Color(0.2f, 0.2f, 0.2f, 0.95f);

            VerticalLayoutGroup layout = panel.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(20, 20, 20, 20);
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;

            // Title
            GameObject title = new GameObject("Title");
            title.transform.SetParent(panel.transform, false);
            RectTransform titleRect = title.AddComponent<RectTransform>();
            titleRect.sizeDelta = new Vector2(0, 40);
            TextMeshProUGUI titleText = title.AddComponent<TextMeshProUGUI>();
            titleText.text = "Build Building";
            titleText.fontSize = 24;
            titleText.alignment = TextAlignmentOptions.Center;
            titleText.color = Color.white;

            // Dropdown
            GameObject dropdownGO = new GameObject("BuildingDropdown");
            dropdownGO.transform.SetParent(panel.transform, false);
            RectTransform dropdownRect = dropdownGO.AddComponent<RectTransform>();
            dropdownRect.sizeDelta = new Vector2(0, 40);
            TMP_Dropdown dropdown = dropdownGO.AddComponent<TMP_Dropdown>();
            dropdown.options.Add(new TMP_Dropdown.OptionData("b_fields"));
            dropdown.options.Add(new TMP_Dropdown.OptionData("b_lumber"));
            dropdown.options.Add(new TMP_Dropdown.OptionData("b_kiln"));
            dropdown.options.Add(new TMP_Dropdown.OptionData("b_barracks"));
            dropdown.value = 0;

            // Input Field
            GameObject inputGO = new GameObject("SlotInput");
            inputGO.transform.SetParent(panel.transform, false);
            RectTransform inputRect = inputGO.AddComponent<RectTransform>();
            inputRect.sizeDelta = new Vector2(0, 40);
            TMP_InputField input = inputGO.AddComponent<TMP_InputField>();
            
            // Create placeholder text
            GameObject placeholderGO = new GameObject("Placeholder");
            placeholderGO.transform.SetParent(inputGO.transform, false);
            RectTransform placeholderRect = placeholderGO.AddComponent<RectTransform>();
            placeholderRect.anchorMin = Vector2.zero;
            placeholderRect.anchorMax = Vector2.one;
            placeholderRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI placeholderText = placeholderGO.AddComponent<TextMeshProUGUI>();
            placeholderText.text = "Enter slot number";
            placeholderText.color = new Color(1, 1, 1, 0.5f);
            input.placeholder = placeholderText;
            
            // Create text component
            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(inputGO.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI textComp = textGO.AddComponent<TextMeshProUGUI>();
            textComp.color = Color.white;
            input.textComponent = textComp;

            // Button
            GameObject buttonGO = new GameObject("BuildButton");
            buttonGO.transform.SetParent(panel.transform, false);
            RectTransform buttonRect = buttonGO.AddComponent<RectTransform>();
            buttonRect.sizeDelta = new Vector2(0, 50);
            Button button = buttonGO.AddComponent<Button>();
            Image buttonImage = buttonGO.AddComponent<Image>();
            buttonImage.color = new Color(0.2f, 0.6f, 0.2f, 1f);
            button.targetGraphic = buttonImage;

            GameObject buttonText = new GameObject("Text");
            buttonText.transform.SetParent(buttonGO.transform, false);
            RectTransform buttonTextRect = buttonText.AddComponent<RectTransform>();
            buttonTextRect.anchorMin = Vector2.zero;
            buttonTextRect.anchorMax = Vector2.one;
            buttonTextRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI buttonTextComp = buttonText.AddComponent<TextMeshProUGUI>();
            buttonTextComp.text = "Build";
            buttonTextComp.fontSize = 20;
            buttonTextComp.alignment = TextAlignmentOptions.Center;
            buttonTextComp.color = Color.white;

            panel.SetActive(false); // Hidden by default

            return panel;
        }
    }
}

