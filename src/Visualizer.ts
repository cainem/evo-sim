import * as THREE from 'three';
import { Config } from './Config';

export class Visualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private planeMesh: THREE.Mesh;
  private config: Config;
  private animationFrameId: number | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.config = Config.getInstance();
    const worldSize = this.config.worldSize;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeeeeee);

    // 2. Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, worldSize * 2); // Adjust far plane based on world size
    // Position camera above the center of the world, looking down
    this.camera.position.set(worldSize / 2, worldSize / 1.5, worldSize / 2); // Adjust height (y) as needed
    this.camera.lookAt(worldSize / 2, 0, worldSize / 2); // Look at the center of the plane

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // 4. World Plane
    const planeGeometry = new THREE.PlaneGeometry(worldSize, worldSize);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide }); // Use MeshStandardMaterial for lighting
    this.planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.planeMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    this.planeMesh.position.set(worldSize / 2, 0, worldSize / 2); // Center the plane
    this.scene.add(this.planeMesh);

    // 5. Basic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(worldSize * 0.2, worldSize * 0.5, worldSize * 0.3); // Position light source
    this.scene.add(directionalLight);

    // Handle window resizing
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  private onWindowResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // 6. Render Loop
  private render(): void {
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.render.bind(this));
  }

  public startRenderLoop(): void {
    if (this.animationFrameId === null) {
        console.log("Starting render loop");
        this.render();
    }
  }

  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
        console.log("Stopping render loop");
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
  }

  // Cleanup function
  public dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    // Dispose geometries, materials, textures etc. if needed
    this.planeMesh.geometry.dispose();
    (this.planeMesh.material as THREE.Material).dispose();
    // Remove objects from scene if necessary
    this.scene.remove(this.planeMesh);
    // ... remove lights ...
    console.log("Visualizer disposed");
}

}
