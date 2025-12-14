# Implementation Plan - WebGL Hole Game
> Created by Antigravity Gemini 3 Pro High

## Goal
Create a "Donut County" clone in Three.js/TypeScript where a hole can move around and swallow objects.

## User Review Required
- **Framework Choice**: Using Vanilla TypeScript + Vite + Three.js + Cannon-es. No React/Vue to keep it simple and performance-focused as requested ("simple demo").

## Architectural Overview
The app will consist of a main `Game` class handling the loop, with separate modules for `Renderer`, `Physics`, and `Level`.

### 1. Rendering (The Stencil Trick)
We will replicate the Unity shader approach using Three.js Materials:
- **Hole Mask**: `MeshBasicMaterial` with `colorWrite: false`, `stencilWrite: true`, `stencilOp: Replace`.
- **Ground**: Standard Material with `stencilWrite: true`, `stencilFunc: NotEqual`.
- **Hole Interior**: Visible mesh inside the hole, `stencilFunc: Equal`.

### 2. Physics (Cannon-es)
- **World**: Standard gravity `-9.8`.
- **Ground**: Instead of a mesh with a hole, we use **4 BoxShapes** arranged around the hole's center.
    - As the hole moves, these 4 physical boxes move to stay around it.
    - As the hole grows, these boxes recede.
- **Objects**: primitive shapes (Box, Cylinder) with mass.

### 3. Swallowing Logic
- A "Trigger" zone (or simple distance check) in the center of the hole.
- **Check**: Is object X within the hole radius?
- **Logic**:
    - If `Distance(Object, Hole) < HoleRadius - ObjectRadius`:
    - Disable Physics Body.
    - Start GSAP/Popmotion animation (Scale down, move down Y).
    - Remove from scene when done.
    - Grow hole.

## Proposed Changes

### [NEW] Project Structure
- `src/main.ts`: Entry point.
- `src/Game.ts`: Orchestrator.
- `src/World.ts`: Setup Three.js scene & Cannon world.
- `src/objects/Hole.ts`: Manages the hole mesh, mask, and logic.
- `src/objects/Level.ts`: Populates the world.

## Verification Plan
### Automated Tests
- N/A for this visual demo.
### Manual Verification
- Open in browser.
- Move hole with mouse/keys.
- Verify objects sit on ground.
- Verify objects fall into hole when fully unsupported.
- Verify hole interior is visible.
