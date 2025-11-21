#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using KingdomsPersist;

namespace KingdomsPersist.Editor
{
    /// <summary>
    /// Editor tool to ensure the scene is set up correctly for gameplay
    /// </summary>
    public class GameSceneSetup : EditorWindow
    {
        [MenuItem("Kingdom Ledger/Setup Scene for Play")]
        public static void SetupScene()
        {
            Debug.Log("=== Setting up scene for gameplay ===");
            
            // 1. Check/Create GameManager
            GameManager gm = FindObjectOfType<GameManager>();
            if (gm == null)
            {
                Debug.Log("Creating GameManager GameObject...");
                GameObject gmGO = new GameObject("GameManager");
                gm = gmGO.AddComponent<GameManager>();
                Undo.RegisterCreatedObjectUndo(gmGO, "Create GameManager");
            }
            else
            {
                Debug.Log("GameManager already exists");
            }
            
            // 2. Ensure Main Camera exists
            Camera mainCam = Camera.main;
            if (mainCam == null)
            {
                mainCam = FindObjectOfType<Camera>();
                if (mainCam == null)
                {
                    Debug.Log("Creating Main Camera...");
                    GameObject camGO = new GameObject("Main Camera");
                    mainCam = camGO.AddComponent<Camera>();
                    camGO.tag = "MainCamera";
                    camGO.AddComponent<AudioListener>();
                    Undo.RegisterCreatedObjectUndo(camGO, "Create Main Camera");
                }
            }
            
            // 3. Check for EventSystem (will be created at runtime, but good to have)
            UnityEngine.EventSystems.EventSystem eventSystem = UnityEngine.EventSystems.EventSystem.current;
            if (eventSystem == null)
            {
                Debug.Log("Note: EventSystem will be created automatically at runtime");
            }
            
            // 4. Check for Canvas (will be created at runtime, but good to have)
            Canvas canvas = FindObjectOfType<Canvas>();
            if (canvas == null)
            {
                Debug.Log("Note: Canvas will be created automatically at runtime");
            }
            
            Debug.Log("=== Scene setup complete! ===");
            Debug.Log("You can now press Play to start the game.");
            
            EditorUtility.DisplayDialog("Scene Setup Complete", 
                "Scene has been set up for gameplay!\n\n" +
                "The scene now has:\n" +
                "✓ GameManager GameObject\n" +
                "✓ Main Camera\n\n" +
                "Press Play to start the game. Canvas and EventSystem will be created automatically.",
                "OK");
        }
        
        [MenuItem("Kingdom Ledger/Verify Scene Setup")]
        public static void VerifyScene()
        {
            bool allGood = true;
            string report = "Scene Verification Report:\n\n";
            
            // Check GameManager
            GameManager gm = FindObjectOfType<GameManager>();
            if (gm == null)
            {
                report += "❌ GameManager: MISSING\n";
                allGood = false;
            }
            else
            {
                report += "✓ GameManager: EXISTS\n";
            }
            
            // Check Camera
            Camera mainCam = Camera.main ?? FindObjectOfType<Camera>();
            if (mainCam == null)
            {
                report += "⚠ Main Camera: MISSING (will use default)\n";
            }
            else
            {
                report += "✓ Main Camera: EXISTS\n";
            }
            
            // Check EventSystem (optional, created at runtime)
            UnityEngine.EventSystems.EventSystem eventSystem = UnityEngine.EventSystems.EventSystem.current;
            if (eventSystem == null)
            {
                report += "ℹ EventSystem: Will be created at runtime\n";
            }
            else
            {
                report += "✓ EventSystem: EXISTS\n";
            }
            
            // Check Canvas (optional, created at runtime)
            Canvas canvas = FindObjectOfType<Canvas>();
            if (canvas == null)
            {
                report += "ℹ Canvas: Will be created at runtime\n";
            }
            else
            {
                report += "✓ Canvas: EXISTS\n";
            }
            
            report += "\n";
            if (allGood)
            {
                report += "✓ Scene is ready to play!";
            }
            else
            {
                report += "⚠ Some components are missing. Use 'Setup Scene for Play' to fix.";
            }
            
            Debug.Log(report);
            EditorUtility.DisplayDialog("Scene Verification", report, "OK");
        }
    }
}
#endif


