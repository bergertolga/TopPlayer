using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using KingdomsPersist.Models;

namespace KingdomsPersist.Models
{
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class RealmTimeResponse
    {
        [JsonProperty("tick")]
        public int tick;
        
        [JsonProperty("iso_time")]
        public string iso_time;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CityStateResponse
    {
        [JsonProperty("state")]
        public CityState state;
        
        [JsonProperty("version")]
        public int version;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CommandResponse
    {
        [JsonProperty("accepted")]
        public bool accepted;
        
        [JsonProperty("command_id")]
        public string command_id;
        
        [JsonProperty("error")]
        public string error;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class OrderBookResponse
    {
        [JsonProperty("bids")]
        public List<OrderBookEntry> bids = new List<OrderBookEntry>();
        
        [JsonProperty("asks")]
        public List<OrderBookEntry> asks = new List<OrderBookEntry>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class OrderBookEntry
    {
        [JsonProperty("price")]
        public float price;
        
        [JsonProperty("qty")]
        public int qty;
    }
}

