using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace KingdomsPersist.UI
{
    /// <summary>
    /// Helper class to ensure panels have all required components and functionality
    /// </summary>
    public static class PanelHelper
    {
        /// <summary>
        /// Ensures a panel has a working close button
        /// </summary>
        public static Button EnsureCloseButton(GameObject panel, System.Action onClose = null)
        {
            if (panel == null) return null;

            // Look for existing close button
            Button closeBtn = panel.GetComponentInChildren<Button>();
            if (closeBtn != null && (closeBtn.name.Contains("Close") || closeBtn.name.Contains("X")))
            {
                closeBtn.onClick.RemoveAllListeners();
                closeBtn.onClick.AddListener(() =>
                {
                    panel.SetActive(false);
                    onClose?.Invoke();
                });
                return closeBtn;
            }

            // Create close button
            GameObject closeBtnGO = new GameObject("CloseButton");
            closeBtnGO.transform.SetParent(panel.transform, false);
            
            RectTransform rect = closeBtnGO.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(1, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(1, 1);
            rect.anchoredPosition = new Vector2(-10, -10);
            rect.sizeDelta = new Vector2(40, 40);
            
            Image img = closeBtnGO.AddComponent<Image>();
            img.color = new Color(0.8f, 0.2f, 0.2f, 1f);
            
            closeBtn = closeBtnGO.AddComponent<Button>();
            closeBtn.targetGraphic = img;
            closeBtn.interactable = true;
            
            // Button colors for feedback
            ColorBlock colors = closeBtn.colors;
            colors.normalColor = new Color(0.8f, 0.2f, 0.2f, 1f);
            colors.highlightedColor = new Color(1f, 0.3f, 0.3f, 1f);
            colors.pressedColor = new Color(0.6f, 0.1f, 0.1f, 1f);
            closeBtn.colors = colors;
            
            // Text
            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(closeBtnGO.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI text = textGO.AddComponent<TextMeshProUGUI>();
            text.text = "X";
            text.fontSize = 24;
            text.fontStyle = FontStyles.Bold;
            text.alignment = TextAlignmentOptions.Center;
            text.color = Color.white;
            text.raycastTarget = false;
            
            closeBtn.onClick.AddListener(() =>
            {
                panel.SetActive(false);
                onClose?.Invoke();
            });
            
            return closeBtn;
        }

        /// <summary>
        /// Ensures a dropdown has options populated
        /// </summary>
        public static void EnsureDropdownOptions(TMP_Dropdown dropdown, string[] options)
        {
            if (dropdown == null || options == null || options.Length == 0) return;

            dropdown.options.Clear();
            foreach (string option in options)
            {
                dropdown.options.Add(new TMP_Dropdown.OptionData(option));
            }
            dropdown.value = 0;
            dropdown.RefreshShownValue();
        }

        /// <summary>
        /// Creates a properly configured button
        /// </summary>
        public static Button CreateButton(GameObject parent, string name, string text, Vector2 position, Vector2 size, System.Action onClick)
        {
            GameObject btnGO = new GameObject(name);
            btnGO.transform.SetParent(parent.transform, false);
            
            RectTransform rect = btnGO.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            
            Image img = btnGO.AddComponent<Image>();
            img.color = new Color(0.2f, 0.4f, 0.6f, 1f);
            img.raycastTarget = true;
            
            Button button = btnGO.AddComponent<Button>();
            button.targetGraphic = img;
            button.interactable = true;
            
            ColorBlock colors = button.colors;
            colors.normalColor = new Color(0.2f, 0.4f, 0.6f, 1f);
            colors.highlightedColor = new Color(0.3f, 0.5f, 0.7f, 1f);
            colors.pressedColor = new Color(0.1f, 0.3f, 0.5f, 1f);
            colors.disabledColor = new Color(0.2f, 0.2f, 0.2f, 0.5f);
            button.colors = colors;
            
            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(btnGO.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI textComp = textGO.AddComponent<TextMeshProUGUI>();
            textComp.text = text;
            textComp.fontSize = 16;
            textComp.alignment = TextAlignmentOptions.Center;
            textComp.color = Color.white;
            textComp.raycastTarget = false;
            
            button.onClick.AddListener(() => onClick?.Invoke());
            
            return button;
        }

        /// <summary>
        /// Ensures a panel is visible and properly configured
        /// </summary>
        public static void EnsurePanelVisible(GameObject panel, bool visible = true)
        {
            if (panel == null) return;

            // Ensure it has a CanvasGroup for proper interaction
            CanvasGroup canvasGroup = panel.GetComponent<CanvasGroup>();
            if (canvasGroup == null)
            {
                canvasGroup = panel.AddComponent<CanvasGroup>();
            }
            canvasGroup.alpha = visible ? 1f : 0f;
            canvasGroup.interactable = visible;
            canvasGroup.blocksRaycasts = visible;
            
            panel.SetActive(visible);
        }
    }
}


