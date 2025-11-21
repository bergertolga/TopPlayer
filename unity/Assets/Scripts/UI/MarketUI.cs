using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KingdomsPersist.Models;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;

namespace KingdomsPersist.UI
{
    public class MarketUI : MonoBehaviour
    {
        [Header("UI References")]
        public GameObject marketPanel;
        public TMP_Dropdown itemDropdown;
        public Transform bidsContainer;
        public Transform asksContainer;
        public Transform myOrdersContainer;
        public TMP_InputField buyQuantityInput;
        public TMP_InputField buyPriceInput;
        public TMP_InputField sellQuantityInput;
        public TMP_InputField sellPriceInput;
        public Button buyButton;
        public Button sellButton;
        public Button refreshButton;
        public Button closeButton;
        public TextMeshProUGUI selectedItemLabel;

        private string selectedItem = "WOOD";
        private OrderBookResponse currentOrderBook;
        private List<MarketOrder> myOrders = new List<MarketOrder>();

        private void Awake()
        {
            LoadGUIAssets();
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();

            if (marketPanel == null)
            {
                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    Canvas canvas = CanvasManager.GetCanvas();
                    
                    marketPanel = Instantiate(popupPrefab, canvas.transform);
                    marketPanel.name = "MarketPanel";
                    marketPanel.SetActive(false);
                }
            }
        }

        private void Start()
        {
            SetupUI();
            RefreshOrderBook();
        }

        private void SetupUI()
        {
            if (marketPanel == null) return;

            // Create my orders container if missing
            if (myOrdersContainer == null)
            {
                Canvas canvas = CanvasManager.GetCanvas();

                GameObject myOrdersGO = new GameObject("MyOrdersContainer");
                myOrdersGO.transform.SetParent(marketPanel.transform, false);
                RectTransform rect = myOrdersGO.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.6f, 0f);
                rect.anchorMax = new Vector2(1f, 0.5f);
                rect.pivot = new Vector2(0, 0);
                rect.anchoredPosition = new Vector2(10, 10);
                rect.sizeDelta = Vector2.zero;
                
                Image bg = myOrdersGO.AddComponent<Image>();
                bg.color = new Color(0.15f, 0.15f, 0.2f, 0.9f);
                
                VerticalLayoutGroup layout = myOrdersGO.AddComponent<VerticalLayoutGroup>();
                layout.spacing = 5;
                layout.padding = new RectOffset(10, 10, 10, 10);
                layout.childControlHeight = false;
                layout.childControlWidth = true;
                layout.childForceExpandHeight = false;
                layout.childForceExpandWidth = true;
                
                // Title
                GameObject titleGO = new GameObject("Title");
                titleGO.transform.SetParent(myOrdersGO.transform, false);
                RectTransform titleRect = titleGO.AddComponent<RectTransform>();
                titleRect.sizeDelta = new Vector2(0, 30);
                TextMeshProUGUI titleText = titleGO.AddComponent<TextMeshProUGUI>();
                titleText.text = "My Orders";
                titleText.fontSize = 18;
                titleText.fontStyle = FontStyles.Bold;
                titleText.color = Color.white;
                titleText.alignment = TextAlignmentOptions.Center;
                
                // Scroll view
                GameObject scrollGO = new GameObject("ScrollView");
                scrollGO.transform.SetParent(myOrdersGO.transform, false);
                RectTransform scrollRect = scrollGO.AddComponent<RectTransform>();
                scrollRect.anchorMin = Vector2.zero;
                scrollRect.anchorMax = Vector2.one;
                scrollRect.sizeDelta = Vector2.zero;
                scrollRect.offsetMin = new Vector2(0, 40);
                scrollRect.offsetMax = Vector2.zero;
                
                ScrollRect scrollView = scrollGO.AddComponent<ScrollRect>();
                scrollView.horizontal = false;
                scrollView.vertical = true;
                
                GameObject viewport = new GameObject("Viewport");
                viewport.transform.SetParent(scrollGO.transform, false);
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
                
                scrollView.content = contentRect;
                scrollView.viewport = viewportRect;
                
                myOrdersContainer = content.transform;
            }

