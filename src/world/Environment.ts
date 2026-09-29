import * as THREE from 'three';
import { River } from './River';

export class Environment {
  private scene: THREE.Scene;
  private river: River;
  private seed: number;

  // Shared geometries and materials
  private static trunkGeometry: THREE.CylinderGeometry | null = null;
  private static foliageGeometry: THREE.SphereGeometry | null = null;
  private static rockGeometry: THREE.DodecahedronGeometry | null = null;

  private static trunkMaterial: THREE.MeshStandardMaterial | null = null;
  private static greenFoliageMaterial: THREE.MeshStandardMaterial | null = null;
  private static pinkFoliageMaterial: THREE.MeshStandardMaterial | null = null;
  private static rockMaterial: THREE.MeshStandardMaterial | null = null;

  // Instanced meshes
  private trunkInstances: THREE.InstancedMesh | null = null;
  private greenFoliageInstances: THREE.InstancedMesh | null = null;
  private pinkFoliageInstances: THREE.InstancedMesh | null = null;
  private rockInstances: THREE.InstancedMesh | null = null;

  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();

  constructor(scene: THREE.Scene, river: River, seed: number = 12345) {
    this.scene = scene;
    this.river = river;
    this.seed = seed;

    this.initializeSharedResources();
    this.createEnvironment();
  }

