using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using KingdomsPersist.Models;
using Newtonsoft.Json;

namespace KingdomsPersist.Services
{
    public class NetworkService : MonoBehaviour
    {
        public static NetworkService Instance { get; private set; }

        [Header("Configuration")]
        public string baseUrl = "https://idle-adventure-backend.tolga-730.workers.dev";

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

        // GET /realm/time
        public void GetRealmTime(Action<RealmTimeResponse> onSuccess, Action<string> onError, string userId = null)
        {
            StartCoroutine(GetRequest($"{baseUrl}/realm/time", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<RealmTimeResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize realm time response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse realm time: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // GET /city/:id/state
        public void GetCityState(string cityId, Action<CityStateResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(cityId))
            {
                onError?.Invoke("City ID is required");
                return;
            }
            
            StartCoroutine(GetRequest($"{baseUrl}/city/{cityId}/state", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<CityStateResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize city state response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse city state: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /city/:id/command
        public void SubmitCommand(string cityId, Command command, Action<CommandResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(cityId))
            {
                onError?.Invoke("City ID is required");
                return;
            }
            
            if (command == null)
            {
                onError?.Invoke("Command cannot be null");
                return;
            }
            
            try
            {
                string json = JsonConvert.SerializeObject(command, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });
                
                StartCoroutine(PostRequest($"{baseUrl}/city/{cityId}/command", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<CommandResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize command response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse command response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize command: {e.Message}");
            }
        }

        // GET /kingdom/:id/market/orderbook
        public void GetMarketOrderBook(string kingdomId, string item, Action<OrderBookResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(kingdomId) || string.IsNullOrEmpty(item))
            {
                onError?.Invoke("Kingdom ID and item are required");
                return;
            }
            
            StartCoroutine(GetRequest($"{baseUrl}/kingdom/{kingdomId}/market/orderbook?item={UnityWebRequest.EscapeURL(item)}", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<OrderBookResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize order book response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse order book: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /kingdom/:id/market/order
        public void PlaceMarketOrder(string kingdomId, string cityId, OrderPlaceCommand order, Action<CommandResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(kingdomId) || string.IsNullOrEmpty(cityId))
            {
                onError?.Invoke("Kingdom ID and City ID are required");
                return;
            }

            if (order == null)
            {
                onError?.Invoke("Order cannot be null");
                return;
            }

            try
            {
                var orderData = new
                {
                    city_id = cityId,
                    side = order.side,
                    item = order.item,
                    qty = order.qty,
                    price = order.price
                };
                string json = JsonConvert.SerializeObject(orderData, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });
                
                StartCoroutine(PostRequest($"{baseUrl}/kingdom/{kingdomId}/market/order", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<CommandResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize order response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse order response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize order: {e.Message}");
            }
        }

        // GET /api/v1/achievements
        public void GetMilestones(string userId, Action<MilestonesResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/v1/achievements", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<MilestonesResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize milestones response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse milestones: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /api/v1/achievements/claim
        public void ClaimMilestoneReward(string userId, string milestoneId, Action<ClaimMilestoneResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            if (string.IsNullOrEmpty(milestoneId))
            {
                onError?.Invoke("Milestone ID is required");
                return;
            }

            try
            {
                var request = new ClaimMilestoneRequest(milestoneId);
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/v1/achievements/claim", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<ClaimMilestoneResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize claim response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse claim response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize claim request: {e.Message}");
            }
        }

        private IEnumerator GetRequest(string url, Action<string> onSuccess, Action<string> onError, string userId = null)
        {
            // Add userId to URL if provided
            if (!string.IsNullOrEmpty(userId))
            {
                string separator = url.Contains("?") ? "&" : "?";
                url = $"{url}{separator}userId={UnityWebRequest.EscapeURL(userId)}";
            }

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                // Add userId header if provided
                if (!string.IsNullOrEmpty(userId))
                {
                    request.SetRequestHeader("X-User-ID", userId);
                }

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    string responseText = request.downloadHandler?.text ?? "";
                    onSuccess?.Invoke(responseText);
                }
                else
                {
                    string errorMessage = request.error;
                    if (request.downloadHandler != null && !string.IsNullOrEmpty(request.downloadHandler.text))
                    {
                        errorMessage += $"\nResponse: {request.downloadHandler.text}";
                    }
                    onError?.Invoke($"Request failed ({request.responseCode}): {errorMessage}");
                }
            }
        }

        private IEnumerator PostRequest(string url, string json, Action<string> onSuccess, Action<string> onError, string userId = null)
        {
            // Add userId to URL if provided
            if (!string.IsNullOrEmpty(userId))
            {
                string separator = url.Contains("?") ? "&" : "?";
                url = $"{url}{separator}userId={UnityWebRequest.EscapeURL(userId)}";
            }

            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                // Add userId header if provided
                if (!string.IsNullOrEmpty(userId))
                {
                    request.SetRequestHeader("X-User-ID", userId);
                }

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    string responseText = request.downloadHandler?.text ?? "";
                    onSuccess?.Invoke(responseText);
                }
                else
                {
                    string errorMessage = request.error;
                    if (request.downloadHandler != null && !string.IsNullOrEmpty(request.downloadHandler.text))
                    {
                        errorMessage += $"\nResponse: {request.downloadHandler.text}";
                    }
                    onError?.Invoke($"Request failed ({request.responseCode}): {errorMessage}");
                }
            }
        }

        // GET /api/heroes
        public void GetAllHeroes(Action<HeroesResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(GetRequest($"{baseUrl}/api/heroes", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<HeroesResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize heroes response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse heroes: {e.Message}\nResponse: {json}");
                }
            }, onError));
        }

        // GET /api/heroes/user?userId=...
        public void GetUserHeroes(string userId, Action<UserHeroesResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/heroes/user", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<UserHeroesResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize user heroes response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse user heroes: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /api/heroes/upgrade
        public void UpgradeHero(string userId, string userHeroId, Action<HeroUpgradeResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            if (string.IsNullOrEmpty(userHeroId))
            {
                onError?.Invoke("User Hero ID is required");
                return;
            }

            try
            {
                var request = new { userHeroId = userHeroId };
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/heroes/upgrade", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<HeroUpgradeResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize upgrade response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse upgrade response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize upgrade request: {e.Message}");
            }
        }

        // GET /api/adventure/stages
        public void GetAdventureStages(Action<AdventureStagesResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(GetRequest($"{baseUrl}/api/adventure/stages", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<AdventureStagesResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize adventure stages response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse adventure stages: {e.Message}\nResponse: {json}");
                }
            }, onError));
        }

