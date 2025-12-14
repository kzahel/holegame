import * as THREE from 'three';
import { World } from './World';

export class Game {
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private world: World;
    private lastTime: number = 0;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        document.querySelector('#app')!.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#87CEEB'); // Sky blue

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        // Isometric-ish view
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // Pass camera to World for raycasting input later if needed
        this.world = new World(this.scene, this.camera);

        window.addEventListener('resize', this.onResize.bind(this));

        this.lastTime = performance.now();
        this.animate();
    }

    private onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));

        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap dt
        this.lastTime = currentTime;

        this.world.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}