  private initializeSharedResources(): void {
    if (!Environment.trunkGeometry) {
      Environment.trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 5, 8);
      Environment.foliageGeometry = new THREE.SphereGeometry(2.2, 8, 8);
      Environment.rockGeometry = new THREE.DodecahedronGeometry(0.9, 0);

      Environment.trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x5D4E37,
        roughness: 0.95
      });
      Environment.greenFoliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A6B3A,
        roughness: 0.85
      });
      Environment.pinkFoliageMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFB7CE,
        roughness: 0.8,
        emissive: 0xFFB7CE,
        emissiveIntensity: 0.1
      });
      Environment.rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8A8A7A,
        roughness: 0.95,
        metalness: 0
      });
    }
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private createEnvironment(): void {
    this.createTreesOptimized();
    this.createRocksOptimized();
    this.createShrine();
  }

  private createTreesOptimized(): void {
    const treeData: Array<{ pos: THREE.Vector3; height: number; isPink: boolean }> = [];
    const numSteps = 40;
    const halfRiverWidth = this.river.RIVER_WIDTH / 2;

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const point = this.river.getPositionAt(t);
      const tangent = this.river.getTangentAt(t);
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Left side trees
      const leftCount = 2 + Math.floor(this.seededRandom() * 2);
      for (let j = 0; j < leftCount; j++) {
        const offset = halfRiverWidth + 6 + this.seededRandom() * 25;
        const pos = point.clone().add(perpendicular.clone().multiplyScalar(offset));
        pos.add(tangent.clone().multiplyScalar((this.seededRandom() - 0.5) * 10));
        pos.y = 2.5;
        const height = 4 + this.seededRandom() * 3;
        const isPink = this.seededRandom() < 0.25;
        treeData.push({ pos, height, isPink });
      }

      // Right side trees
      const rightCount = 2 + Math.floor(this.seededRandom() * 2);
      for (let j = 0; j < rightCount; j++) {
        const offset = -(halfRiverWidth + 6 + this.seededRandom() * 25);
        const pos = point.clone().add(perpendicular.clone().multiplyScalar(offset));
        pos.add(tangent.clone().multiplyScalar((this.seededRandom() - 0.5) * 10));
        pos.y = 2.5;
        const height = 4 + this.seededRandom() * 3;
        const isPink = this.seededRandom() < 0.25;
        treeData.push({ pos, height, isPink });
      }
    }

    const treeCount = treeData.length;
    const greenCount = treeData.filter(t => !t.isPink).length * 3;
    const pinkCount = treeData.filter(t => t.isPink).length * 3;

    this.trunkInstances = new THREE.InstancedMesh(
      Environment.trunkGeometry!,
      Environment.trunkMaterial!,
      treeCount
    );

    if (greenCount > 0) {
      this.greenFoliageInstances = new THREE.InstancedMesh(
        Environment.foliageGeometry!,
        Environment.greenFoliageMaterial!,
        greenCount
      );
    }

    if (pinkCount > 0) {
      this.pinkFoliageInstances = new THREE.InstancedMesh(
        Environment.foliageGeometry!,
        Environment.pinkFoliageMaterial!,
        pinkCount
      );
    }

    let greenIdx = 0;
    let pinkIdx = 0;

    for (let i = 0; i < treeCount; i++) {
      const tree = treeData[i];
      const trunkHeight = tree.height;

      this.tempPosition.copy(tree.pos);
      this.tempPosition.y += trunkHeight / 2;
      this.tempQuaternion.identity();
      this.tempScale.set(1, trunkHeight / 5, 1);
      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.trunkInstances.setMatrixAt(i, this.tempMatrix);

      const foliageInstances = tree.isPink ? this.pinkFoliageInstances : this.greenFoliageInstances;
      const foliageIdx = tree.isPink ? pinkIdx : greenIdx;

      if (foliageInstances) {
        for (let j = 0; j < 3; j++) {
          this.tempPosition.copy(tree.pos);
          this.tempPosition.x += (this.seededRandom() - 0.5) * 1.5;
          this.tempPosition.y += trunkHeight + 1.5 + (this.seededRandom() - 0.5) * 0.8;
          this.tempPosition.z += (this.seededRandom() - 0.5) * 1.5;

          this.tempQuaternion.identity();
          const foliageScale = 0.8 + this.seededRandom() * 0.4;
          this.tempScale.set(foliageScale, foliageScale, foliageScale);
          this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
          foliageInstances.setMatrixAt(foliageIdx + j, this.tempMatrix);
        }
      }

      if (tree.isPink) {
        pinkIdx += 3;
      } else {
        greenIdx += 3;
      }
    }

    this.scene.add(this.trunkInstances);
    if (this.greenFoliageInstances) this.scene.add(this.greenFoliageInstances);
    if (this.pinkFoliageInstances) this.scene.add(this.pinkFoliageInstances);
  }

  private createRocksOptimized(): void {
    const rockData: Array<{ pos: THREE.Vector3; size: number; rotation: THREE.Euler }> = [];
    const numSteps = 30;
    const halfRiverWidth = this.river.RIVER_WIDTH / 2;

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const point = this.river.getPositionAt(t);
      const tangent = this.river.getTangentAt(t);
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      if (this.seededRandom() > 0.4) {
        const side = this.seededRandom() < 0.5 ? 1 : -1;
        const offset = (halfRiverWidth + 5 + this.seededRandom() * 15) * side;
        const pos = point.clone().add(perpendicular.clone().multiplyScalar(offset));
        pos.y = 2.5;
        const size = 0.7 + this.seededRandom() * 1.2;
        const rotation = new THREE.Euler(
          this.seededRandom() * Math.PI,
          this.seededRandom() * Math.PI,
          this.seededRandom() * Math.PI
        );
        rockData.push({ pos, size, rotation });
      }
    }

    if (rockData.length > 0) {
      this.rockInstances = new THREE.InstancedMesh(
        Environment.rockGeometry!,
        Environment.rockMaterial!,
        rockData.length
      );

      for (let i = 0; i < rockData.length; i++) {
        const rock = rockData[i];
        this.tempPosition.copy(rock.pos);
        this.tempQuaternion.setFromEuler(rock.rotation);
        this.tempScale.set(rock.size / 0.7, rock.size / 0.7, rock.size / 0.7);
        this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
        this.rockInstances.setMatrixAt(i, this.tempMatrix);
      }

      this.scene.add(this.rockInstances);
    }
  }

  private createShrine(): void {
    const shrineT = 0.96;
    const shrinePos = this.river.getPositionAt(shrineT);
    const tangent = this.river.getTangentAt(shrineT);

    const group = new THREE.Group();

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2691e,
      roughness: 0.9
    });

    const platformGeometry = new THREE.CylinderGeometry(5, 5.5, 0.4, 8);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.2;
    group.add(platform);

    const shrineBodyGeometry = new THREE.BoxGeometry(3, 3.5, 3);
    const shrineBody = new THREE.Mesh(shrineBodyGeometry, woodMaterial);
    shrineBody.position.y = 2.15;
    group.add(shrineBody);

    const roofGeometry = new THREE.ConeGeometry(2.8, 1.8, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.7
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    const shrineLight = new THREE.PointLight(0xffd700, 4, 20);
    shrineLight.position.set(0, 3, 0);
    group.add(shrineLight);

    group.position.copy(shrinePos);
    group.position.y = 1.8;
    group.rotation.y = Math.atan2(tangent.x, tangent.z);

    this.scene.add(group);

    this.createToriiGate(0.88);
  }

  private createToriiGate(t: number): void {
    const gatePos = this.river.getPositionAt(t);
    const tangent = this.river.getTangentAt(t);

    const group = new THREE.Group();

    const gateMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.8
    });

    const postGeometry = new THREE.CylinderGeometry(0.3, 0.3, 5, 8);
    const leftPost = new THREE.Mesh(postGeometry, gateMaterial);
    leftPost.position.set(-6, 2.5, 0);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeometry, gateMaterial);
    rightPost.position.set(6, 2.5, 0);
    group.add(rightPost);

    const crossbarGeometry = new THREE.CylinderGeometry(0.25, 0.25, 13, 8);
    const topCrossbar = new THREE.Mesh(crossbarGeometry, gateMaterial);
    topCrossbar.rotation.z = Math.PI / 2;
    topCrossbar.position.y = 5;
    group.add(topCrossbar);

    const lowerCrossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 11, 8),
      gateMaterial
    );
    lowerCrossbar.rotation.z = Math.PI / 2;
    lowerCrossbar.position.y = 3.5;
    group.add(lowerCrossbar);

    group.position.copy(gatePos);
    group.position.y = 1.5;
    group.rotation.y = Math.atan2(tangent.x, tangent.z);

    this.scene.add(group);
  }

  public dispose(): void {
    if (this.trunkInstances) {
      this.scene.remove(this.trunkInstances);
      this.trunkInstances.dispose();
    }
    if (this.greenFoliageInstances) {
      this.scene.remove(this.greenFoliageInstances);
      this.greenFoliageInstances.dispose();
    }
    if (this.pinkFoliageInstances) {
      this.scene.remove(this.pinkFoliageInstances);
      this.pinkFoliageInstances.dispose();
    }
    if (this.rockInstances) {
      this.scene.remove(this.rockInstances);
      this.rockInstances.dispose();
    }
  }
}