            // Setup item dropdown
            if (itemDropdown == null)
            {
                itemDropdown = marketPanel.GetComponentInChildren<TMP_Dropdown>();
                if (itemDropdown == null)
                {
                    GameObject dropdownGO = new GameObject("ItemDropdown");
                    dropdownGO.transform.SetParent(marketPanel.transform, false);
                    RectTransform rect = dropdownGO.AddComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(200, 40);
                    rect.anchorMin = new Vector2(0, 1);
                    rect.anchorMax = new Vector2(0, 1);
                    rect.pivot = new Vector2(0, 1);
                    rect.anchoredPosition = new Vector2(20, -20);
                    itemDropdown = dropdownGO.AddComponent<TMP_Dropdown>();
                    
                    // Add resource options
                    itemDropdown.options.Clear();
                    itemDropdown.options.Add(new TMP_Dropdown.OptionData("WOOD"));
                    itemDropdown.options.Add(new TMP_Dropdown.OptionData("STONE"));
                    itemDropdown.options.Add(new TMP_Dropdown.OptionData("FOOD"));
                    itemDropdown.options.Add(new TMP_Dropdown.OptionData("COINS"));
                    itemDropdown.value = 0;
                    itemDropdown.onValueChanged.AddListener(OnItemSelected);
                }
            }

