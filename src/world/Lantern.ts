import * as THREE from 'three';

export class Lantern {
  public position: THREE.Vector3;
  public collected: boolean = false;
  private floatTime: number = 0;
  private floatSpeed: number;
  private floatAmplitude: number = 0.3;
  private glowIntensity: number = 1;
  private light: THREE.PointLight | null = null;
  public instanceId: number = -1;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.floatSpeed = 1.5 + Math.random() * 0.5;
  }

  public setLight(light: THREE.PointLight): void {
    this.light = light;
  }

  public update(deltaTime: number): void {
    if (this.collected) return;

    this.floatTime += deltaTime * this.floatSpeed;

    // Pulsing glow
    if (this.light) {
      this.glowIntensity = 0.8 + Math.sin(this.floatTime * 2) * 0.2;
      this.light.intensity = this.glowIntensity * 2;
    }
  }

  public getFloatOffset(): number {
    return Math.sin(this.floatTime) * this.floatAmplitude;
  }

  public getRotation(): number {
    return this.floatTime * 0.5;
  }

  public collect(): void {
    this.collected = true;
    if (this.light) {
      this.light.intensity = 0;
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public isNear(position: THREE.Vector3, threshold: number = 2): boolean {
    return this.position.distanceTo(position) < threshold;
  }
}
