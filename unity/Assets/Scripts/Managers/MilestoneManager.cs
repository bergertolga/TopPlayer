using System;
using System.Collections.Generic;
using UnityEngine;
using KingdomsPersist.Models;
using KingdomsPersist.Services;

namespace KingdomsPersist.Managers
{
    public class MilestoneManager : MonoBehaviour
    {
        public static MilestoneManager Instance { get; private set; }

        [Header("Polling")]
        public float pollInterval = 10f; // Poll every 10 seconds

        [Header("State")]
        public List<Milestone> milestones = new List<Milestone>();
        public int unclaimedCount = 0;

        private float pollTimer = 0f;
        private bool isPolling = false;

        // Events
        public event Action<List<Milestone>> OnMilestonesUpdated;
        public event Action<Milestone> OnMilestoneClaimed;
        public event Action<Milestone> OnNewMilestoneAchieved;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Initial fetch
            RefreshMilestones();
        }

        private void Update()
        {
            if (isPolling) return;

            pollTimer += Time.deltaTime;
            if (pollTimer >= pollInterval)
            {
                pollTimer = 0f;
                RefreshMilestones();
            }
        }

        public void RefreshMilestones()
        {
            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                return;
            }

            if (GameStateManager.Instance == null)
            {
                Debug.LogError("GameStateManager.Instance is null. Cannot get userId.");
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }

            isPolling = true;
            NetworkService.Instance.GetMilestones(userId, (response) =>
            {
                isPolling = false;
                if (response == null || response.milestones == null)
                {
                    Debug.LogError("Received null response or milestones from server");
                    return;
                }

                // Check for new milestones
                var previousMilestoneIds = new HashSet<string>();
                foreach (var milestone in milestones)
                {
                    previousMilestoneIds.Add(milestone.id);
                }

                // Update milestones list
                milestones = response.milestones;

                // Count unclaimed milestones
                unclaimedCount = 0;
                foreach (var milestone in milestones)
                {
                    if (!milestone.IsClaimed)
                    {
                        unclaimedCount++;
                    }

                    // Check if this is a new milestone
                    if (!previousMilestoneIds.Contains(milestone.id))
                    {
                        OnNewMilestoneAchieved?.Invoke(milestone);
                    }
                }

                OnMilestonesUpdated?.Invoke(milestones);
            }, (error) =>
            {
                isPolling = false;
                Debug.LogError($"Failed to fetch milestones: {error}");
            });
        }

        public void ClaimMilestone(string milestoneId, Action<bool> onComplete = null)
        {
            if (NetworkService.Instance == null)
            {
                Debug.LogError("NetworkService.Instance is null. Make sure NetworkService is initialized.");
                onComplete?.Invoke(false);
                return;
            }

            if (GameStateManager.Instance == null)
            {
                Debug.LogError("GameStateManager.Instance is null. Cannot get userId.");
                onComplete?.Invoke(false);
                return;
            }

            string userId = GameStateManager.Instance.userId;
            if (string.IsNullOrEmpty(userId))
            {
                onComplete?.Invoke(false);
                return;
            }

            NetworkService.Instance.ClaimMilestoneReward(userId, milestoneId, (response) =>
            {
                if (response == null)
                {
                    Debug.LogError("Received null response from server");
                    onComplete?.Invoke(false);
                    return;
                }

                if (response.success)
                {
                    Debug.Log($"Milestone claimed successfully: {milestoneId}");
                    
                    // Find and update the milestone in our list
                    var milestone = milestones.Find(m => m.id == milestoneId);
                    if (milestone != null)
                    {
                        milestone.claimed_at = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                        OnMilestoneClaimed?.Invoke(milestone);
                    }

                    // Refresh milestones to get updated state
                    RefreshMilestones();

                    // Refresh city state to get updated resources
                    if (GameStateManager.Instance != null)
                    {
                        GameStateManager.Instance.RefreshCityState();
                    }

                    onComplete?.Invoke(true);
                }
                else
                {
                    Debug.LogError($"Failed to claim milestone: {response.error ?? "Unknown error"}");
                    onComplete?.Invoke(false);
                }
            }, (error) =>
            {
                Debug.LogError($"Claim milestone failed: {error}");
                onComplete?.Invoke(false);
            });
        }

        public List<Milestone> GetUnclaimedMilestones()
        {
            return milestones.FindAll(m => !m.IsClaimed);
        }

        public Milestone GetMilestone(string milestoneId)
        {
            return milestones.Find(m => m.id == milestoneId);
        }
    }
}

