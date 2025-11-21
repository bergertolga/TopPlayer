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

    // Hero Models
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Hero
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("name")]
        public string name;
        
        [JsonProperty("rarity")]
        public string rarity; // common, rare, epic, legendary
        
        [JsonProperty("base_power")]
        public int base_power;
        
        [JsonProperty("upgrade_cost_base")]
        public int upgrade_cost_base;
        
        [JsonProperty("unlock_requirement")]
        public string unlock_requirement;
        
        [JsonProperty("description")]
        public string description;
        
        [JsonProperty("element")]
        public string element;
        
        [JsonProperty("created_at")]
        public long created_at;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class UserHero
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("user_id")]
        public string user_id;
        
        [JsonProperty("hero_id")]
        public string hero_id;
        
        [JsonProperty("level")]
        public int level;
        
        [JsonProperty("stars")]
        public int stars;
        
        [JsonProperty("experience")]
        public int experience;
        
        [JsonProperty("equipped_weapon_id")]
        public string equipped_weapon_id;
        
        [JsonProperty("equipped_armor_id")]
        public string equipped_armor_id;
        
        [JsonProperty("equipped_accessory_id")]
        public string equipped_accessory_id;
        
        [JsonProperty("created_at")]
        public long created_at;
        
        // Joined data
        [JsonProperty("name")]
        public string name;
        
        [JsonProperty("rarity")]
        public string rarity;
        
        [JsonProperty("base_power")]
        public int? base_power;
        
        [JsonProperty("element")]
        public string element;
        
        public int CurrentPower
        {
            get
            {
                if (!base_power.HasValue) return 0;
                double levelMultiplier = 1.0 + (level - 1) * 0.1;
                double starMultiplier = 1.0 + stars * 0.2;
                return (int)(base_power.Value * levelMultiplier * starMultiplier);
            }
        }
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class HeroesResponse
    {
        [JsonProperty("heroes")]
        public List<Hero> heroes = new List<Hero>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class UserHeroesResponse
    {
        [JsonProperty("heroes")]
        public List<UserHero> heroes = new List<UserHero>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class HeroUpgradeResponse
    {
        [JsonProperty("success")]
        public bool success;
        
        [JsonProperty("newLevel")]
        public int newLevel;
        
        [JsonProperty("newPower")]
        public int newPower;
        
        [JsonProperty("cost")]
        public int cost;
        
        [JsonProperty("remainingCurrency")]
        public int remainingCurrency;
    }

    // Adventure Models
    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Adventure
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("stage_number")]
        public int stage_number;
        
        [JsonProperty("name")]
        public string name;
        
        [JsonProperty("description")]
        public string description;
        
        [JsonProperty("enemy_power")]
        public int enemy_power;
        
        [JsonProperty("reward_coins")]
        public int reward_coins;
        
        [JsonProperty("reward_gems")]
        public int reward_gems;
        
        [JsonProperty("reward_hero_shards")]
        public string reward_hero_shards; // JSON string
        
        [JsonProperty("energy_cost")]
        public int energy_cost;
        
        [JsonProperty("created_at")]
        public long created_at;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class AdventureProgress
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("user_id")]
        public string user_id;
        
        [JsonProperty("adventure_id")]
        public string adventure_id;
        
        [JsonProperty("stars_earned")]
        public int stars_earned;
        
        [JsonProperty("completed_at")]
        public long? completed_at;
        
        [JsonProperty("best_time")]
        public int? best_time;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class AdventureStagesResponse
    {
        [JsonProperty("stages")]
        public List<Adventure> stages = new List<Adventure>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class AdventureProgressResponse
    {
        [JsonProperty("progress")]
        public List<AdventureProgress> progress = new List<AdventureProgress>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class HeroShard
    {
        [JsonProperty("heroId")]
        public string heroId;
        
        [JsonProperty("amount")]
        public int amount;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class BattleRewards
    {
        [JsonProperty("coins")]
        public int coins;
        
        [JsonProperty("gems")]
        public int gems;
        
        [JsonProperty("resources")]
        public Dictionary<string, int> resources;
        
        [JsonProperty("heroShards")]
        public List<HeroShard> heroShards;
        
        [JsonProperty("heroXP")]
        public int heroXP; // XP awarded per hero
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class BattleResultResponse
    {
        [JsonProperty("victory")]
        public bool victory;
        
        [JsonProperty("stars")]
        public int stars;
        
        [JsonProperty("time")]
        public int time;
        
        [JsonProperty("rewards")]
        public BattleRewards rewards;
        
        [JsonProperty("leveledUpHeroes")]
        public List<string> leveledUpHeroes; // Hero IDs that leveled up
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CancelOrderResponse
    {
        [JsonProperty("success")]
        public bool success;
        
        [JsonProperty("error")]
        public string error;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class MarketOrder
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("city_id")]
        public string city_id;
        
        [JsonProperty("side")]
        public string side; // "buy" or "sell"
        
        [JsonProperty("item")]
        public string item;
        
        [JsonProperty("qty")]
        public int qty;
        
        [JsonProperty("price")]
        public float price;
        
        [JsonProperty("status")]
        public string status; // "open", "filled", "cancelled"
        
        [JsonProperty("created_at")]
        public long created_at;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class Route
    {
        [JsonProperty("id")]
        public string id;
        
        [JsonProperty("city_id")]
        public string city_id;
        
        [JsonProperty("from_region_id")]
        public string from_region_id;
        
        [JsonProperty("to_region_id")]
        public string to_region_id;
        
        [JsonProperty("from_region_name")]
        public string from_region_name;
        
        [JsonProperty("to_region_name")]
        public string to_region_name;
        
        [JsonProperty("resource_id")]
        public string resource_id;
        
        [JsonProperty("resource_code")]
        public string resource_code;
        
        [JsonProperty("resource_name")]
        public string resource_name;
        
        [JsonProperty("qty_per_trip")]
        public int qty_per_trip;
        
        [JsonProperty("next_departure")]
        public long next_departure;
        
        [JsonProperty("status")]
        public string status;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class RoutesResponse
    {
        [JsonProperty("routes")]
        public List<Route> routes = new List<Route>();
        
        [JsonProperty("error")]
        public string error;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CreateRouteRequest
    {
        [JsonProperty("fromRegion")]
        public string fromRegion;
        
        [JsonProperty("toRegion")]
        public string toRegion;
        
        [JsonProperty("resource")]
        public string resource;
        
        [JsonProperty("qtyPerTrip")]
        public int qtyPerTrip;
        
        [JsonProperty("repeats")]
        public int? repeats;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CreateRouteResponse
    {
        [JsonProperty("success")]
        public bool success;
        
        [JsonProperty("route")]
        public Route route;
        
        [JsonProperty("error")]
        public string error;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class DailyRewardsStatusResponse
    {
        [JsonProperty("day")]
        public int day;
        
        [JsonProperty("canClaim")]
        public bool canClaim;
        
        [JsonProperty("nextClaimTime")]
        public long nextClaimTime;
        
        [JsonProperty("rewards")]
        public List<DailyReward> rewards = new List<DailyReward>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class DailyReward
    {
        [JsonProperty("day")]
        public int day;
        
        [JsonProperty("coins")]
        public int coins;
        
        [JsonProperty("gems")]
        public int gems;
        
        [JsonProperty("claimed")]
        public bool claimed;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class ClaimDailyRewardResponse
    {
        [JsonProperty("success")]
        public bool success;
        
        [JsonProperty("rewards")]
        public DailyReward rewards;
        
        [JsonProperty("error")]
        public string error;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class LeaderboardEntry
    {
        [JsonProperty("rank")]
        public int rank;
        
        [JsonProperty("userId")]
        public string userId;
        
        [JsonProperty("username")]
        public string username;
        
        [JsonProperty("value")]
        public float value;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class LeaderboardResponse
    {
        [JsonProperty("type")]
        public string type;
        
        [JsonProperty("entries")]
        public List<LeaderboardEntry> entries = new List<LeaderboardEntry>();
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class AuthResponse
    {
        [JsonProperty("userId")]
        public string userId;
        
        [JsonProperty("username")]
        public string username;
    }

    [Serializable]
    [JsonObject(MemberSerialization.OptIn)]
    public class CityIdResponse
    {
        [JsonProperty("cityId")]
        public string cityId;
    }
}

