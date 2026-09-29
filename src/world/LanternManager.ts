import * as THREE from 'three';
import { Lantern } from './Lantern';
import { River } from './River';

export class LanternManager {
  private lanterns: Lantern[] = [];
  private scene: THREE.Scene;
  private river: River;
  private seed: number;

  // Shared geometry and materials
  private static bodyGeometry: THREE.CylinderGeometry | null = null;
  private static capGeometry: THREE.CylinderGeometry | null = null;
  private static bodyMaterial: THREE.MeshStandardMaterial | null = null;
  private static capMaterial: THREE.MeshStandardMaterial | null = null;

  // Instanced meshes
  private bodyInstances: THREE.InstancedMesh;
  private topCapInstances: THREE.InstancedMesh;
  private bottomCapInstances: THREE.InstancedMesh;
  private lights: THREE.PointLight[] = [];

  // Temp objects to avoid per-frame allocation
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3(1, 1, 1);

  // Object pool for flash effects
  private flashPool: Array<{ mesh: THREE.Mesh; active: boolean; scale: number; material: THREE.MeshBasicMaterial }> = [];
  private readonly FLASH_POOL_SIZE = 5;

  constructor(scene: THREE.Scene, river: River, seed: number = 12345) {
    this.scene = scene;
    this.river = river;
    this.seed = seed;

    // Create shared resources once
    this.initializeSharedResources();

    const numLanterns = 20;

    // Create instanced meshes
    this.bodyInstances = new THREE.InstancedMesh(
      LanternManager.bodyGeometry!,
      LanternManager.bodyMaterial!,
      numLanterns
    );
    this.topCapInstances = new THREE.InstancedMesh(
      LanternManager.capGeometry!,
      LanternManager.capMaterial!,
      numLanterns
    );
    this.bottomCapInstances = new THREE.InstancedMesh(
      LanternManager.capGeometry!,
      LanternManager.capMaterial!,
      numLanterns
    );

    this.scene.add(this.bodyInstances);
    this.scene.add(this.topCapInstances);
    this.scene.add(this.bottomCapInstances);

    // Initialize flash pool
    for (let i = 0; i < this.FLASH_POOL_SIZE; i++) {
      const geometry = new THREE.SphereGeometry(0.5, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      mesh.visible = false;
      this.flashPool.push({ mesh, active: false, scale: 1, material });
    }

    this.spawnInitialLanterns();
  }

  private initializeSharedResources(): void {
    if (!LanternManager.bodyGeometry) {
      LanternManager.bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
      LanternManager.capGeometry = new THREE.CylinderGeometry(0.45, 0.4, 0.1, 8);
      LanternManager.bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        emissive: 0xff6644,
        emissiveIntensity: 0.5,
        roughness: 0.8,
        metalness: 0
      });
      LanternManager.capMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9
      });
    }
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private spawnInitialLanterns(): void {
    const numLanterns = 20;

    for (let i = 0; i < numLanterns; i++) {
      const t = (i + 1) / (numLanterns + 1);
      const position = this.river.getPositionAt(t);

      const offset = (this.seededRandom() - 0.5) * 4;
      const tangent = this.river.getTangentAt(t);
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      position.add(perpendicular.multiplyScalar(offset));
      position.y = 1.5 + this.seededRandom() * 0.5;

      const lantern = new Lantern(position);
      lantern.instanceId = i;

      // Create point light for this lantern
      const light = new THREE.PointLight(0xffaa44, 2, 8);
      light.position.copy(position);
      this.scene.add(light);
      this.lights.push(light);
      lantern.setLight(light);

      this.lanterns.push(lantern);

      // Set initial transforms
      this.updateLanternTransform(lantern, 0);
    }
  }

  private updateLanternTransform(lantern: Lantern, rotation: number): void {
    if (lantern.instanceId < 0) return;

    const floatOffset = lantern.getFloatOffset();
    this.tempPosition.copy(lantern.position);
    this.tempPosition.y += floatOffset;

    this.tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

    // Body
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    this.bodyInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);

    // Top cap
    this.tempPosition.y += 0.35;
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    this.topCapInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);

    // Bottom cap
    this.tempPosition.y -= 0.7;
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    this.bottomCapInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);

    // Update light position
    if (lantern.instanceId < this.lights.length) {
      const light = this.lights[lantern.instanceId];
      light.position.copy(lantern.position);
      light.position.y += floatOffset;
    }
  }

  public update(deltaTime: number, boatPosition: THREE.Vector3): number {
    let collected = 0;
    let needsUpdate = false;

    for (const lantern of this.lanterns) {
      if (!lantern.collected) {
        lantern.update(deltaTime);
        this.updateLanternTransform(lantern, lantern.getRotation());
        needsUpdate = true;

        if (lantern.isNear(boatPosition, 2.5)) {
          lantern.collect();
          collected++;
          this.createCollectionEffect(lantern.getPosition());
          this.hideLantern(lantern);
        }
      }
    }

    if (needsUpdate) {
      this.bodyInstances.instanceMatrix.needsUpdate = true;
      this.topCapInstances.instanceMatrix.needsUpdate = true;
      this.bottomCapInstances.instanceMatrix.needsUpdate = true;
    }

    // Update active flash effects
    this.updateFlashEffects(deltaTime);

    return collected;
  }

  private hideLantern(lantern: Lantern): void {
    if (lantern.instanceId < 0) return;

    // Scale to zero to hide
    this.tempScale.set(0, 0, 0);
    this.tempMatrix.compose(lantern.position, this.tempQuaternion, this.tempScale);
    this.bodyInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);
    this.topCapInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);
    this.bottomCapInstances.setMatrixAt(lantern.instanceId, this.tempMatrix);

    this.tempScale.set(1, 1, 1); // Reset for next use
  }

  private createCollectionEffect(position: THREE.Vector3): void {
    // Find inactive flash from pool
    let flash = this.flashPool.find(f => !f.active);
    if (!flash) return; // Pool exhausted, skip effect

    flash.active = true;
    flash.scale = 1;
    flash.material.opacity = 0.8;
    flash.mesh.position.copy(position);
    flash.mesh.visible = true;
    flash.mesh.scale.setScalar(1);
  }

  private updateFlashEffects(deltaTime: number): void {
    for (const flash of this.flashPool) {
      if (flash.active) {
        flash.scale += deltaTime * 6; // scale += 0.1 at 60fps
        flash.material.opacity -= deltaTime * 3; // opacity -= 0.05 at 60fps
        flash.mesh.scale.setScalar(flash.scale);

        if (flash.material.opacity <= 0) {
          flash.active = false;
          flash.mesh.visible = false;
          flash.material.opacity = 0;
        }
      }
    }
  }

  public getTotalLanterns(): number {
    return this.lanterns.length;
  }

  public getCollectedCount(): number {
    return this.lanterns.filter(l => l.collected).length;
  }

  public dispose(): void {
    this.scene.remove(this.bodyInstances);
    this.scene.remove(this.topCapInstances);
    this.scene.remove(this.bottomCapInstances);

    this.bodyInstances.dispose();
    this.topCapInstances.dispose();
    this.bottomCapInstances.dispose();

    for (const light of this.lights) {
      this.scene.remove(light);
      light.dispose();
    }

    for (const flash of this.flashPool) {
      this.scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      flash.material.dispose();
    }

    this.lanterns = [];
    this.lights = [];
    this.flashPool = [];
  }
}
