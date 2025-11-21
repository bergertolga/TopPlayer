using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace KingdomsPersist.UI.Components
{
    public class BuildingItemView : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI titleLabel;
        [SerializeField] private TextMeshProUGUI detailLabel;
        [SerializeField] private Image iconImage;

        public TextMeshProUGUI TitleLabel => titleLabel;
        public TextMeshProUGUI DetailLabel => detailLabel;

        public void SetData(string title, string detail, Sprite icon = null)
        {
            if (titleLabel != null)
            {
                titleLabel.text = title ?? string.Empty;
            }

            if (detailLabel != null)
            {
                detailLabel.text = detail ?? string.Empty;
            }

            if (iconImage != null)
            {
                iconImage.sprite = icon;
                iconImage.enabled = icon != null;
            }
        }
    }
}

