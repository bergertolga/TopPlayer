using UnityEngine;
using UnityEditor;
using System.IO;

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Editor utility to help locate GUI Pro Bundle assets in the project.
    /// This script helps find where Layer Lab GUI assets are located.
    /// </summary>
    public class FindGUIAssets : MonoBehaviour
    {
#if UNITY_EDITOR
        [MenuItem("Tools/Find GUI Pro Bundle Assets")]
        public static void SearchForGUIAssets()
        {
            Debug.Log("=== Searching for GUI Pro Bundle Assets ===");
            
            // Search in Assets folder
            string[] guids = AssetDatabase.FindAssets("t:Prefab", new[] { "Assets" });
            int foundCount = 0;
            
            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                string fileName = Path.GetFileName(path).ToLower();
                
                // Look for common GUI Pro Bundle naming patterns
                if (fileName.Contains("button") || 
                    fileName.Contains("panel") || 
                    fileName.Contains("gui") ||
                    fileName.Contains("layer"))
                {
                    Debug.Log($"Found potential GUI asset: {path}");
                    foundCount++;
                }
            }
            
            // Search in Packages
            string[] packageGuids = AssetDatabase.FindAssets("t:Prefab", new[] { "Packages" });
            foreach (string guid in packageGuids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                string fileName = Path.GetFileName(path).ToLower();
                
                if (fileName.Contains("button") || 
                    fileName.Contains("panel") || 
                    fileName.Contains("gui") ||
                    fileName.Contains("layer"))
                {
                    Debug.Log($"Found potential GUI asset in Packages: {path}");
                    foundCount++;
                }
            }
            
            Debug.Log($"=== Search complete. Found {foundCount} potential GUI assets ===");
            Debug.Log("Check the Console for full list. If no assets found, they may need to be downloaded from Package Manager.");
        }
        
        [MenuItem("Tools/Open Package Manager")]
        public static void OpenPackageManager()
        {
            EditorApplication.ExecuteMenuItem("Window/Package Manager");
            Debug.Log("Package Manager opened. Switch to 'My Assets' tab to find Layer Lab GUI assets.");
        }
#endif
    }
}

