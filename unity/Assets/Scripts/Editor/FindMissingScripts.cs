#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.Linq;

namespace KingdomsPersist.Editor
{
    /// <summary>
    /// Finds and removes missing script references in the scene
    /// </summary>
    public class FindMissingScripts : EditorWindow
    {
        [MenuItem("Kingdom Ledger/Find Missing Scripts")]
        public static void FindMissingScriptsInScene()
        {
            int count = 0;
            GameObject[] allObjects = FindObjectsOfType<GameObject>(true); // Include inactive
            
            foreach (GameObject go in allObjects)
            {
                int removed = RemoveMissingScripts(go);
                if (removed > 0)
                {
                    count += removed;
                    Debug.LogWarning($"Removed {removed} missing script(s) from: {go.name}", go);
                }
            }
            
            if (count == 0)
            {
                EditorUtility.DisplayDialog("Missing Scripts", "No missing scripts found!", "OK");
                Debug.Log("✓ No missing scripts found in scene.");
            }
            else
            {
                EditorUtility.DisplayDialog("Missing Scripts", 
                    $"Found and removed {count} missing script(s)!\n\nCheck Console for details.\n\nScene has been updated - you may need to save.", 
                    "OK");
                Debug.Log($"✓ Removed {count} missing script(s) from scene. Save the scene to persist changes.");
            }
        }
        
        private static int RemoveMissingScripts(GameObject go)
        {
            int removed = 0;
            SerializedObject so = new SerializedObject(go);
            SerializedProperty prop = so.FindProperty("m_Component");
            
            if (prop == null) return 0;
            
            // Go backwards to avoid index issues when deleting
            for (int i = prop.arraySize - 1; i >= 0; i--)
            {
                SerializedProperty element = prop.GetArrayElementAtIndex(i);
                SerializedProperty component = element.FindPropertyRelative("component");
                
                if (component != null && component.objectReferenceValue == null)
                {
                    prop.DeleteArrayElementAtIndex(i);
                    removed++;
                }
            }
            
            if (removed > 0)
            {
                so.ApplyModifiedProperties();
            }
            
            return removed;
        }
        
        [MenuItem("Kingdom Ledger/Find Missing Scripts (All Scenes)")]
        public static void FindMissingScriptsInAllScenes()
        {
            string[] scenePaths = System.IO.Directory.GetFiles("Assets", "*.unity", System.IO.SearchOption.AllDirectories);
            int totalRemoved = 0;
            
            foreach (string scenePath in scenePaths)
            {
                UnityEngine.SceneManagement.Scene scene = UnityEditor.SceneManagement.EditorSceneManager.OpenScene(scenePath);
                Debug.Log($"Checking scene: {scenePath}");
                
                int count = 0;
                GameObject[] allObjects = FindObjectsOfType<GameObject>(true);
                
                foreach (GameObject go in allObjects)
                {
                    int removed = RemoveMissingScripts(go);
                    if (removed > 0)
                    {
                        count += removed;
                    }
                }
                
                if (count > 0)
                {
                    UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(scene);
                    Debug.Log($"  Removed {count} missing script(s) from {scenePath}");
                    totalRemoved += count;
                }
            }
            
            if (totalRemoved == 0)
            {
                EditorUtility.DisplayDialog("Missing Scripts", "No missing scripts found in any scene!", "OK");
            }
            else
            {
                EditorUtility.DisplayDialog("Missing Scripts", 
                    $"Found and removed {totalRemoved} missing script(s) across all scenes!\n\nSave all scenes to persist changes.", 
                    "OK");
            }
        }
    }
}
#endif

