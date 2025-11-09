using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace KingdomsPersist.Models
{
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CityState
    {
        [JsonProperty("ticks")]
        public int ticks;
        
        [JsonProperty("resources")]
        public Dictionary<string, float> resources = new Dictionary<string, float>();
        
        [JsonProperty("labor")]
        public LaborState labor = new LaborState();
        
        [JsonProperty("buildings")]
        public List<Building> buildings = new List<Building>();
        
        [JsonProperty("laws")]
        public Laws laws = new Laws();
        
        [JsonProperty("units")]
        public Dictionary<string, int> units = new Dictionary<string, int>();
        
        [JsonProperty("heroes")]
        public List<Hero> heroes = new List<Hero>();
        
        [JsonProperty("queues")]
        public Queues queues = new Queues();
        
        [JsonProperty("version")]
        public int version;
        
        [JsonProperty("seed")]
        public int seed;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class LaborState
    {
        [JsonProperty("free")]
        public int free;
        
        [JsonProperty("assigned")]
        public Dictionary<string, int> assigned = new Dictionary<string, int>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Building
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("lvl")]
        public int lvl;
        
        [JsonProperty("slot")]
        public int? slot;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Laws
    {
        [JsonProperty("tax")]
        public float tax;
        
        [JsonProperty("market_fee")]
        public float market_fee;
        
        [JsonProperty("rationing")]
        public string rationing; // "normal", "strict", "abundant"
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Hero
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("cmd")]
        public int cmd; // Command stat
        
        [JsonProperty("crf")]
        public int crf; // Craft stat
        
        [JsonProperty("cng")]
        public int cng; // Cunning stat
        
        [JsonProperty("traits")]
        public List<string> traits = new List<string>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Queues
    {
        [JsonProperty("build")]
        public List<BuildCommand> build = new List<BuildCommand>();
        
        [JsonProperty("train")]
        public List<TrainCommand> train = new List<TrainCommand>();
    }
}

