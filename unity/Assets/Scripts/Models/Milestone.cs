using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace KingdomsPersist.Models
{
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Milestone
    {
        [JsonProperty("id")]
        public string id;

        [JsonProperty("user_id")]
        public string user_id;

        [JsonProperty("milestone_type")]
        public string milestone_type;

        [JsonProperty("milestone_value")]
        public int milestone_value;

        [JsonProperty("achieved_at")]
        public long achieved_at;

        [JsonProperty("reward_coins")]
        public int reward_coins;

        [JsonProperty("reward_gems")]
        public int reward_gems;

        [JsonProperty("reward_resources_json")]
        public string reward_resources_json;

        [JsonProperty("reward_resources")]
        public Dictionary<string, int> reward_resources = new Dictionary<string, int>();

        [JsonProperty("claimed_at")]
        public long? claimed_at;

        public bool IsClaimed => claimed_at.HasValue && claimed_at.Value > 0;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class MilestonesResponse
    {
        [JsonProperty("milestones")]
        public List<Milestone> milestones = new List<Milestone>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class ClaimMilestoneRequest
    {
        [JsonProperty("milestoneId")]
        public string milestoneId;

        public ClaimMilestoneRequest(string milestoneId)
        {
            this.milestoneId = milestoneId;
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class ClaimMilestoneResponse
    {
        [JsonProperty("success")]
        public bool success;

        [JsonProperty("error")]
        public string error;
    }
}

