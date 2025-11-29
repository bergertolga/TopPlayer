# Client API Guide

## Overview
This API provides a simplified view for clients to render the game state.

## Endpoints

### `GET /api/v1/client/overview`
**Headers**: `X-User-ID: <uuid>`

Returns the complete state for the logged-in user's dashboard.

**Example Response**:
```json
{
  "city": {
    "id": "city-123",
    "name": "My City",
    "level": 5,
    "resources": { "COINS": 1000, "FOOD": 500 },
    "buildings": [ { "type": "FARM", "level": 3 } ],
    "troops": [ { "type": "MILITIA", "count": 50 } ],
    "hospital": {
      "capacity": 1500,
      "occupied": 20,
      "woundedByType": [ { "type": "MILITIA", "count": 20 } ]
    }
  },
  "council": {
    "id": "council-456",
    "name": "The Guardians",
    "prestige": 1500,
    "badgeId": "BANNER_GOLD"
  },
  "events": { "active": [] },
  "premium": {
    "wallet": { "gems": 10 },
    "ownedCosmetics": []
  }
}
```

### `GET /api/v1/council/profile/:councilId`
Public profile for any council.

**Example Response**:
```json
{
  "identity": {
    "name": "War Mongers",
    "motto": "Strength in Steel",
    "focus": "military",
    "prestige": 5000
  },
  "stats": { "members": 25 },
  "tech": [ { "name": "Conscription", "status": "completed" } ],
  "leader": "KingArthur"
}
```

