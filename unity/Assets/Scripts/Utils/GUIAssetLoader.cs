using UnityEngine;
using System.IO;

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Helper class to load GUI Pro Bundle prefabs at runtime.
    /// Works in both editor and builds.
    /// </summary>
    public static class GUIAssetLoader
    {
        private static GameObject cachedButtonPrefab;
        private static GameObject cachedPanelPrefab;
        private static GameObject cachedInputFieldPrefab;

        public static GameObject LoadButtonPrefab()
        {
            if (cachedButtonPrefab != null) return cachedButtonPrefab;

#if UNITY_EDITOR
            cachedButtonPrefab = LoadPrefabFromKnownPath("Assets/Layer Lab/GUI Pro-CasualGame/Prefabs/Prefabs_Component_Buttons/Button01_225_BtnText_White.prefab");
            if (cachedButtonPrefab == null)
            {
                cachedButtonPrefab = FindPrefabByName("Button01_225_BtnText_White");
            }
#else
            // Runtime: Try Resources folder first
            cachedButtonPrefab = Resources.Load<GameObject>("GUI/Button01_225_BtnText_White");
#endif
            return cachedButtonPrefab;
        }

        public static GameObject LoadPanelPrefab()
        {
            if (cachedPanelPrefab != null) return cachedPanelPrefab;

#if UNITY_EDITOR
            cachedPanelPrefab = LoadPrefabFromKnownPath("Assets/Layer Lab/GUI Pro-CasualGame/Prefabs/Prefabs_Component_Frames/PanelFrame01_Round_White.prefab");
            if (cachedPanelPrefab == null)
            {
                cachedPanelPrefab = FindPrefabByName("PanelFrame01_Round_White");
            }
#else
            cachedPanelPrefab = Resources.Load<GameObject>("GUI/PanelFrame01_Round_White");
#endif
            return cachedPanelPrefab;
        }

        public static GameObject LoadPopupPrefab()
        {
#if UNITY_EDITOR
            GameObject popup = LoadPrefabFromKnownPath("Assets/Layer Lab/GUI Pro-CasualGame/Prefabs/Prefabs_Component_Popups/Popup_Slide01_White.prefab");
            if (popup == null)
            {
                popup = FindPrefabByName("Popup_Slide01_White");
            }
            return popup;
#else
            return Resources.Load<GameObject>("GUI/Popup_Slide01_White");
#endif
        }

        public static GameObject LoadInputFieldPrefab()
        {
            if (cachedInputFieldPrefab != null) return cachedInputFieldPrefab;

#if UNITY_EDITOR
            cachedInputFieldPrefab = LoadPrefabFromKnownPath("Assets/Layer Lab/GUI Pro-CasualGame/Prefabs/Prefabs_Component_UI_Etc/InputField03_White.prefab");
            if (cachedInputFieldPrefab == null)
            {
                cachedInputFieldPrefab = FindPrefabByName("InputField03_White");
            }
#else
            cachedInputFieldPrefab = Resources.Load<GameObject>("GUI/InputField03_White");
#endif
            return cachedInputFieldPrefab;
        }

#if UNITY_EDITOR
        private static GameObject LoadPrefabFromKnownPath(string path)
        {
            return UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static GameObject FindPrefabByName(string prefabName)
        {
            if (string.IsNullOrEmpty(prefabName))
            {
                return null;
            }

            // Try exact match search
            string filter = $"\"{prefabName}\" t:Prefab";
            string[] guids = UnityEditor.AssetDatabase.FindAssets(filter);
            if (guids == null || guids.Length == 0)
            {
                // Fallback without quotes (broader search)
                guids = UnityEditor.AssetDatabase.FindAssets($"{prefabName} t:Prefab");
            }

            foreach (string guid in guids)
            {
                string assetPath = UnityEditor.AssetDatabase.GUIDToAssetPath(guid);
                if (string.IsNullOrEmpty(assetPath))
                    continue;

                string fileName = Path.GetFileNameWithoutExtension(assetPath);
                if (!string.Equals(fileName, prefabName, System.StringComparison.OrdinalIgnoreCase))
                    continue;

                GameObject prefab = UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
                if (prefab != null)
                {
                    Debug.Log($"[GUIAssetLoader] Loaded '{prefabName}' from '{assetPath}'.");
                    return prefab;
                }
            }

            Debug.LogWarning($"[GUIAssetLoader] Could not find prefab named '{prefabName}'. Using runtime fallback.");
            return null;
        }
#endif
    }
}

