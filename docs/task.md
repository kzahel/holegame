# Tasks
> Created by Antigravity Gemini 3 Pro High

- [x] Project Setup <!-- id: 0 -->
    - [x] Initialize Vite project (Vanilla TS) <!-- id: 1 -->
    - [x] Install dependencies (three, cannon-es, types) <!-- id: 2 -->
    - [x] clean up default boilerplate <!-- id: 3 -->
- [x] Rendering System (The Illusion) <!-- id: 4 -->
    - [x] Set up basic Three.js scene (Camera, Renderer with Stencil enabled) <!-- id: 5 -->
    - [x] Create Hole Mask (Invisible cylinder writing to stencil) <!-- id: 6 -->
    - [x] Create Ground (Plane masking against stencil) <!-- id: 7 -->
    - [x] Create Hole Interior (Visible only through stencil) <!-- id: 8 -->
- [x] Physics System (cannon-es) <!-- id: 9 -->
    - [x] Set up Physics World <!-- id: 10 -->
    - [x] Create Ground Colliders (4 boxes forming a hole) <!-- id: 11 -->
    - [x] Add Physics to Scene Objects (Trees, Rocks, etc.) <!-- id: 12 -->
    - [x] Sync Physics bodies with Three.js meshes <!-- id: 13 -->
- [x] Hole Mechanics <!-- id: 14 -->
    - [x] Implement Hole Movement (Mouse/Arrow keys) <!-- id: 15 -->
    - [x] Implement Ground Collider updates (moving the "hole" in physics) <!-- id: 16 -->
    - [x] Implement "Swallow" Logic (Check bounds, disable physics, animate drop) <!-- id: 17 -->
- [x] Polish <!-- id: 18 -->
    - [x] Add visuals (simple colored geometries for trees/rocks) <!-- id: 19 -->
    - [x] Hole growth mechanic (optional but requested) <!-- id: 20 -->
    - [x] Refine visuals (fix glitchy cylinder walls) <!-- id: 21 -->
    - [x] Tune controls (tighter movement) <!-- id: 22 -->
- [x] Deployment <!-- id: 23 -->
    - [x] Create vite.config.ts with relative base <!-- id: 24 -->
    - [x] Create .github/workflows/deploy.yml <!-- id: 25 -->
