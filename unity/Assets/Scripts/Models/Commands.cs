using System;
using Newtonsoft.Json;

namespace KingdomsPersist.Models
{
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public abstract class Command
    {
        [JsonProperty("type")]
        public string type;
        
        [JsonProperty("client_time")]
        public long client_time;
        
        [JsonProperty("id")]
        public string id;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class BuildCommand : Command
    {
        [JsonProperty("building")]
        public string building;
        
        [JsonProperty("slot")]
        public int slot;

        public BuildCommand()
        {
            type = "BUILD";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class TrainCommand : Command
    {
        [JsonProperty("unit")]
        public string unit;
        
        [JsonProperty("qty")]
        public int qty;

        public TrainCommand()
        {
            type = "TRAIN";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class LawSetCommand : Command
    {
        [JsonProperty("tax")]
        public float? tax;
        
        [JsonProperty("market_fee")]
        public float? market_fee;
        
        [JsonProperty("rationing")]
        public string rationing;

        public LawSetCommand()
        {
            type = "LAW_SET";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class OrderPlaceCommand : Command
    {
        [JsonProperty("side")]
        public string side; // "buy" or "sell"
        
        [JsonProperty("item")]
        public string item;
        
        [JsonProperty("qty")]
        public int qty;
        
        [JsonProperty("price")]
        public float price;

        public OrderPlaceCommand()
        {
            type = "ORDER_PLACE";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class OrderCancelCommand : Command
    {
        [JsonProperty("order_id")]
        public string order_id;

        public OrderCancelCommand()
        {
            type = "ORDER_CANCEL";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class ExpeditionStartCommand : Command
    {
        [JsonProperty("hero_ids")]
        public string[] hero_ids;
        
        [JsonProperty("destination")]
        public string destination;
        
        [JsonProperty("duration_ticks")]
        public int duration_ticks;

        public ExpeditionStartCommand()
        {
            type = "EXPEDITION_START";
            client_time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }
}

