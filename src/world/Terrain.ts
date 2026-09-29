import * as THREE from 'three';
import { River } from './River';

export class Terrain {
  private mesh: THREE.Mesh | null = null;
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public createTerrain(scene: THREE.Scene, river: River): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const numSamples = 130;
    const startT = -0.05;
    const endT = 1.10;
    const bankWidth = 35;
    const bankHeight = 2.5;
    const halfRiverWidth = river.RIVER_WIDTH / 2;

    for (let i = 0; i <= numSamples; i++) {
      const t = startT + (i / numSamples) * (endT - startT);
      const pos = river.getExtrapolatedPosition(t);
      const tangent = river.getExtrapolatedTangent(t);
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const heightVariation = (Math.sin(i * 0.4) * 0.5 + this.seededRandom() * 0.5);

      // Left bank
      const leftInner = pos.clone().add(perpendicular.clone().multiplyScalar(halfRiverWidth));
      const leftOuter = pos.clone().add(perpendicular.clone().multiplyScalar(halfRiverWidth + bankWidth));
      leftInner.y = 0.2;
      leftOuter.y = bankHeight + heightVariation;

      // Right bank
      const rightInner = pos.clone().add(perpendicular.clone().multiplyScalar(-halfRiverWidth));
      const rightOuter = pos.clone().add(perpendicular.clone().multiplyScalar(-(halfRiverWidth + bankWidth)));
      rightInner.y = 0.2;
      rightOuter.y = bankHeight + heightVariation;

      const baseIndex = vertices.length / 3;

      vertices.push(leftInner.x, leftInner.y, leftInner.z);
      vertices.push(leftOuter.x, leftOuter.y, leftOuter.z);
      vertices.push(rightInner.x, rightInner.y, rightInner.z);
      vertices.push(rightOuter.x, rightOuter.y, rightOuter.z);

      // Colors
      const colorVar = this.seededRandom();
      let grassColor: THREE.Color;
      if (colorVar < 0.3) {
        grassColor = new THREE.Color(0x6B8E5F);
      } else if (colorVar < 0.6) {
        grassColor = new THREE.Color(0x7FA372);
      } else {
        grassColor = new THREE.Color(0x8BB87D);
      }
      const mudColor = new THREE.Color(0x9B8B6F);

      for (let j = 0; j < 4; j++) {
        if (j === 0 || j === 2) {
          // Inner (muddy bank near river)
          const mixed = grassColor.clone().lerp(mudColor, 0.45);
          colors.push(mixed.r, mixed.g, mixed.b);
        } else {
          // Outer (grass)
          colors.push(grassColor.r, grassColor.g, grassColor.b);
        }
      }

      if (i < numSamples) {
        const nextBase = baseIndex + 4;

        // Left bank triangles
        indices.push(baseIndex, nextBase, baseIndex + 1);
        indices.push(baseIndex + 1, nextBase, nextBase + 1);

        // Right bank triangles
        indices.push(baseIndex + 2, baseIndex + 3, nextBase + 2);
        indices.push(nextBase + 2, baseIndex + 3, nextBase + 3);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0
    });

    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);

    return this.mesh;
  }

  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }
}
