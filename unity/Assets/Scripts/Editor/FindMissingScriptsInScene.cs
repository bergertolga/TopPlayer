#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using System.Collections.Generic;

namespace KingdomsPersist.Editor
{
    public class FindMissingScriptsInScene : EditorWindow
    {
        [MenuItem("Kingdom Ledger/Find Missing Script (Quick Fix)")]
        public static void QuickFixMissingScript()
        {
            int count = 0;
            List<GameObject> objectsWithMissingScripts = new List<GameObject>();
            
            // Get all GameObjects in the scene (including inactive)
            GameObject[] allObjects = Object.FindObjectsOfType<GameObject>(true);
            
            foreach (GameObject go in allObjects)
            {
                // Check if this GameObject has missing scripts
                Component[] components = go.GetComponents<Component>();
                bool hasMissing = false;
                
                foreach (Component comp in components)
                {
                    if (comp == null)
                    {
                        hasMissing = true;
                        break;
                    }
                }
                
                if (hasMissing)
                {
                    objectsWithMissingScripts.Add(go);
                    count++;
                    
                    // Try to remove missing scripts
                    GameObjectUtility.RemoveMonoBehavioursWithMissingScript(go);
                }
            }
            
            if (count == 0)
            {
                EditorUtility.DisplayDialog("Missing Scripts", 
                    "✓ No missing scripts found!\n\nThe warning might be from a prefab or asset.\n\nTry refreshing assets (Ctrl+R).", 
                    "OK");
                Debug.Log("✓ No missing scripts found in scene.");
            }
            else
            {
                string objectList = "";
                foreach (GameObject go in objectsWithMissingScripts)
                {
                    objectList += $"  • {go.name}\n";
                }
                
                EditorUtility.DisplayDialog("Missing Scripts Fixed", 
                    $"✓ Removed missing scripts from {count} GameObject(s):\n\n{objectList}\n\nSave the scene (Ctrl+S) to persist changes.", 
                    "OK");
                
                Debug.Log($"✓ Removed missing scripts from {count} GameObject(s):");
                foreach (GameObject go in objectsWithMissingScripts)
                {
                    Debug.Log($"  • {go.name}", go);
                }
                
                // Mark scene as dirty so user knows to save
                EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
            }
        }
    }
}
#endif


