import * as THREE from 'three';

export class WaterEffects {
  private waterMesh: THREE.Mesh;
  private time: number = 0;
  private updateCounter: number = 0;
  private readonly UPDATE_FREQUENCY = 3; // Update every 3rd frame (~20fps for water animation)

  constructor(_scene: THREE.Scene, waterMesh: THREE.Mesh) {
    this.waterMesh = waterMesh;
    this.enhanceWaterMaterial();
  }

  private enhanceWaterMaterial(): void {
    // Enhanced water material with better color and reflectivity
    const material = this.waterMesh.material as THREE.MeshStandardMaterial;
    material.color = new THREE.Color(0x5BA3C5); // Teal-blue, more natural
    material.roughness = 0.15; // More reflective
    material.metalness = 0.5; // Shinier water
    material.emissive = new THREE.Color(0x1a4d5c); // Subtle depth coloring
    material.emissiveIntensity = 0.15;
    material.transparent = false;
    material.opacity = 1;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.updateCounter++;

    // Throttle water animation updates - only update every Nth frame
    if (this.updateCounter < this.UPDATE_FREQUENCY) {
      return;
    }
    this.updateCounter = 0;

    // Animate water vertices for ripple effect
    const geometry = this.waterMesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position;

    if (positions) {
      // Only update Y positions, cache X and Z
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // More varied wave pattern for visual interest
        const wave1 = Math.sin(x * 0.3 + this.time * 1.5) * 0.08;
        const wave2 = Math.sin(z * 0.25 + this.time * 1.2) * 0.06;
        const wave3 = Math.cos((x + z) * 0.2 + this.time) * 0.04;

        const newY = wave1 + wave2 + wave3;
        positions.setY(i, newY);
      }

      positions.needsUpdate = true;
      // Skip expensive normal recalculation - not critical for this effect
    }
  }
}
