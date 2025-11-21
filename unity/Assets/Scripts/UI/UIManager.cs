using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    /// <summary>
    /// Centralized UI Manager for handling panel navigation and GUI Pro Bundle integration.
    /// This manager helps coordinate between different UI panels and provides easy access
    /// to GUI Pro Bundle prefabs if available.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        [Header("GUI Pro Bundle Prefabs")]
        [Tooltip("GUI Pro Bundle button prefab (optional). Will be used by UI components if available.")]
        public GameObject guiProButtonPrefab;
        
        [Tooltip("GUI Pro Bundle panel prefab (optional). Will be used by UI components if available.")]
        public GameObject guiProPanelPrefab;
        
        [Tooltip("GUI Pro Bundle input field prefab (optional).")]
        public GameObject guiProInputFieldPrefab;
        
        [Tooltip("GUI Pro Bundle dropdown prefab (optional).")]
        public GameObject guiProDropdownPrefab;

        [Header("UI Panels")]
        public GameObject cityUIPanel;
        public GameObject milestoneUIPanel;
        public GameObject buildPanel;
        public GameObject trainingPanel;
        public GameObject marketPanel;
        public GameObject lawsPanel;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }

            // Auto-load GUI Pro Bundle prefabs if not assigned
            LoadGUIAssets();
        }

        public static UIManager RequireInstance()
        {
            if (Instance != null)
            {
                return Instance;
            }

            GameObject managerGO = new GameObject("UIManager");
            return managerGO.AddComponent<UIManager>();
        }

        private void LoadGUIAssets()
        {
            if (guiProButtonPrefab == null)
            {
                guiProButtonPrefab = GUIAssetLoader.LoadButtonPrefab();
            }
            
            if (guiProPanelPrefab == null)
            {
                guiProPanelPrefab = GUIAssetLoader.LoadPanelPrefab();
            }
            
            if (guiProInputFieldPrefab == null)
            {
                guiProInputFieldPrefab = GUIAssetLoader.LoadInputFieldPrefab();
            }
        }

        /// <summary>
        /// Shows a panel and hides others (optional).
        /// </summary>
        public void ShowPanel(GameObject panel, bool hideOthers = false)
        {
            if (panel == null) return;

            if (hideOthers)
            {
                HideAllPanels();
            }

            panel.SetActive(true);
        }

        /// <summary>
        /// Hides a specific panel.
        /// </summary>
        public void HidePanel(GameObject panel)
        {
            if (panel != null)
            {
                panel.SetActive(false);
            }
        }

        /// <summary>
        /// Hides all UI panels.
        /// </summary>
        public void HideAllPanels()
        {
            if (cityUIPanel != null) cityUIPanel.SetActive(false);
            if (milestoneUIPanel != null) milestoneUIPanel.SetActive(false);
            if (buildPanel != null) buildPanel.SetActive(false);
            if (trainingPanel != null) trainingPanel.SetActive(false);
            if (marketPanel != null) marketPanel.SetActive(false);
            if (lawsPanel != null) lawsPanel.SetActive(false);
        }

        /// <summary>
        /// Creates a button using GUI Pro Bundle prefab if available, otherwise creates programmatically.
        /// </summary>
        public Button CreateButton(Transform parent, string text, UnityEngine.Events.UnityAction onClick)
        {
            GameObject buttonGO;
            Button button;

            if (guiProButtonPrefab != null)
            {
                buttonGO = Instantiate(guiProButtonPrefab, parent);
                button = buttonGO.GetComponent<Button>();
                if (button == null)
                {
                    button = buttonGO.AddComponent<Button>();
                }

                // Try to find and update text
                TextMeshProUGUI buttonText = buttonGO.GetComponentInChildren<TextMeshProUGUI>();
                if (buttonText != null)
                {
                    buttonText.text = text;
                }

                GUIThemeHelper.StripPlaceholderTexts(buttonGO.transform);
            }
            else
            {
                // Create button programmatically
                buttonGO = new GameObject("Button");
                buttonGO.transform.SetParent(parent, false);
                RectTransform rect = buttonGO.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(100, 40);
                button = buttonGO.AddComponent<Button>();
                Image image = buttonGO.AddComponent<Image>();
                image.color = new Color(0.2f, 0.6f, 0.2f, 1f);
                button.targetGraphic = image;

                GameObject textGO = new GameObject("Text");
                textGO.transform.SetParent(buttonGO.transform, false);
                RectTransform textRect = textGO.AddComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero;
                textRect.anchorMax = Vector2.one;
                textRect.sizeDelta = Vector2.zero;
                TextMeshProUGUI textComp = textGO.AddComponent<TextMeshProUGUI>();
                textComp.text = text;
                textComp.fontSize = 16;
                textComp.alignment = TextAlignmentOptions.Center;
                textComp.color = Color.white;
            }

            if (onClick != null)
            {
                button.onClick.AddListener(onClick);
            }

            return button;
        }

        /// <summary>
        /// Creates a panel using GUI Pro Bundle prefab if available, otherwise creates programmatically.
        /// </summary>
        public GameObject CreatePanel(Transform parent, string name)
        {
            GameObject panel;

            if (guiProPanelPrefab != null)
            {
                panel = Instantiate(guiProPanelPrefab, parent);
                panel.name = name;
                GUIThemeHelper.StripPlaceholderTexts(panel.transform);
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
                bg.color = new Color(0.2f, 0.2f, 0.2f, 0.95f);
            }

            return panel;
        }
    }
}

