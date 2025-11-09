#if NEWTONSOFT_JSON
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace KingdomsPersist.Models
{
    /// <summary>
    /// Centralized JSON serialization settings for consistency
    /// Note: This class requires Newtonsoft.Json package to be installed
    /// </summary>
    public static class JsonSettings
    {
        public static JsonSerializerSettings DefaultSettings => new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore,
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new SnakeCaseNamingStrategy()
            },
            DateFormatHandling = DateFormatHandling.IsoDateFormat
        };
    }
}
#endif

