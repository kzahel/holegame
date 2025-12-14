import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export enum ObjectType {
    BOX,
    TREE,
    ROCK
}

export class ObjectGenerator {
    public static createTree(position: THREE.Vector3): { mesh: THREE.Mesh, shape: CANNON.Shape, offset?: CANNON.Vec3 } {
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.5;
        trunk.castShadow = true;

        // Leaves
        const leavesGeo = new THREE.ConeGeometry(1, 2, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 1.5;
        leaves.castShadow = true;

        // Merge for single mesh physics? 
        // For simplicity, we just return a representative mesh. 
        // THREE.Group is harder to manage with single mesh sync.
        // Let's merge geometries or just use the trunk as the "pivot".

        // Better: Helper to merge
        // Actually, for this demo, let's keep it simple.
        // We'll return a container Mesh (invisible) that holds the parts
        const container = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
        container.add(trunk);
        container.add(leaves);
        container.position.copy(position);

        // Let's stick to Box for stability for now, or Sphere.
        // A Capsule would be best but simple Box is fine.
        const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 1.5, 0.5));

        return { mesh: container, shape: boxShape, offset: new CANNON.Vec3(0, 1.5, 0) };
    }

    public static createRock(position: THREE.Vector3): { mesh: THREE.Mesh, shape: CANNON.Shape } {
        const radius = 0.4 + Math.random() * 0.4;
        const geo = new THREE.DodecahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.castShadow = true;

        const shape = new CANNON.Sphere(radius);

        return { mesh, shape };
    }

    public static createFlower(position: THREE.Vector3): { mesh: THREE.Mesh, shape: CANNON.Shape, offset?: CANNON.Vec3 } {
        const group = new THREE.Group();

        // Stem
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        stem.position.y = 0.25;
        group.add(stem);

        // Petals
        const petalColor = Math.random() > 0.5 ? 0xff69b4 : 0xffff00;
        const petals = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            new THREE.MeshStandardMaterial({ color: petalColor })
        );
        petals.position.y = 0.5;
        group.add(petals);

        // To create a single mesh for easier logic, we can stick to Group but we need to manage it.
        // But my World logic expects a Mesh. Group is an Object3D, Mesh is Object3D. 
        // I should update World type to THREE.Object3D or just wrap group in a dummy Mesh?
        // Actually Group casts to Mesh? No.
        // Let's just return a merged geometry or helper.
        // Or just return Group and cast it in World.

        group.position.copy(position);

        // Physics: small box/cylinder
        const shape = new CANNON.Cylinder(0.1, 0.1, 0.6, 8);

        // Cast to any to satisfy the return interface if strict? 
        // The return type is { mesh: THREE.Mesh ... }.
        // Group is not Mesh.
        // So I'll use a hack: return a container Mesh.
        const container = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false }));
        container.add(stem);
        container.add(petals);
        container.position.copy(position);

        return { mesh: container, shape, offset: new CANNON.Vec3(0, 0.3, 0) };
    }

    public static createGrass(position: THREE.Vector3): { mesh: THREE.Mesh, shape: CANNON.Shape, offset?: CANNON.Vec3 } {
        const geo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);

        const shape = new CANNON.Box(new CANNON.Vec3(0.1, 0.2, 0.1));

        return { mesh, shape, offset: new CANNON.Vec3(0, 0.2, 0) };
    }
}
