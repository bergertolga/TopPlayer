using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Text.RegularExpressions;
using KingdomsPersist.Managers;
using KingdomsPersist.Services;
using KingdomsPersist.Utils;
using KingdomsPersist.Models;

namespace KingdomsPersist.UI
{
    public class LoginUI : MonoBehaviour
    {
        public static LoginUI Instance { get; private set; }

        [Header("UI References")]
        public GameObject loginPanel;
        public TMP_InputField usernameInput;
        public TMP_InputField emailInput;
        public Button loginButton;
        public Button registerButton;
        public TextMeshProUGUI statusLabel;
        [Header("Theme")]
        [SerializeField] private Color headingColor = new Color(0.2f, 0.24f, 0.32f, 1f);
        [SerializeField] private Color bodyTextColor = new Color(0.16f, 0.2f, 0.3f, 1f);
        private const string DefaultKingdomId = "kingdom-1";

        private static readonly Regex UsernameRegex = new Regex("^[A-Za-z0-9_]{3,20}$");
        private const string UsernameHint = "Username must be 3-20 letters, numbers, or underscores.";

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            LoadGUIAssets();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void LoadGUIAssets()
        {
            EventSystemHelper.EnsureEventSystem();
            UIManager.RequireInstance();

            if (loginPanel == null)
            {
                Canvas canvas = CanvasManager.GetCanvas();

                GameObject popupPrefab = GUIAssetLoader.LoadPopupPrefab();
                if (popupPrefab != null)
                {
                    loginPanel = Instantiate(popupPrefab, canvas.transform);
                }
                else
                {
                    loginPanel = new GameObject("LoginPanel");
                    loginPanel.transform.SetParent(canvas.transform, false);
                    Image bg = loginPanel.AddComponent<Image>();
                    bg.color = new Color(0.92f, 0.95f, 1f, 0.98f);
                }

                loginPanel.name = "LoginPanel";
                RectTransform rect = loginPanel.GetComponent<RectTransform>() ?? loginPanel.AddComponent<RectTransform>();
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                bool portrait = CanvasManager.IsPortraitLayout;
                float width = portrait ? Mathf.Min(CanvasManager.ReferenceResolution.x * 0.85f, 760f) : 520f;
                float height = portrait ? 900f : 480f;
                rect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, width);
                rect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, height);
                rect.anchoredPosition = Vector2.zero;
                GUIThemeHelper.StripPlaceholderTexts(loginPanel.transform);

                Transform contentRoot = PrepareContentRoot(loginPanel.transform);

                // Title
                CreateLabel(contentRoot, "Title", "Welcome to Kingdom Ledger", 32, FontStyles.Bold, TextAlignmentOptions.Center, headingColor);
                CreateLabel(contentRoot, "Subtitle", "Rule your kingdom from anywhere.", 20, FontStyles.Italic, TextAlignmentOptions.Center, bodyTextColor);
                CreateLabel(contentRoot, "UsernameHint", UsernameHint, 14, FontStyles.Italic, TextAlignmentOptions.Center, new Color(0.75f, 0.18f, 0.18f, 1f));

                usernameInput = CreateInputField(contentRoot, "UsernameInput", "Username (letters/numbers/_)", TMP_InputField.ContentType.Standard);
                emailInput = CreateInputField(contentRoot, "EmailInput", "Email (optional, for recovery)", TMP_InputField.ContentType.Standard);

                statusLabel = CreateLabel(contentRoot, "StatusLabel", "", 14, FontStyles.Italic, TextAlignmentOptions.Center, bodyTextColor);

                loginButton = UIManager.Instance.CreateButton(contentRoot, "Login", null);
                loginButton.name = "LoginButton";

                registerButton = UIManager.Instance.CreateButton(contentRoot, "Register", null);
                registerButton.name = "RegisterButton";

