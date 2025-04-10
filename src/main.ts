import { Visualizer } from './Visualizer';
import { WorldMap } from './WorldMap';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';

// Get the canvas element
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;

if (canvas) {
    // Get config instance
    const config = Config.getInstance();
    
    // Create a seeded random number generator
    const random = new SeededRandom(config.randomSeed);
    
    // Create the world map
    const worldMap = new WorldMap(config, random);
    
    try {
        // Create the visualizer instance
        const visualizer = new Visualizer(canvas);
        
        // Set the world map to visualize
        visualizer.setWorldMap(worldMap);
        
        // Start the render loop
        visualizer.startRenderLoop();

        // Add cleanup logic when the page unloads
        window.addEventListener('beforeunload', () => {
            visualizer.dispose(); 
        });

        console.log("Visualizer initialized with terrain visualization and render loop started.");

    } catch (error) {
        console.error("Error during Visualizer initialization or setup:", error);
    }
} else {
    console.error('Canvas element #simulationCanvas not found!');
}