        // GET /api/adventure/progress?userId=...
        public void GetAdventureProgress(string userId, Action<AdventureProgressResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/adventure/progress", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<AdventureProgressResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize adventure progress response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse adventure progress: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /api/adventure/complete
        public void CompleteAdventure(string userId, string adventureId, string[] heroIds, Action<BattleResultResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            if (string.IsNullOrEmpty(adventureId))
            {
                onError?.Invoke("Adventure ID is required");
                return;
            }

            if (heroIds == null || heroIds.Length == 0)
            {
                onError?.Invoke("At least one hero ID is required");
                return;
            }

            try
            {
                var request = new { adventureId = adventureId, heroIds = heroIds };
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/adventure/complete", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<BattleResultResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize battle result response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse battle result: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize adventure complete request: {e.Message}");
            }
        }

        // POST /api/v1/market/cancel
        public void CancelMarketOrder(string userId, string orderId, Action<CancelOrderResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            if (string.IsNullOrEmpty(orderId))
            {
                onError?.Invoke("Order ID is required");
                return;
            }

            try
            {
                var request = new { orderId = orderId };
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/v1/market/cancel", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<CancelOrderResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize cancel order response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse cancel order response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize cancel order request: {e.Message}");
            }
        }

        // POST /city/:id/command (for ORDER_CANCEL command)
        public void CancelOrderViaCommand(string cityId, string orderId, Action<CommandResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(cityId))
            {
                onError?.Invoke("City ID is required");
                return;
            }

            if (string.IsNullOrEmpty(orderId))
            {
                onError?.Invoke("Order ID is required");
                return;
            }

            var command = new OrderCancelCommand
            {
                order_id = orderId
            };

            SubmitCommand(cityId, command, onSuccess, onError, userId);
        }

        // GET /api/v1/routes
        public void GetRoutes(string userId, Action<RoutesResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/v1/routes?userId={userId}", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<RoutesResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize routes response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse routes: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /api/v1/routes/create
        public void CreateRoute(string userId, CreateRouteRequest request, Action<CreateRouteResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            try
            {
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/v1/routes/create?userId={userId}", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<CreateRouteResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize create route response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse create route response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError, userId));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize create route request: {e.Message}");
            }
        }

        // GET /api/daily-rewards/status
        public void GetDailyRewardsStatus(string userId, Action<DailyRewardsStatusResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/daily-rewards/status?userId={userId}", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<DailyRewardsStatusResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize daily rewards status response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse daily rewards status: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }

        // POST /api/daily-rewards/claim
        public void ClaimDailyReward(string userId, Action<ClaimDailyRewardResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(PostRequest($"{baseUrl}/api/daily-rewards/claim?userId={userId}", "{}", (responseJson) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(responseJson))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<ClaimDailyRewardResponse>(responseJson);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize claim daily reward response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse claim daily reward response: {e.Message}\nResponse: {responseJson}");
                }
            }, onError, userId));
        }

        // GET /api/leaderboard
        public void GetLeaderboard(string leaderboardType, Action<LeaderboardResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(leaderboardType))
            {
                leaderboardType = "power"; // Default
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/leaderboard?type={leaderboardType}", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<LeaderboardResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize leaderboard response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse leaderboard: {e.Message}\nResponse: {json}");
                }
            }, onError));
        }

        // POST /city/:id/command (for EXPEDITION_START command)
        public void StartExpedition(string cityId, ExpeditionStartCommand command, Action<CommandResponse> onSuccess, Action<string> onError, string userId = null)
        {
            if (string.IsNullOrEmpty(cityId))
            {
                onError?.Invoke("City ID is required");
                return;
            }

            SubmitCommand(cityId, command, onSuccess, onError, userId);
        }

        // POST /api/auth/register
        public void Register(string username, string email, Action<AuthResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(username))
            {
                onError?.Invoke("Username is required");
                return;
            }

            try
            {
                var request = new { username = username, email = string.IsNullOrEmpty(email) ? null : email };
                string json = JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });

                StartCoroutine(PostRequest($"{baseUrl}/api/auth/register", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<AuthResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize auth response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse auth response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize register request: {e.Message}");
            }
        }

        // POST /api/auth/login
        public void Login(string username, Action<AuthResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(username))
            {
                onError?.Invoke("Username is required");
                return;
            }

            try
            {
                var request = new { username = username };
                string json = JsonConvert.SerializeObject(request, Formatting.None);

                StartCoroutine(PostRequest($"{baseUrl}/api/auth/login", json, (responseJson) =>
                {
                    try
                    {
                        if (string.IsNullOrEmpty(responseJson))
                        {
                            onError?.Invoke("Empty response from server");
                            return;
                        }
                        var response = JsonConvert.DeserializeObject<AuthResponse>(responseJson);
                        if (response == null)
                        {
                            onError?.Invoke("Failed to deserialize auth response");
                            return;
                        }
                        onSuccess?.Invoke(response);
                    }
                    catch (JsonException e)
                    {
                        onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {responseJson}");
                    }
                    catch (Exception e)
                    {
                        onError?.Invoke($"Failed to parse auth response: {e.Message}\nResponse: {responseJson}");
                    }
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize login request: {e.Message}");
            }
        }

        // GET /api/v1/city?userId=... (get city ID for user)
        public void GetCityId(string userId, Action<CityIdResponse> onSuccess, Action<string> onError)
        {
            if (string.IsNullOrEmpty(userId))
            {
                onError?.Invoke("User ID is required");
                return;
            }

            StartCoroutine(GetRequest($"{baseUrl}/api/v1/city?userId={UnityWebRequest.EscapeURL(userId)}&cityIdOnly=true", (json) =>
            {
                try
                {
                    if (string.IsNullOrEmpty(json))
                    {
                        onError?.Invoke("Empty response from server");
                        return;
                    }
                    var response = JsonConvert.DeserializeObject<CityIdResponse>(json);
                    if (response == null)
                    {
                        onError?.Invoke("Failed to deserialize city ID response");
                        return;
                    }
                    onSuccess?.Invoke(response);
                }
                catch (JsonException e)
                {
                    onError?.Invoke($"JSON parse error: {e.Message}\nResponse: {json}");
                }
                catch (Exception e)
                {
                    onError?.Invoke($"Failed to parse city ID: {e.Message}\nResponse: {json}");
                }
            }, onError, userId));
        }
    }
}

