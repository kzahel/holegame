# WebGL Hole Game Walkthrough

I have implemented a "Donut County" style hole mechanic using **Three.js** and **Cannon-es**.

## Features Implemented

### 1. The Hole Illusion (Stencil Buffer)
- The hole is **not** a geometric hole in the ground mesh.
- Implemented using Stencil Buffers:
    - **Ground**: Renders only where `stencil != 1`.
    - **Mask**: Moving invisible **Circle** (at y~0) that writes `1` to stencil buffer.
    - **Interior**: Inverted cylinder that renders only where `stencil == 1`.
- **Render Order**: Mask (-1) -> Ground (0) -> Interior (1). This ensures perfect masking without side-wall artifacts.

### 2. Physics & Collisions
- Used **Cannon-es** for physics.
- The "Hole" in physics is created by **4 kinematic box colliders** forming a square ring.
- As the visible hole moves, these physics bodies move with it, allowing objects to fall through the center gap.
- **Controls**: Tuned for snappy response (higher friction/acceleration).

### 3. Gameplay Mechanics
- **Movement**: Use `WASD` or `Arrow Keys` to move the hole.
- **Swallowing**: Objects that fall into the hole are effectively "swallowed".
    - Code detects deep fall (`y < -5`) and removes the object from physics and scene.
- **Objects**:
    - **Trees**: Cylinder trunks + Cone leaves (Composite visuals, Box physics).
    - **Rocks**: Dodecahedrons (Sphere physics).
    - **Flowers/Grass**: Small decorative physics objects.

## How to Run
1. Open terminal.
2. Run `npm run dev`.
3. Open the localhost URL.
4. Move the hole under objects to swallow them!

## Technical Notes
- Entry point: `src/main.ts`
- Game Loop: `src/Game.ts`
- Object management: `src/World.ts`
- Hole Logic: `src/objects/Hole.ts`
- Object Factory: `src/objects/ObjectGenerator.ts`
