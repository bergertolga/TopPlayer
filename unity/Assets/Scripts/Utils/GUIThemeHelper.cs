using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Object = UnityEngine.Object;

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Shared helpers for applying the Layer Lab GUI styling in code.
    /// </summary>
    public static class GUIThemeHelper
    {
        public static void StripPlaceholderTexts(Transform root)
        {
            if (root == null) return;

            foreach (var tmp in root.GetComponentsInChildren<TextMeshProUGUI>(true))
            {
                if (IsPlaceholderToken(tmp.text))
                {
                    tmp.text = string.Empty;
                }
            }

            foreach (var legacy in root.GetComponentsInChildren<Text>(true))
            {
                if (IsPlaceholderToken(legacy.text))
                {
                    legacy.text = string.Empty;
                }
            }
        }

        private static bool IsPlaceholderToken(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return string.Equals(value.Trim(), "text", StringComparison.OrdinalIgnoreCase);
        }

        public static GameObject CreatePanelCard(Transform parent, string name, float preferredHeight, float preferredWidth = -1f)
        {
            GameObject prefab = GUIAssetLoader.LoadPanelPrefab();
            GameObject card;
            if (prefab != null)
            {
                card = Object.Instantiate(prefab, parent);
            }
            else
            {
                card = new GameObject(name);
                card.transform.SetParent(parent, false);
                var image = card.GetComponent<Image>() ?? card.AddComponent<Image>();
                image.color = new Color(0.16f, 0.2f, 0.3f, 0.95f);
            }

            card.name = name;
            RectTransform rect = card.GetComponent<RectTransform>() ?? card.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, preferredHeight);

            StripPlaceholderTexts(card.transform);

            LayoutElement layout = card.GetComponent<LayoutElement>() ?? card.AddComponent<LayoutElement>();
            layout.preferredHeight = preferredHeight;
            layout.minHeight = preferredHeight * 0.8f;
            if (preferredWidth > 0f)
            {
                layout.preferredWidth = preferredWidth;
                layout.minWidth = preferredWidth * 0.8f;
            }

            return card;
        }

        public static TextMeshProUGUI CreateLabel(Transform parent, string name, string text, float fontSize, FontStyles style, TextAlignmentOptions alignment, Color? color = null)
        {
            GameObject labelGO = new GameObject(name);
            labelGO.transform.SetParent(parent, false);

            TextMeshProUGUI tmp = labelGO.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = fontSize;
            tmp.fontStyle = style;
            tmp.alignment = alignment;
            tmp.color = color ?? Color.white;
            tmp.raycastTarget = false;

            return tmp;
        }
    }
}