            // Setup buy/sell buttons
            if (buyButton != null)
            {
                buyButton.onClick.AddListener(OnBuyClicked);
            }
            if (sellButton != null)
            {
                sellButton.onClick.AddListener(OnSellClicked);
            }
            if (refreshButton != null)
            {
                refreshButton.onClick.AddListener(RefreshOrderBook);
            }
            // Ensure close button exists and works
            if (marketPanel != null)
            {
                closeButton = PanelHelper.EnsureCloseButton(marketPanel, ClosePanel);
            }
        }

        public void ShowPanel()
        {
            if (marketPanel != null)
            {
                marketPanel.SetActive(true);
            }
            RefreshOrderBook();
            RefreshMyOrders();
        }

        public void ClosePanel()
        {
            if (marketPanel != null)
            {
                marketPanel.SetActive(false);
            }
        }

        private void OnItemSelected(int index)
        {
            if (itemDropdown != null && itemDropdown.options.Count > index)
            {
                selectedItem = itemDropdown.options[index].text;
                RefreshOrderBook();
            }
        }

        private void RefreshOrderBook()
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string kingdomId = GameStateManager.Instance.kingdomId;
            if (string.IsNullOrEmpty(kingdomId))
            {
                Debug.LogWarning("Kingdom ID not set");
                return;
            }

            NetworkService.Instance.GetMarketOrderBook(kingdomId, selectedItem, (response) =>
            {
                if (response == null)
                {
                    Debug.LogError("Failed to get order book");
                    return;
                }

                currentOrderBook = response;
                UpdateOrderBookDisplay();
            }, (error) =>
            {
                Debug.LogError($"Failed to fetch order book: {error}");
            });
        }

        private void UpdateOrderBookDisplay()
        {
            if (currentOrderBook == null) return;

            // Update bids (buy orders)
            if (bidsContainer != null)
            {
                ClearContainer(bidsContainer);
                foreach (var bid in currentOrderBook.bids)
                {
                    CreateOrderEntry(bidsContainer, bid.price, bid.qty, true);
                }
            }

            // Update asks (sell orders)
            if (asksContainer != null)
            {
                ClearContainer(asksContainer);
                foreach (var ask in currentOrderBook.asks)
                {
                    CreateOrderEntry(asksContainer, ask.price, ask.qty, false);
                }
            }

            if (selectedItemLabel != null)
            {
                selectedItemLabel.text = $"Market: {selectedItem}";
            }
        }

        private void ClearContainer(Transform container)
        {
            foreach (Transform child in container)
            {
                if (child != null)
                {
                    Destroy(child.gameObject);
                }
            }
        }

        private void CreateOrderEntry(Transform parent, float price, int qty, bool isBid)
        {
            GameObject entry = new GameObject($"Order_{price}_{qty}");
            entry.transform.SetParent(parent, false);

            RectTransform rect = entry.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 30);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = entry.AddComponent<Image>();
            bg.color = isBid ? new Color(0.2f, 0.4f, 0.2f, 0.5f) : new Color(0.4f, 0.2f, 0.2f, 0.5f);

            HorizontalLayoutGroup layout = entry.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            GameObject priceLabel = new GameObject("PriceLabel");
            priceLabel.transform.SetParent(entry.transform, false);
            RectTransform priceRect = priceLabel.AddComponent<RectTransform>();
            priceRect.sizeDelta = new Vector2(100, 0);
            TextMeshProUGUI priceText = priceLabel.AddComponent<TextMeshProUGUI>();
            priceText.text = price.ToString("F2");
            priceText.fontSize = 14;
            priceText.color = Color.white;

            GameObject qtyLabel = new GameObject("QtyLabel");
            qtyLabel.transform.SetParent(entry.transform, false);
            RectTransform qtyRect = qtyLabel.AddComponent<RectTransform>();
            qtyRect.sizeDelta = new Vector2(100, 0);
            TextMeshProUGUI qtyText = qtyLabel.AddComponent<TextMeshProUGUI>();
            qtyText.text = qty.ToString();
            qtyText.fontSize = 14;
            qtyText.color = Color.white;
        }

        private void OnBuyClicked()
        {
            if (buyQuantityInput == null || buyPriceInput == null)
            {
                Debug.LogWarning("Buy inputs not assigned");
                return;
            }

            if (!int.TryParse(buyQuantityInput.text, out int qty) || qty <= 0)
            {
                Debug.LogWarning("Invalid quantity");
                return;
            }

            if (!float.TryParse(buyPriceInput.text, out float price) || price <= 0)
            {
                Debug.LogWarning("Invalid price");
                return;
            }

            PlaceOrder("buy", qty, price);
        }

        private void OnSellClicked()
        {
            if (sellQuantityInput == null || sellPriceInput == null)
            {
                Debug.LogWarning("Sell inputs not assigned");
                return;
            }

            if (!int.TryParse(sellQuantityInput.text, out int qty) || qty <= 0)
            {
                Debug.LogWarning("Invalid quantity");
                return;
            }

            if (!float.TryParse(sellPriceInput.text, out float price) || price <= 0)
            {
                Debug.LogWarning("Invalid price");
                return;
            }

            PlaceOrder("sell", qty, price);
        }

        private void PlaceOrder(string side, int qty, float price)
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string kingdomId = GameStateManager.Instance.kingdomId;
            string cityId = GameStateManager.Instance.cityId;
            if (string.IsNullOrEmpty(kingdomId) || string.IsNullOrEmpty(cityId))
            {
                Debug.LogWarning("Kingdom ID or City ID not set");
                return;
            }

            var order = new OrderPlaceCommand
            {
                side = side,
                item = selectedItem,
                qty = qty,
                price = price
            };

            NetworkService.Instance.PlaceMarketOrder(kingdomId, cityId, order, (response) =>
            {
                if (response.accepted)
                {
                    Debug.Log($"Order placed successfully: {response.command_id}");
                    RefreshOrderBook();
                    RefreshMyOrders();
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }
                }
                else
                {
                    Debug.LogError($"Order rejected: {response.error ?? "Unknown error"}");
                }
            }, (error) =>
            {
                Debug.LogError($"Order failed: {error}");
            }, GameStateManager.Instance.userId);
        }

        private void RefreshMyOrders()
        {
            // Note: Backend doesn't have a direct "my orders" endpoint
            // For now, we'll track orders via command responses
            // In a full implementation, you'd need a backend endpoint like /api/v1/market/my-orders
            UpdateMyOrdersDisplay();
        }

        private void UpdateMyOrdersDisplay()
        {
            if (myOrdersContainer == null) return;

            // Clear existing
            ClearContainer(myOrdersContainer);

            // Display my orders
            foreach (var order in myOrders)
            {
                CreateMyOrderEntry(order);
            }
        }

        private void CreateMyOrderEntry(MarketOrder order)
        {
            GameObject entry = new GameObject($"MyOrder_{order.id}");
            entry.transform.SetParent(myOrdersContainer, false);

            RectTransform rect = entry.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 50);
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(0, 1);

            Image bg = entry.AddComponent<Image>();
            bg.color = order.side == "buy" ? new Color(0.2f, 0.4f, 0.2f, 0.8f) : new Color(0.4f, 0.2f, 0.2f, 0.8f);

            HorizontalLayoutGroup layout = entry.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(10, 10, 5, 5);
            layout.childControlHeight = true;
            layout.childControlWidth = false;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = false;

            // Order info
            GameObject infoGO = new GameObject("Info");
            infoGO.transform.SetParent(entry.transform, false);
            RectTransform infoRect = infoGO.AddComponent<RectTransform>();
            infoRect.sizeDelta = new Vector2(200, 0);
            VerticalLayoutGroup infoLayout = infoGO.AddComponent<VerticalLayoutGroup>();
            infoLayout.spacing = 2;
            infoLayout.childControlHeight = false;
            infoLayout.childControlWidth = true;
            infoLayout.childForceExpandHeight = false;
            infoLayout.childForceExpandWidth = true;

            GameObject sideLabel = new GameObject("SideLabel");
            sideLabel.transform.SetParent(infoGO.transform, false);
            RectTransform sideRect = sideLabel.AddComponent<RectTransform>();
            sideRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI sideText = sideLabel.AddComponent<TextMeshProUGUI>();
            sideText.text = order.side.ToUpper();
            sideText.fontSize = 14;
            sideText.fontStyle = FontStyles.Bold;
            sideText.color = Color.white;

            GameObject detailsLabel = new GameObject("DetailsLabel");
            detailsLabel.transform.SetParent(infoGO.transform, false);
            RectTransform detailsRect = detailsLabel.AddComponent<RectTransform>();
            detailsRect.sizeDelta = new Vector2(0, 20);
            TextMeshProUGUI detailsText = detailsLabel.AddComponent<TextMeshProUGUI>();
            detailsText.text = $"{order.item}: {order.qty} @ {order.price:F2}";
            detailsText.fontSize = 12;
            detailsText.color = Color.white;

            // Cancel button
            GameObject cancelBtnGO = new GameObject("CancelButton");
            cancelBtnGO.transform.SetParent(entry.transform, false);
            RectTransform cancelBtnRect = cancelBtnGO.AddComponent<RectTransform>();
            cancelBtnRect.sizeDelta = new Vector2(80, 40);
            Button cancelBtn = cancelBtnGO.AddComponent<Button>();
            Image cancelImg = cancelBtnGO.AddComponent<Image>();
            cancelImg.color = Color.red;
            cancelBtn.targetGraphic = cancelImg;
            
            GameObject cancelTextGO = new GameObject("Text");
            cancelTextGO.transform.SetParent(cancelBtnGO.transform, false);
            RectTransform cancelTextRect = cancelTextGO.AddComponent<RectTransform>();
            cancelTextRect.anchorMin = Vector2.zero;
            cancelTextRect.anchorMax = Vector2.one;
            cancelTextRect.sizeDelta = Vector2.zero;
            TextMeshProUGUI cancelText = cancelTextGO.AddComponent<TextMeshProUGUI>();
            cancelText.text = "Cancel";
            cancelText.fontSize = 14;
            cancelText.alignment = TextAlignmentOptions.Center;
            cancelText.color = Color.white;
            cancelText.raycastTarget = false;

            cancelBtn.onClick.AddListener(() => OnCancelOrderClicked(order.id));
        }

        private void OnCancelOrderClicked(string orderId)
        {
            if (NetworkService.Instance == null || GameStateManager.Instance == null)
            {
                Debug.LogError("NetworkService or GameStateManager not initialized");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            NetworkService.Instance.CancelMarketOrder(userId, orderId, (response) =>
            {
                if (response.success)
                {
                    Debug.Log($"Order cancelled successfully: {orderId}");
                    myOrders.RemoveAll(o => o.id == orderId);
                    RefreshOrderBook();
                    RefreshMyOrders();
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }
                }
                else
                {
                    Debug.LogError($"Order cancel failed: {response.error ?? "Unknown error"}");
                }
            }, (error) =>
            {
                Debug.LogError($"Cancel order failed: {error}");
            });
        }

        public void AddMyOrder(MarketOrder order)
        {
            if (order != null && !myOrders.Any(o => o.id == order.id))
            {
                myOrders.Add(order);
                UpdateMyOrdersDisplay();
            }
        }
    }
}

