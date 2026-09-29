export class Loop {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private updateCallback: (deltaTime: number) => void;

  constructor(updateCallback: (deltaTime: number) => void) {
    this.updateCallback = updateCallback;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap deltaTime to prevent spiral of death
    const clampedDelta = Math.min(deltaTime, 0.1);

    this.updateCallback(clampedDelta);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}
