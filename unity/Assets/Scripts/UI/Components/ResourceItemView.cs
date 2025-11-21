using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace KingdomsPersist.UI.Components
{
    public class ResourceItemView : MonoBehaviour
    {
        [SerializeField] private Image iconImage;
        [SerializeField] private TextMeshProUGUI nameLabel;
        [SerializeField] private TextMeshProUGUI amountLabel;

        public TextMeshProUGUI NameLabel => nameLabel;
        public TextMeshProUGUI AmountLabel => amountLabel;

        public void SetData(Sprite icon, string displayName, string amountText, Color? accent = null)
        {
            if (iconImage != null)
            {
                iconImage.sprite = icon;
                iconImage.enabled = icon != null;
            }

            if (nameLabel != null)
            {
                nameLabel.text = displayName ?? string.Empty;
                if (accent.HasValue)
                {
                    nameLabel.color = accent.Value;
                }
            }

            if (amountLabel != null)
            {
                amountLabel.text = amountText ?? string.Empty;
            }
        }
    }
}

