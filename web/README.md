
# TopPlayer Web Client (Phase 6)

A functional, minimal frontend for the TopPlayer kingdom simulation.

## Overview

This web client connects to the TopPlayer Cloudflare Workers backend to provide a playable interface for:
- City Management (Resources, Buildings, Troops)
- Council Interaction (Tech Tree, Contributions)
- Combat (PvE Map, Battle Logs, Hospital)
- Events & Leaderboards

**Note:** This is a functional prototype. Visual styling, assets, and polish are explicitly deferred to Phase 7.

## Setup & Run

1.  **Install Dependencies**:
    ```bash
    cd web
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Backend Connection**:
    By default, the client connects to `http://localhost:8787`.
    To change this, set `VITE_API_BASE_URL` in `.env`.

## Architecture

- **Framework**: React 19 + TypeScript + Vite
- **State**: Local component state + Polling hooks (`usePolling`)
- **API**: `ApiClient.ts` wraps fetch calls with `X-User-ID` auth headers.
- **Routing**: `react-router-dom` for screen navigation.

## Screens

- **City**: Core economy loop.
- **Council**: Social progression.
- **Combat**: 4X mechanics (Attack & Heal).
- **Events**: Global competitions.
- **Profile**: Premium inventory.
