import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Hole } from './objects/Hole';
import { ObjectGenerator } from './objects/ObjectGenerator';

export class World {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private physicsWorld: CANNON.World;
    private hole: Hole;

    // Keep track of physics objects
    private objects: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;

        // init Physics
        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        });

        // Default material
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            { friction: 0.3, restitution: 0.3 }
        );
        this.physicsWorld.addContactMaterial(defaultContactMaterial);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Hole System
        this.hole = new Hole(this.scene, this.physicsWorld, this.camera);

        // Decor
        this.addDecorations();
    }

    private addDecorations() {

        // Trees
        for (let i = 0; i < 8; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                0, // Y is handled by physics spawn
                (Math.random() - 0.5) * 15
            );
            // Avoid center where hole starts
            if (pos.length() < 3) continue;

            const { mesh, shape, offset } = ObjectGenerator.createTree(pos);
            this.addPhysicsObject(mesh, shape, 5, offset);
        }

        // Rocks
        for (let i = 0; i < 15; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                0,
                (Math.random() - 0.5) * 15
            );
            if (pos.length() < 2) continue;

            const { mesh, shape } = ObjectGenerator.createRock(pos);
            this.addPhysicsObject(mesh, shape, 2);
        }

        // Flowers
        for (let i = 0; i < 20; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 18,
                0,
                (Math.random() - 0.5) * 18
            );
            if (pos.length() < 2) continue;
            const { mesh, shape, offset } = ObjectGenerator.createFlower(pos);
            this.addPhysicsObject(mesh, shape, 0.5, offset); // Light objects
        }

        // Grass
        for (let i = 0; i < 30; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 18,
                0,
                (Math.random() - 0.5) * 18
            );
            if (pos.length() < 2) continue;
            const { mesh, shape, offset } = ObjectGenerator.createGrass(pos);
            this.addPhysicsObject(mesh, shape, 0.2, offset); // Very light
        }
    }

    private addPhysicsObject(mesh: THREE.Mesh, shape: CANNON.Shape, mass: number, offset?: CANNON.Vec3) {
        // Determine spawn height based on shape size approx
        const spawnY = 5;

        this.scene.add(mesh);

        // Handle offset for center of mass
        // If we have an offset (like for tree), the body position is the pivot, but shape is offset?
        // Cannon shapes accept local offset.

        const body = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(mesh.position.x, spawnY, mesh.position.z),
        });

        if (offset) {
            body.addShape(shape, offset);
        } else {
            body.addShape(shape);
        }

        // Random rotation
        body.quaternion.setFromEuler(0, Math.random() * Math.PI * 2, 0);

        this.physicsWorld.addBody(body);
        this.objects.push({ mesh, body });
    }

    public update(dt: number) {
        // Step physics
        this.physicsWorld.step(1 / 60, dt, 3);

        // Sync mesh -> physics
        for (const obj of this.objects) {
            obj.mesh.position.copy(obj.body.position as unknown as THREE.Vector3);
            obj.mesh.quaternion.copy(obj.body.quaternion as unknown as THREE.Quaternion);

            // Check if swallowed
            this.hole.checkSwallow(obj.mesh, obj.body);
        }

        // Cleanup swallowed objects that are "done" (removed from scene)
        // For now simplistic check: if body has no world, remove from list
        this.objects = this.objects.filter(obj => {
            if (!obj.mesh.parent) return false;
            return true;
        });

        this.hole.update(dt);
    }
}
