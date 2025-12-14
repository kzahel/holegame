# Hole Game Demo

A web-based clone of the "Donut County" hole mechanic, built with **Three.js** and **Cannon-es**.

**[Play the Live Demo](https://kyle.graehl.org/holegame/)**

![Demo](../docs/walkthrough.md) *(See docs for details)*

## Features

- **Hole Illusion**: Uses stencil buffers to create a "portable hole" effect on any surface.
- **Physics**: Objects interact with the hole using a custom 4-collider setup that moves with the visual hole.
- **Game Mechanics**:
    - Move with **WASD** or **Arrow Keys**.
    - Swallow objects to clear the level (demo).
    - Physics-based interaction (inertia, gravity).

## Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

## Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser to the URL shown (usually `http://localhost:5173`).

## Building for Production

To build the static site (output to `dist/`):

```bash
npm run build
```

## Documentation

Development documentation and agent artifacts are located in the [docs](./docs) folder:

- [Task List](./docs/task.md)
- [Implementation Plan](./docs/implementation_plan.md)
- [Walkthrough & Notes](./docs/walkthrough.md)
