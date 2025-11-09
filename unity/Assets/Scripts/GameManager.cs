using UnityEngine;
using KingdomsPersist.Services;
using KingdomsPersist.Managers;

namespace KingdomsPersist
{
    public class GameManager : MonoBehaviour
    {
        [Header("Services")]
        public NetworkService networkServicePrefab;
        public GameStateManager gameStateManagerPrefab;

        private void Awake()
        {
            // Initialize services
            // Check if instances already exist in scene (not from prefabs)
            if (NetworkService.Instance == null)
            {
                NetworkService existing = FindObjectOfType<NetworkService>();
                if (existing == null && networkServicePrefab != null)
                {
                    Instantiate(networkServicePrefab);
                }
            }

            if (GameStateManager.Instance == null)
            {
                GameStateManager existing = FindObjectOfType<GameStateManager>();
                if (existing == null && gameStateManagerPrefab != null)
                {
                    Instantiate(gameStateManagerPrefab);
                }
            }
        }
    }
}

