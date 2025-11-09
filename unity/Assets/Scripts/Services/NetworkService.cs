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
        public void GetRealmTime(Action<RealmTimeResponse> onSuccess, Action<string> onError)
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
            }, onError));
        }

        // GET /city/:id/state
        public void GetCityState(string cityId, Action<CityStateResponse> onSuccess, Action<string> onError)
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
            }, onError));
        }

        // POST /city/:id/command
        public void SubmitCommand(string cityId, Command command, Action<CommandResponse> onSuccess, Action<string> onError)
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
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize command: {e.Message}");
            }
        }

        // GET /kingdom/:id/market/orderbook
        public void GetMarketOrderBook(string kingdomId, string item, Action<OrderBookResponse> onSuccess, Action<string> onError)
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
            }, onError));
        }

        // POST /kingdom/:id/market/order
        public void PlaceMarketOrder(string kingdomId, string cityId, OrderPlaceCommand order, Action<CommandResponse> onSuccess, Action<string> onError)
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
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to serialize order: {e.Message}");
            }
        }

        private IEnumerator GetRequest(string url, Action<string> onSuccess, Action<string> onError)
        {
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
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

        private IEnumerator PostRequest(string url, string json, Action<string> onSuccess, Action<string> onError)
        {
            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");

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
    }
}

