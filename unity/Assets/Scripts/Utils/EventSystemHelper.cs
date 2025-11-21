using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace KingdomsPersist.Utils
{
    /// <summary>
    /// Helper class to create EventSystem with the correct Input Module
    /// based on Unity's Input System configuration.
    /// </summary>
    public static class EventSystemHelper
    {
        /// <summary>
        /// Ensures an EventSystem exists in the scene with the correct Input Module.
        /// Uses InputSystemUIInputModule if the new Input System is available,
        /// otherwise falls back to StandaloneInputModule.
        /// </summary>
        public static void EnsureEventSystem()
        {
            try
            {
                GameObject eventSystemGO;
                EventSystem eventSystem;
                if (EventSystem.current == null)
                {
                    eventSystemGO = new GameObject("EventSystem");
                    eventSystem = eventSystemGO.AddComponent<EventSystem>();
                }
                else
                {
                    eventSystemGO = EventSystem.current.gameObject;
                    eventSystem = EventSystem.current;
                }
                
                // Ensure EventSystem is enabled
                if (eventSystem != null)
                {
                    eventSystem.enabled = true;
                }

                // Check existing input module
                BaseInputModule inputModule = eventSystemGO.GetComponent<BaseInputModule>();
                
                // ALWAYS remove InputSystemUIInputModule - Input System is broken and causes errors
                // We will ONLY use StandaloneInputModule
                if (inputModule != null)
                {
                    string moduleName = inputModule.GetType().Name;
                    if (moduleName == "InputSystemUIInputModule")
                    {
                        Debug.LogWarning("Removing InputSystemUIInputModule (Input System is broken). Replacing with StandaloneInputModule.");
                        Object.DestroyImmediate(inputModule);
                        inputModule = null;
                    }
                }
                
                // ALWAYS use StandaloneInputModule - it's reliable and works
                if (inputModule == null)
                {
                    inputModule = eventSystemGO.AddComponent<StandaloneInputModule>();
                    inputModule.enabled = true;
                    Debug.Log("EventSystem created with StandaloneInputModule (Old Input Manager)");
                }
                else if (inputModule.GetType().Name != "StandaloneInputModule")
                {
                    // If somehow we have a different module, replace it
                    Debug.LogWarning($"Replacing {inputModule.GetType().Name} with StandaloneInputModule.");
                    Object.DestroyImmediate(inputModule);
                    inputModule = eventSystemGO.AddComponent<StandaloneInputModule>();
                    inputModule.enabled = true;
                    Debug.Log("EventSystem created with StandaloneInputModule (Old Input Manager)");
                }
                else if (!inputModule.enabled)
                {
                    inputModule.enabled = true;
                }
                
                // Verify the input module is properly configured
                if (inputModule != null)
                {
                    StandaloneInputModule standaloneModule = inputModule as StandaloneInputModule;
                    if (standaloneModule != null)
                    {
                        // Ensure it's the active input module
                        if (eventSystem != null)
                        {
                            eventSystem.SetSelectedGameObject(null);
                        }
                    }
                }
                
                // Final verification: Ensure EventSystem and input module are both enabled
                if (eventSystem != null && !eventSystem.enabled)
                {
                    eventSystem.enabled = true;
                    Debug.LogWarning("EventSystem was disabled. Re-enabled it.");
                }
                
                if (inputModule != null && !inputModule.enabled)
                {
                    inputModule.enabled = true;
                    Debug.LogWarning("Input module was disabled. Re-enabled it.");
                }
                
                // Verify Canvas has GraphicRaycaster - CRITICAL for UI clicks to work
                Canvas[] canvases = Object.FindObjectsOfType<Canvas>();
                foreach (Canvas canvas in canvases)
                {
                    GraphicRaycaster raycaster = canvas.GetComponent<GraphicRaycaster>();
                    if (raycaster == null)
                    {
                        raycaster = canvas.gameObject.AddComponent<GraphicRaycaster>();
                        Debug.Log($"Added GraphicRaycaster to Canvas: {canvas.name}");
                    }
                    else if (!raycaster.enabled)
                    {
                        raycaster.enabled = true;
                        Debug.Log($"Enabled GraphicRaycaster on Canvas: {canvas.name}");
                    }
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"Error in EnsureEventSystem: {ex.Message}\n{ex.StackTrace}");
            }
        }
        
        /// <summary>
        /// Debug method to verify EventSystem is working properly
        /// </summary>
        public static void VerifyEventSystem()
        {
            if (EventSystem.current == null)
            {
                Debug.LogError("EventSystem.current is NULL! UI clicks will not work.");
                return;
            }
            
            BaseInputModule inputModule = EventSystem.current.GetComponent<BaseInputModule>();
            if (inputModule == null)
            {
                Debug.LogError("EventSystem has no Input Module! UI clicks will not work.");
                return;
            }
            
            if (!inputModule.enabled)
            {
                Debug.LogError("Input Module is disabled! UI clicks will not work.");
                return;
            }
            
            Canvas[] canvases = Object.FindObjectsOfType<Canvas>();
            if (canvases.Length == 0)
            {
                Debug.LogWarning("No Canvas found in scene! UI elements may not be visible.");
                return;
            }
            
            int canvasesWithoutRaycaster = 0;
            foreach (Canvas canvas in canvases)
            {
                if (canvas.GetComponent<GraphicRaycaster>() == null)
                {
                    canvasesWithoutRaycaster++;
                }
            }
            
            if (canvasesWithoutRaycaster > 0)
            {
                Debug.LogWarning($"{canvasesWithoutRaycaster} Canvas(es) without GraphicRaycaster! UI clicks may not work on those canvases.");
            }
            
            Debug.Log($"EventSystem verification: EventSystem={EventSystem.current.name}, InputModule={inputModule.GetType().Name}, Enabled={inputModule.enabled}, Canvases={canvases.Length}");
        }
    }
}

