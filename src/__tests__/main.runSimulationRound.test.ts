import { runSimulationRound } from '../runSimulationRound';
import { Region } from '../Region';

describe('runSimulationRound stop condition', () => {
  let dummySim: any;
  let dummyVis: any;
  let overlay: HTMLElement | null;

  beforeEach(() => {
    // Reset document and window flags
    document.body.innerHTML = '';
    (window as any).__roundStopped = false;
    delete (window as any).__highPointRegion;
    delete (window as any).__regions;
    delete (window as any).__stopSimulationInterval;

    // Create dummy simulation
    dummySim = {
      runRound: jest.fn().mockReturnValue({ deaths: 0, births: 0 }),
      getRoundNumber: jest.fn().mockReturnValue(5),
      getOrganisms: jest.fn().mockReturnValue([{ getPosition: () => ({ x: 1, y: 1 }) }]),
      getOrganismCount: jest.fn().mockReturnValue(1),
    };
    // Dummy visualizer (no-op)
    dummyVis = {
      drawOrganisms: jest.fn(),
      updateUIOverlay: jest.fn(),
    };

    // Setup region containing point (1,1)
    const region = new Region({ startX: 0, endX: 10, startY: 0, endY: 10 });
    (window as any).__highPointRegion = region;
    (window as any).__regions = [region];
  });

  it('stops simulation and creates overlay when organism enters high-point region', () => {
    runSimulationRound(dummySim, dummyVis);
    // Should mark stopped
    expect((window as any).__roundStopped).toBe(true);
    // Overlay should exist
    overlay = document.getElementById('simEndOverlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.innerHTML).toContain('Simulation Ended');
    expect(overlay!.innerHTML).toContain('Organism at (1, 1)');
    expect(overlay!.innerHTML).toContain('region #0');
    expect(overlay!.innerHTML).toContain('Round: 5');
  });

  it('does nothing if roundStopped is already true', () => {
    (window as any).__roundStopped = true;
    runSimulationRound(dummySim, dummyVis);
    expect(dummySim.runRound).not.toHaveBeenCalled();
    expect(document.getElementById('simEndOverlay')).toBeNull();
  });
});
