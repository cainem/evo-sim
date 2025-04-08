import { Visualizer } from './Visualizer';

// Get the canvas element
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;

if (canvas) {
    // Create the visualizer instance
    const visualizer = new Visualizer(canvas);

    // Start the render loop
    visualizer.startRenderLoop();

    // Optional: Add cleanup logic if needed when the page unloads
    // window.addEventListener('beforeunload', () => {
    //     visualizer.dispose(); 
    // });

    console.log("Visualizer initialized and render loop started.");
} else {
    console.error('Canvas element #simulationCanvas not found!');
}