                PanelHelper.EnsureCloseButton(loginPanel, HideLoginPanel);
                loginPanel.SetActive(false);
            }
        }

        private Transform PrepareContentRoot(Transform panelTransform)
        {
            VerticalLayoutGroup existingLayout = panelTransform.GetComponent<VerticalLayoutGroup>();
            if (existingLayout != null)
            {
                ConfigureLayout(existingLayout);
                return panelTransform;
            }

            GameObject content = new GameObject("Content");
            content.transform.SetParent(panelTransform, false);
            RectTransform contentRect = content.AddComponent<RectTransform>();
            contentRect.anchorMin = Vector2.zero;
            contentRect.anchorMax = Vector2.one;
            contentRect.offsetMin = new Vector2(40, 40);
            contentRect.offsetMax = new Vector2(-40, -40);

            VerticalLayoutGroup layout = content.AddComponent<VerticalLayoutGroup>();
            ConfigureLayout(layout);

            return content.transform;
        }

        private void ConfigureLayout(VerticalLayoutGroup layout)
        {
            layout.spacing = 18;
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlHeight = false;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = true;
        }

        private TextMeshProUGUI CreateLabel(Transform parent, string name, string text, float size, FontStyles style, TextAlignmentOptions alignment, Color? colorOverride = null)
        {
            return GUIThemeHelper.CreateLabel(parent, name, text, size, style, alignment, colorOverride ?? Color.white);
        }

        private TMP_InputField CreateInputField(Transform parent, string name, string placeholderText, TMP_InputField.ContentType contentType)
        {
            GameObject prefab = GUIAssetLoader.LoadInputFieldPrefab();
            if (prefab != null)
            {
                GameObject instance = Instantiate(prefab, parent);
                instance.name = name;
                GUIThemeHelper.StripPlaceholderTexts(instance.transform);

                TMP_InputField prefabField = instance.GetComponentInChildren<TMP_InputField>();
                if (prefabField == null)
                {
                    prefabField = instance.AddComponent<TMP_InputField>();
                }

                return ConfigureInputField(prefabField, placeholderText, contentType);
            }

            TMP_InputField fallbackField = BuildFallbackInputField(parent, name);
            return ConfigureInputField(fallbackField, placeholderText, contentType);
        }

        private TMP_InputField ConfigureInputField(TMP_InputField field, string placeholderText, TMP_InputField.ContentType contentType)
        {
            if (field == null) return null;

            field.contentType = contentType;
            field.lineType = TMP_InputField.LineType.SingleLine;
            field.richText = false;
            field.caretColor = headingColor;
            field.selectionColor = new Color(headingColor.r, headingColor.g, headingColor.b, 0.35f);

            TMP_Text textComponent = field.textComponent ?? field.GetComponentInChildren<TMP_Text>();
            if (textComponent != null)
            {
                textComponent.color = bodyTextColor;
                textComponent.fontSize = 20f;
                textComponent.enableWordWrapping = false;
                textComponent.alignment = TextAlignmentOptions.MidlineLeft;
                textComponent.rectTransform.anchorMin = Vector2.zero;
                textComponent.rectTransform.anchorMax = Vector2.one;
                textComponent.rectTransform.offsetMin = Vector2.zero;
                textComponent.rectTransform.offsetMax = Vector2.zero;
            }

            if (field.textViewport == null && textComponent != null)
            {
                field.textViewport = textComponent.rectTransform.parent as RectTransform;
            }

            if (field.placeholder is TMP_Text tmpPlaceholder)
            {
                tmpPlaceholder.text = placeholderText;
                tmpPlaceholder.fontSize = 18f;
                tmpPlaceholder.fontStyle = FontStyles.Italic;
                tmpPlaceholder.color = new Color(0.6f, 0.65f, 0.72f, 1f);
                tmpPlaceholder.alignment = TextAlignmentOptions.MidlineLeft;
            }

            LayoutElement layout = field.GetComponent<LayoutElement>() ?? field.gameObject.AddComponent<LayoutElement>();
            layout.preferredWidth = 360f;
            layout.minHeight = 56f;
            layout.preferredHeight = 56f;

            return field;
        }

        private TMP_InputField BuildFallbackInputField(Transform parent, string name)
        {
            GameObject inputGO = new GameObject(name);
            inputGO.transform.SetParent(parent, false);
            RectTransform rect = inputGO.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0f, 56f);

            Image bg = inputGO.AddComponent<Image>();
            bg.color = new Color(0.96f, 0.97f, 1f, 1f);
            bg.raycastTarget = true;

            TMP_InputField field = inputGO.AddComponent<TMP_InputField>();
            field.targetGraphic = bg;

            RectTransform viewportRect = CreateViewport(inputGO.transform);
            field.textViewport = viewportRect;

            TextMeshProUGUI textComponent = CreateInputFieldLabel(viewportRect, "Text", "", bodyTextColor, FontStyles.Normal);
            field.textComponent = textComponent;

            TextMeshProUGUI placeholder = CreateInputFieldLabel(viewportRect, "Placeholder", "", new Color(0.63f, 0.68f, 0.78f, 1f), FontStyles.Italic);
            field.placeholder = placeholder;

            return field;
        }

        private RectTransform CreateViewport(Transform parent)
        {
            GameObject viewport = new GameObject("Viewport");
            viewport.transform.SetParent(parent, false);
            RectTransform viewportRect = viewport.AddComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero;
            viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = new Vector2(14f, 12f);
            viewportRect.offsetMax = new Vector2(-14f, -12f);
            viewport.AddComponent<RectMask2D>();
            return viewportRect;
        }

        private TextMeshProUGUI CreateInputFieldLabel(Transform parent, string name, string text, Color color, FontStyles style)
        {
            TextMeshProUGUI label = CreateLabel(parent, name, text, 18f, style, TextAlignmentOptions.MidlineLeft, color);
            RectTransform rect = label.rectTransform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            label.enableWordWrapping = false;
            label.richText = false;
            return label;
        }

        private void Start()
        {
            // Delay button setup to ensure buttons are fully created
            Invoke(nameof(SetupButtons), 0.1f);

            // Check if already logged in
            if (GameStateManager.Instance != null && !string.IsNullOrEmpty(GameStateManager.Instance.userId))
            {
                HideLoginPanel();
            }
        }
        
        private void SetupButtons()
        {
            if (loginButton != null)
            {
                loginButton.onClick.RemoveAllListeners();
                loginButton.onClick.AddListener(OnLoginClicked);
                loginButton.interactable = true;
                Debug.Log("[LoginUI] Login button setup complete");
            }
            else
            {
                Debug.LogWarning("[LoginUI] Login button is null!");
            }
            
            if (registerButton != null)
            {
                registerButton.onClick.RemoveAllListeners();
                registerButton.onClick.AddListener(OnRegisterClicked);
                registerButton.interactable = true;
                Debug.Log("[LoginUI] Register button setup complete");
            }
            else
            {
                Debug.LogWarning("[LoginUI] Register button is null!");
            }
            
            // Ensure EventSystem is working
            EventSystemHelper.EnsureEventSystem();
            EventSystemHelper.VerifyEventSystem();
        }

        public void ShowLoginPanel()
        {
            if (loginPanel != null)
            {
                loginPanel.SetActive(true);
                Debug.Log("[LoginUI] Login panel shown");
                SetStatus("Enter your username to sync with the cloud.", bodyTextColor);
            }
            else
            {
                Debug.LogError("[LoginUI] Login panel is null! Cannot show login.");
                // Try to recreate it
                LoadGUIAssets();
                if (loginPanel != null)
                {
                    loginPanel.SetActive(true);
                    Debug.Log("[LoginUI] Login panel recreated and shown");
                }
            }
            
            // Ensure EventSystem is working
            EventSystemHelper.EnsureEventSystem();
        }

        public void HideLoginPanel()
        {
            if (loginPanel != null)
            {
                loginPanel.SetActive(false);
            }
        }

        public static void PromptLogin(string message = null, Color? color = null)
        {
            LoginUI instance = Instance ?? FindObjectOfType<LoginUI>(true);
            if (instance == null)
            {
                Debug.LogWarning("[LoginUI] PromptLogin called but no LoginUI instance exists.");
                return;
            }

            if (instance != Instance)
            {
                Instance = instance;
            }

            instance.ShowLoginPanel();

            if (!string.IsNullOrEmpty(message))
            {
                instance.SetStatus(message, color ?? Color.red);
            }
        }

        private void OnLoginClicked()
        {
            string username = usernameInput != null ? usernameInput.text.Trim() : "";
            
            if (!ValidateUsername(username, out string validationMessage))
            {
                SetStatus(validationMessage, Color.red);
                return;
            }

            if (NetworkService.Instance == null)
            {
                SetStatus("NetworkService not initialized", Color.red);
                return;
            }

            SetStatus("Logging in...", Color.yellow);
            NetworkService.Instance.Login(username, (response) =>
            {
                HandleAuthSuccess(response, "Logged in successfully!");
            }, (error) =>
            {
                SetStatus($"Login failed: {error}", Color.red);
            });
        }

        private void OnRegisterClicked()
        {
            string username = usernameInput != null ? usernameInput.text.Trim() : "";
            string email = emailInput != null ? emailInput.text.Trim() : "";
            
            if (!ValidateUsername(username, out string validationMessage))
            {
                SetStatus(validationMessage, Color.red);
                return;
            }

            if (NetworkService.Instance == null)
            {
                SetStatus("NetworkService not initialized", Color.red);
                return;
            }

            SetStatus("Registering...", Color.yellow);
            NetworkService.Instance.Register(username, email, (response) =>
            {
                HandleAuthSuccess(response, "Registered successfully!");
            }, (error) =>
            {
                SetStatus($"Registration failed: {error}", Color.red);
            });
        }

        public void SetStatus(string message, Color color)
        {
            if (statusLabel != null)
            {
                statusLabel.text = message;
                statusLabel.color = color;
            }
        }

        private bool ValidateUsername(string username, out string message)
        {
            if (string.IsNullOrEmpty(username))
            {
                message = "Please enter your username.";
                return false;
            }

            if (!UsernameRegex.IsMatch(username))
            {
                message = UsernameHint;
                return false;
            }

            message = null;
            return true;
        }

        private void HandleAuthSuccess(AuthResponse response, string successMessage)
        {
            if (response == null || string.IsNullOrEmpty(response.userId))
            {
                SetStatus("Invalid auth response from server.", Color.red);
                return;
            }

            if (GameStateManager.Instance == null)
            {
                SetStatus("Game state not initialized.", Color.red);
                return;
            }

            Debug.Log("[LoginUI] Login/Register succeeded, setting user context...");
            GameStateManager.Instance.SetUserContext(response.userId, GameStateManager.Instance.cityId, DefaultKingdomId);

            if (NetworkService.Instance == null)
            {
                SetStatus("NetworkService not initialized", Color.red);
                return;
            }

            NetworkService.Instance.GetCityId(response.userId, (cityResponse) =>
            {
                if (cityResponse != null && !string.IsNullOrEmpty(cityResponse.cityId))
                {
                    GameStateManager.Instance.SetUserContext(response.userId, cityResponse.cityId, GameStateManager.Instance.kingdomId);
                }

                SetStatus(successMessage, Color.green);
                HideLoginPanel();
            }, (error) =>
            {
                Debug.LogWarning($"[LoginUI] City lookup failed: {error}");
                SetStatus($"Logged in but city error: {error}", Color.yellow);
                HideLoginPanel();
            });
        }
    }
}

