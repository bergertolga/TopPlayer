using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class RoutesUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject routesPanel;
        public Transform routesContainer;
        public Button createRouteButton;
        public Button closeButton;
        public GameObject createRoutePanel;
        public TMP_Dropdown fromRegionDropdown;
        public TMP_Dropdown toRegionDropdown;
        public TMP_Dropdown resourceDropdown;
        public TMP_InputField qtyPerTripInput;
        public Button createButton;
        public Button cancelButton;

        private List<Route> currentRoutes = new List<Route>();

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (routesPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    routesPanel = Instantiate(popupPrefab, canvas.transform);
                    routesPanel.name = "RoutesPanel";
                    routesPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshRoutes();
        }

        private void SetupUI()
        {
            if (routesPanel == null) return;

            // Create routes container if missing
            if (routesContainer == null)
            {
                Canvas canvas = CanvasManager.GetCanvas();

                GameObject containerGO = new GameObject("RoutesContainer");
                containerGO.transform.SetParent(routesPanel.transform, false);
                RectTransform rect = containerGO.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0, 0);
                rect.anchorMax = new Vector2(1, 0.8f);
                rect.sizeDelta = Vector2.zero;
                
                ScrollRect scrollRect = containerGO.AddComponent<ScrollRect>();
                scrollRect.horizontal = false;
                scrollRect.vertical = true;
                
                GameObject viewport = new GameObject("Viewport");
                viewport.transform.SetParent(containerGO.transform, false);
                RectTransform viewportRect = viewport.AddComponent<RectTransform>();
                viewportRect.anchorMin = Vector2.zero;
                viewportRect.anchorMax = Vector2.one;
                viewportRect.sizeDelta = Vector2.zero;
                Image viewportImage = viewport.AddComponent<Image>();
                viewportImage.color = new Color(0, 0, 0, 0);
                Mask mask = viewport.AddComponent<Mask>();
                mask.showMaskGraphic = false;
                
                GameObject content = new GameObject("Content");
                content.transform.SetParent(viewport.transform, false);
                RectTransform contentRect = content.AddComponent<RectTransform>();
                contentRect.anchorMin = new Vector2(0, 1);
                contentRect.anchorMax = new Vector2(1, 1);
                contentRect.pivot = new Vector2(0.5f, 1);
                VerticalLayoutGroup contentLayout = content.AddComponent<VerticalLayoutGroup>();
                contentLayout.spacing = 5;
                contentLayout.padding = new RectOffset(5, 5, 5, 5);
                contentLayout.childControlHeight = false;
                contentLayout.childControlWidth = true;
                contentLayout.childForceExpandHeight = false;
                contentLayout.childForceExpandWidth = true;
                
                scrollRect.content = contentRect;
                scrollRect.viewport = viewportRect;
                
                routesContainer = content.transform;
            }

            if (createRouteButton != null)
            {
                createRouteButton.onClick.AddListener(ShowCreateRoutePanel);
            }
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(ClosePanel);
            }
        }

        public void ShowPanel()
        {
            if (routesPanel != null)
            {
                routesPanel.SetActive(true);
            }
            RefreshRoutes();
        }

        public void ClosePanel()
        {
            if (routesPanel != null)
            {
                routesPanel.SetActive(false);
            }
            if (createRoutePanel != null)
            {
                createRoutePanel.SetActive(false);
            }
        }

        private void RefreshRoutes()
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }
            NetworkService.Instance.GetRoutes(userId, (response) =>
            {
                if (response == null || response.routes == null)
                {
                    Debug.LogError("Failed to get routes");
                    return;
                }

                currentRoutes = response.routes;
                UpdateRoutesDisplay();
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch routes: {error}");
            });
        }

        private void UpdateRoutesDisplay()
        {
            if (routesContainer == null) return;

            // Clear existing
            foreach (Transform child in routesContainer)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }

            // Display routes
            foreach (var route in currentRoutes)
            {
                CreateRouteEntry(route);
            }
        }

        private void CreateRouteEntry(Route route)
        {
            GameObject entry = new GameObject($"Route_{route.id}");
            entry.transform.SetParent(routesContainer, false);

            RectTransform rect = entry.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 80);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = entry.AddComponent<Image>();
            bg.color = new Color(0.2f, 0.2f, 0.3f, 0.8f);

            VerticalLayoutGroup layout = entry.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 5;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;

            GameObject routeInfo = new GameObject("RouteInfo");
            routeInfo.transform.SetParent(entry.transform, false);
            RectTransform infoRect = routeInfo.AddComponent<RectTransform>();
            infoRect.sizeDelta = new Vector2(0, 30);
            TextMeshProUGUI infoText = routeInfo.AddComponent<TextMeshProUGUI>();
            infoText.text = $"{route.from_region_name} → {route.to_region_name}";
            infoText.fontSize = 16;
            infoText.fontStyle = FontStyles.Bold;
            infoText.color = Color.white;

            GameObject resourceInfo = new GameObject("ResourceInfo");
            resourceInfo.transform.SetParent(entry.transform, false);
            RectTransform resourceRect = resourceInfo.AddComponent<RectTransform>();
            resourceRect.sizeDelta = new Vector2(0, 25);
            TextMeshProUGUI resourceText = resourceInfo.AddComponent<TextMeshProUGUI>();
            resourceText.text = $"{route.resource_name}: {route.qty_per_trip} per trip";
            resourceText.fontSize = 14;
            resourceText.color = Color.white;

            GameObject nextDeparture = new GameObject("NextDeparture");
            nextDeparture.transform.SetParent(entry.transform, false);
            RectTransform departureRect = nextDeparture.AddComponent<RectTransform>();
            departureRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI departureText = nextDeparture.AddComponent<TextMeshProUGUI>();
            System.DateTime departureTime = System.DateTimeOffset.FromUnixTimeSeconds(route.next_departure).DateTime;
            departureText.text = $"Next: {departureTime:HH:mm:ss}";
            departureText.fontSize = 12;
            departureText.color = Color.gray;
        }

        private void ShowCreateRoutePanel()
        {
            if (createRoutePanel == null)
            {
                CreateCreateRoutePanel();
            }
            createRoutePanel.SetActive(true);
        }

        private void CreateCreateRoutePanel()
        {
            Canvas canvas = CanvasManager.GetCanvas();
            if (canvas == null) return;

            GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
            if (popupPrefab != null)
            {
                createRoutePanel = Instantiate(popupPrefab, canvas.transform);
                createRoutePanel.name = "CreateRoutePanel";
            }
            else
            {
                createRoutePanel = new GameObject("CreateRoutePanel");
                createRoutePanel.transform.SetParent(canvas.transform, false);
                RectTransform rect = createRoutePanel.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(400, 400);
                rect.anchoredPosition = Vector2.zero;
                
                Image bg = createRoutePanel.AddComponent<Image>();
                bg.color = new Color(0.1f, 0.1f, 0.15f, 0.95f);
            }

            // Setup create route form
            VerticalLayoutGroup layout = createRoutePanel.GetComponent<VerticalLayoutGroup>();
            if (layout == null)
            {
                layout = createRoutePanel.AddComponent<VerticalLayoutGroup>();
                layout.spacing = 10;
                layout.padding = new RectOffset(20, 20, 20, 20);
            }

            // From region dropdown
            GameObject fromRegionGO = new GameObject("FromRegionDropdown");
            fromRegionGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform fromRect = fromRegionGO.AddComponent<RectTransform>();
            fromRect.sizeDelta = new Vector2(0, 40);
            fromRegionDropdown = fromRegionGO.AddComponent<TMP_Dropdown>();
            fromRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region A"));
            fromRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region B"));
            fromRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region C"));

            // To region dropdown
            GameObject toRegionGO = new GameObject("ToRegionDropdown");
            toRegionGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform toRect = toRegionGO.AddComponent<RectTransform>();
            toRect.sizeDelta = new Vector2(0, 40);
            toRegionDropdown = toRegionGO.AddComponent<TMP_Dropdown>();
            toRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region A"));
            toRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region B"));
            toRegionDropdown.options.Add(new TMP_Dropdown.OptionData("Region C"));

            // Resource dropdown
            GameObject resourceGO = new GameObject("ResourceDropdown");
            resourceGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform resourceRect = resourceGO.AddComponent<RectTransform>();
            resourceRect.sizeDelta = new Vector2(0, 40);
            resourceDropdown = resourceGO.AddComponent<TMP_Dropdown>();
            resourceDropdown.options.Add(new TMP_Dropdown.OptionData("WOOD"));
            resourceDropdown.options.Add(new TMP_Dropdown.OptionData("STONE"));
            resourceDropdown.options.Add(new TMP_Dropdown.OptionData("FOOD"));

            // Quantity input
            GameObject qtyGO = new GameObject("QtyPerTripInput");
            qtyGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform qtyRect = qtyGO.AddComponent<RectTransform>();
            qtyRect.sizeDelta = new Vector2(0, 40);
            qtyPerTripInput = qtyGO.AddComponent<TMP_InputField>();
            
            // Create placeholder text
            GameObject placeholderGO = new GameObject("Placeholder");
            placeholderGO.transform.SetParent(qtyGO.transform, false);
            RectTransform placeholderRect = placeholderGO.AddComponent<RectTransform>();
            placeholderRect.anchorMin = Vector2.zero;
            placeholderRect.anchorMax = Vector2.one;
            placeholderRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI placeholderText = placeholderGO.AddComponent<TextMeshProUGUI>();
            placeholderText.text = "Quantity per trip";
            placeholderText.fontSize = 14;
            placeholderText.color = new Color(0.5f, 0.5f, 0.5f, 1f);
            placeholderText.alignment = TextAlignmentOptions.Left;
            qtyPerTripInput.placeholder = placeholderText;
            
            // Create text component for input
            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(qtyGO.transform, false);
            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI textComponent = textGO.AddComponent<TextMeshProUGUI>();
            textComponent.fontSize = 14;
            textComponent.color = Color.white;
            textComponent.alignment = TextAlignmentOptions.Left;
            qtyPerTripInput.textComponent = textComponent;
            
            qtyPerTripInput.contentType = TMP_InputField.ContentType.IntegerNumber;

            // Create button
            GameObject createBtnGO = new GameObject("CreateButton");
            createBtnGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform createBtnRect = createBtnGO.AddComponent<RectTransform>();
            createBtnRect.sizeDelta = new Vector2(0, 50);
            createButton = createBtnGO.AddComponent<Button>();
            Image createImg = createBtnGO.AddComponent<Image>();
            createImg.color = new Color(0.2f, 0.6f, 0.2f, 1f);
            createButton.targetGraphic = createImg;
            createButton.onClick.AddListener(OnCreateRouteClicked);

            // Cancel button
            GameObject cancelBtnGO = new GameObject("CancelButton");
            cancelBtnGO.transform.SetParent(createRoutePanel.transform, false);
            RectTransform cancelBtnRect = cancelBtnGO.AddComponent<RectTransform>();
            cancelBtnRect.sizeDelta = new Vector2(0, 50);
            cancelButton = cancelBtnGO.AddComponent<Button>();
            Image cancelImg = cancelBtnGO.AddComponent<Image>();
            cancelImg.color = Color.red;
            cancelButton.targetGraphic = cancelImg;
            cancelButton.onClick.AddListener(() => createRoutePanel.SetActive(false));

            createRoutePanel.SetActive(false);
        }

        private void OnCreateRouteClicked()
        {
            if (fromRegionDropdown == null || toRegionDropdown == null || resourceDropdown == null || qtyPerTripInput == null)
            {
                Debug.LogWarning("Create route form not fully initialized");
                return;
            }

            if (!int.TryParse(qtyPerTripInput.text, out int qty) || qty <= 0)
            {
                Debug.LogWarning("Invalid quantity");
                return;
            }

            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            var request = new CreateRouteRequest
            {
                fromRegion = fromRegionDropdown.options[fromRegionDropdown.value].text,
                toRegion = toRegionDropdown.options[toRegionDropdown.value].text,
                resource = resourceDropdown.options[resourceDropdown.value].text,
                qtyPerTrip = qty
            };

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                Debug.LogWarning("Cannot create route without user login.");
                return;
            }
            NetworkService.Instance.CreateRoute(userId, request, (response) =>
            {
                if (response.success)
                {
                    Debug.Log($"Route created successfully");
                    createRoutePanel.SetActive(false);
                    RefreshRoutes();
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }
                }
                else
                {
                    Debug.LogError($"Route creation failed: {response.error ?? "Unknown error"}");
                }
            }, (error) =>
            {
                Debug.LogError($"Create route failed: {error}");
            });
        }
    }
}

