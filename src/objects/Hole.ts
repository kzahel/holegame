import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Hole {
    private scene: THREE.Scene;
    private physicsWorld: CANNON.World;

    public mesh: THREE.Group;
    private holeMask!: THREE.Mesh;
    private holeInterior!: THREE.Mesh;

    // The "ground" physics bodies (4 boxes)
    private groundBodies: CANNON.Body[] = [];

    private radius: number = 1.5;
    private currentSpeed: THREE.Vector2 = new THREE.Vector2();
    private maxSpeed = 8;
    private acceleration = 40;
    private friction = 20;

    // Input state
    private keys: { [key: string]: boolean } = {};

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, _camera: THREE.Camera) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;

        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        this.setupVisuals();
        this.setupPhysics();
        this.setupInput();
    }

    private setupVisuals() {
        const stencilRef = 1;

        // Ground Visual (Visual only, physics handled separately)
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x44aa44,
            stencilWrite: true,
            stencilRef: stencilRef,
            stencilFunc: THREE.NotEqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        });
        // Add grid helper texture for motion reference
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#339933';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 512; i += 64) {
            ctx.moveTo(i, 0); ctx.lineTo(i, 512);
            ctx.moveTo(0, i); ctx.lineTo(512, i);
        }
        ctx.stroke();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 20);
        groundMat.map = tex;

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        // Ground is static but we don't add it to this.mesh because it shouldn't move
        this.scene.add(ground);

        // Hole Mask - Use CIRCLE instead of Cylinder to avoid "X-Ray" effect on side walls
        const maskGeo = new THREE.CircleGeometry(this.radius, 32);
        const maskMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            colorWrite: false,
            depthWrite: false,
            stencilWrite: true,
            stencilRef: stencilRef,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilZPass: THREE.ReplaceStencilOp
        });
        this.holeMask = new THREE.Mesh(maskGeo, maskMat);
        this.holeMask.rotation.x = -Math.PI / 2; // Flat on ground
        this.holeMask.position.y = 0.05; // Slightly above ground to ensure it writes stencil before ground draws?
        // Actually if renderOrder is -1, it draws first.
        // If it is 'below' ground (0.0), it still writes stencil.
        // Let's put it slightly offset to be safe.
        this.holeMask.renderOrder = -1; // RENDER FIRST!!
        this.mesh.add(this.holeMask);

        // Hole Interior
        const interiorGeo = new THREE.CylinderGeometry(this.radius, this.radius, 5, 32, 1, true);
        interiorGeo.scale(-1, 1, 1);
        const interiorMat = new THREE.MeshStandardMaterial({
            color: 0x221100,
            stencilWrite: true,
            stencilRef: stencilRef,
            stencilFunc: THREE.EqualStencilFunc,
        });
        this.holeInterior = new THREE.Mesh(interiorGeo, interiorMat);
        this.holeInterior.position.y = -2.5;
        this.holeInterior.renderOrder = 1; // Render after ground (which is 0)
        this.mesh.add(this.holeInterior);
    }

    private setupPhysics() {
        // We create 4 boxes to act as the ground around the hole.
        // They need to be large enough to cover the play area.
        // Layout:
        //       [Top]
        // [Left] Hole [Right]
        //      [Bottom]

        const groundThickness = 1; // Arbitrary depth
        const groundSize = 100; // Big enough

        // Material
        const groundMat = new CANNON.Material();

        for (let i = 0; i < 4; i++) {
            const body = new CANNON.Body({
                type: CANNON.Body.KINEMATIC, // specific type for moving platforms
                material: groundMat
            });
            const shape = new CANNON.Box(new CANNON.Vec3(groundSize / 2, groundThickness / 2, groundSize / 2));
            body.addShape(shape);
            this.physicsWorld.addBody(body);
            this.groundBodies.push(body);
        }

        this.updatePhysicsHolePos();
    }

    private updatePhysicsHolePos() {
        // Re-position the 4 ground planes based on hole position (x, z)
        const x = this.mesh.position.x;
        const z = this.mesh.position.z;
        const r = this.radius;
        // The sizes assumed in setupPhysics:
        // full extent = 100 (half=50)
        // Wait, setupPhysics used size/2 = 50. So full width is 100.
        // If my huge constant here is 50, that matches.

        const huge = 50;
        const groundThickness = 1;
        const yStrata = -groundThickness / 2;

        // 1. Right box (Positive X)
        // Center needs to be at x + r + huge
        this.groundBodies[0].position.set(x + r + huge, yStrata, z);

        // 2. Left box (Negative X)
        // Center needs to be at x - r - huge
        this.groundBodies[1].position.set(x - r - huge, yStrata, z);

        // 3. Up box (Negative Z)
        // Center needs to be at z - r - huge
        this.groundBodies[2].position.set(x, yStrata, z - r - huge);

        // 4. Down box (Positive Z)
        // Center needs to be at z + r + huge
        this.groundBodies[3].position.set(x, yStrata, z + r + huge);
    }

    private setupInput() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    public update(dt: number) {
        this.handleInput(dt);
        this.updatePhysicsHolePos();
    }

    private handleInput(dt: number) {
        const input = new THREE.Vector2();
        if (this.keys['ArrowUp'] || this.keys['KeyW']) input.y -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) input.y += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) input.x -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) input.x += 1;

        if (input.length() > 0) input.normalize();

        // Acceleration
        if (input.length() > 0) {
            this.currentSpeed.x += input.x * this.acceleration * dt;
            this.currentSpeed.y += input.y * this.acceleration * dt;
        } else {
            // Friction
            const frictionStep = this.friction * dt;
            if (this.currentSpeed.length() < frictionStep) {
                this.currentSpeed.set(0, 0);
            } else {
                const dir = this.currentSpeed.clone().normalize().negate();
                this.currentSpeed.addScaledVector(dir, frictionStep);
            }
        }

        // Cap speed
        if (this.currentSpeed.length() > this.maxSpeed) {
            this.currentSpeed.setLength(this.maxSpeed);
        }

        // Apply
        this.mesh.position.x += this.currentSpeed.x * dt;
        this.mesh.position.z += this.currentSpeed.y * dt;
    }

    public checkSwallow(mesh: THREE.Mesh, body: CANNON.Body) {
        const dx = mesh.position.x - this.mesh.position.x;
        const dz = mesh.position.z - this.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const objRadius = 0.5;

        // If fully inside hole
        if (dist + objRadius < this.radius) {
            if (mesh.position.y < -5) {
                this.physicsWorld.removeBody(body);
                this.scene.remove(mesh);
            }
        }
    }
}
