import * as THREE from 'three';
import { River } from './River';

export class Landscape {
  private scene: THREE.Scene;
  private river: River;
  private seed: number;
  private groundMesh: THREE.Mesh | null = null;
  private mountainsMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, river: River, seed: number = 98765) {
    this.scene = scene;
    this.river = river;
    this.seed = seed;
    this.createLandscape();
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private createLandscape(): void {
    this.createGroundAlongRiver();
    this.createDistantMountains();
  }

  private createGroundAlongRiver(): void {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const numSamples = 130;
    const startT = -0.05;
    const endT = 1.15;

    const baseInnerDist = (this.river.RIVER_WIDTH / 2) + 35; // Start where terrain bank ends
    const maxTerrainWidth = 250;
    const numStrips = 12;
    const stripWidth = (maxTerrainWidth - baseInnerDist) / numStrips;

    // Collect positions and directions along river
    const sampleData: Array<{ pos: THREE.Vector3; perp: THREE.Vector3 }> = [];

    for (let i = 0; i <= numSamples; i++) {
      const t = startT + (i / numSamples) * (endT - startT);
      const pos = this.river.getExtrapolatedPosition(t);
      const tangent = this.river.getExtrapolatedTangent(t);
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      sampleData.push({ pos, perp });
    }

    for (let i = 0; i < numSamples; i++) {
      const curr = sampleData[i];
      const next = sampleData[i + 1];

      // Left side terrain strips
      for (let strip = 0; strip < numStrips; strip++) {
        const innerDist = baseInnerDist + strip * stripWidth;
        const outerDist = baseInnerDist + (strip + 1) * stripWidth;

        const innerLeft = curr.pos.clone().add(curr.perp.clone().multiplyScalar(innerDist));
        const outerLeft = curr.pos.clone().add(curr.perp.clone().multiplyScalar(outerDist));

        const innerLeftNext = next.pos.clone().add(next.perp.clone().multiplyScalar(innerDist));
        const outerLeftNext = next.pos.clone().add(next.perp.clone().multiplyScalar(outerDist));

        const distFactor = (strip + 1) / numStrips;
        const heightVariation = Math.sin(i * 0.3 + strip) * 2.5 * distFactor + this.seededRandom() * 1.2;

        innerLeft.y = 2.5 + heightVariation * 0.5;
        outerLeft.y = 3.5 + heightVariation * 1.5;
        innerLeftNext.y = 2.5 + heightVariation * 0.5;
        outerLeftNext.y = 3.5 + heightVariation * 1.5;

        const baseIndex = vertices.length / 3;

        vertices.push(innerLeft.x, innerLeft.y, innerLeft.z);
        vertices.push(outerLeft.x, outerLeft.y, outerLeft.z);
        vertices.push(innerLeftNext.x, innerLeftNext.y, innerLeftNext.z);
        vertices.push(outerLeftNext.x, outerLeftNext.y, outerLeftNext.z);

        for (let v = 0; v < 4; v++) {
          const colorVar = this.seededRandom();
          let color: THREE.Color;
          if (colorVar < 0.15) {
            color = new THREE.Color(0x9B8B6F); // Dirt
          } else if (colorVar < 0.4) {
            color = new THREE.Color(0x6B8E5F); // Dark green
          } else if (colorVar < 0.7) {
            color = new THREE.Color(0x7FA372); // Medium green
          } else {
            color = new THREE.Color(0x8BB87D); // Light green
          }
          colors.push(color.r, color.g, color.b);
        }

        indices.push(baseIndex, baseIndex + 2, baseIndex + 1);
        indices.push(baseIndex + 1, baseIndex + 2, baseIndex + 3);
      }

      // Right side terrain strips
      for (let strip = 0; strip < numStrips; strip++) {
        const innerDist = baseInnerDist + strip * stripWidth;
        const outerDist = baseInnerDist + (strip + 1) * stripWidth;

        const innerRight = curr.pos.clone().add(curr.perp.clone().multiplyScalar(-innerDist));
        const outerRight = curr.pos.clone().add(curr.perp.clone().multiplyScalar(-outerDist));

        const innerRightNext = next.pos.clone().add(next.perp.clone().multiplyScalar(-innerDist));
        const outerRightNext = next.pos.clone().add(next.perp.clone().multiplyScalar(-outerDist));

        const distFactor = (strip + 1) / numStrips;
        const heightVariation = Math.sin(i * 0.3 + strip) * 2.5 * distFactor + this.seededRandom() * 1.2;

        innerRight.y = 2.5 + heightVariation * 0.5;
        outerRight.y = 3.5 + heightVariation * 1.5;
        innerRightNext.y = 2.5 + heightVariation * 0.5;
        outerRightNext.y = 3.5 + heightVariation * 1.5;

        const baseIndex = vertices.length / 3;

        vertices.push(innerRight.x, innerRight.y, innerRight.z);
        vertices.push(outerRight.x, outerRight.y, outerRight.z);
        vertices.push(innerRightNext.x, innerRightNext.y, innerRightNext.z);
        vertices.push(outerRightNext.x, outerRightNext.y, outerRightNext.z);

        for (let v = 0; v < 4; v++) {
          const colorVar = this.seededRandom();
          let color: THREE.Color;
          if (colorVar < 0.15) {
            color = new THREE.Color(0x9B8B6F);
          } else if (colorVar < 0.4) {
            color = new THREE.Color(0x6B8E5F);
          } else if (colorVar < 0.7) {
            color = new THREE.Color(0x7FA372);
          } else {
            color = new THREE.Color(0x8BB87D);
          }
          colors.push(color.r, color.g, color.b);
        }

        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        indices.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0
    });

    this.groundMesh = new THREE.Mesh(geometry, groundMaterial);
    this.scene.add(this.groundMesh);
  }

  private createDistantMountains(): void {
    const mountainGeometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const numSamples = 60;
    const startT = -0.15;
    const endT = 1.25; // Cover well past the end of the river

    const distFromRiver = 230;

    // Mountain chains along left and right of the river path
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < numSamples; i++) {
        const t1 = startT + (i / numSamples) * (endT - startT);
        const t2 = startT + ((i + 1) / numSamples) * (endT - startT);

        const pos1 = this.river.getExtrapolatedPosition(t1);
        const pos2 = this.river.getExtrapolatedPosition(t2);

        const tan1 = this.river.getExtrapolatedTangent(t1);
        const tan2 = this.river.getExtrapolatedTangent(t2);

        const perp1 = new THREE.Vector3(-tan1.z, 0, tan1.x).normalize().multiplyScalar(side * distFromRiver);
        const perp2 = new THREE.Vector3(-tan2.z, 0, tan2.x).normalize().multiplyScalar(side * distFromRiver);

        const base1 = pos1.clone().add(perp1);
        const base2 = pos2.clone().add(perp2);

        const peakHeight = 25 + this.seededRandom() * 45 + Math.sin(i * 0.5) * 20;
        const peakPos = base1.clone().add(base2).multiplyScalar(0.5);
        peakPos.y = peakHeight;
        peakPos.x += (this.seededRandom() - 0.5) * 30;
        peakPos.z += (this.seededRandom() - 0.5) * 30;

        const baseIndex = vertices.length / 3;

        vertices.push(base1.x, 0, base1.z);
        vertices.push(base2.x, 0, base2.z);
        vertices.push(peakPos.x, peakPos.y, peakPos.z);

        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);

        const mountainColor = new THREE.Color(0x7A8B9D);
        const snowColor = new THREE.Color(0xEFF5FC);
        const snowFactor = Math.min(1, Math.max(0, (peakHeight - 25) / 40));
        const peakColor = mountainColor.clone().lerp(snowColor, snowFactor);

        colors.push(mountainColor.r, mountainColor.g, mountainColor.b);
        colors.push(mountainColor.r, mountainColor.g, mountainColor.b);
        colors.push(peakColor.r, peakColor.g, peakColor.b);
      }
    }

    // End cap mountains behind the shrine (wall of mountains across the valley at endT)
    const endPos = this.river.getExtrapolatedPosition(endT);
    const endTangent = this.river.getExtrapolatedTangent(endT);
    const endPerp = new THREE.Vector3(-endTangent.z, 0, endTangent.x).normalize();

    const endWidth = distFromRiver * 2;
    const numEndPeaks = 20;

    for (let i = 0; i < numEndPeaks; i++) {
      const offset1 = -distFromRiver + (i / numEndPeaks) * endWidth;
      const offset2 = -distFromRiver + ((i + 1) / numEndPeaks) * endWidth;

      const base1 = endPos.clone().add(endPerp.clone().multiplyScalar(offset1));
      const base2 = endPos.clone().add(endPerp.clone().multiplyScalar(offset2));

      const peakHeight = 35 + this.seededRandom() * 50;
      const peakPos = base1.clone().add(base2).multiplyScalar(0.5);
      peakPos.add(endTangent.clone().multiplyScalar(20 + this.seededRandom() * 40));
      peakPos.y = peakHeight;

      const baseIndex = vertices.length / 3;

      vertices.push(base1.x, 0, base1.z);
      vertices.push(base2.x, 0, base2.z);
      vertices.push(peakPos.x, peakPos.y, peakPos.z);

      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);

      const mountainColor = new THREE.Color(0x7A8B9D);
      const snowColor = new THREE.Color(0xEFF5FC);
      const snowFactor = Math.min(1, Math.max(0, (peakHeight - 25) / 40));
      const peakColor = mountainColor.clone().lerp(snowColor, snowFactor);

      colors.push(mountainColor.r, mountainColor.g, mountainColor.b);
      colors.push(mountainColor.r, mountainColor.g, mountainColor.b);
      colors.push(peakColor.r, peakColor.g, peakColor.b);
    }

    mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    mountainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mountainGeometry.setIndex(indices);
    mountainGeometry.computeVertexNormals();

    const mountainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0
    });

    this.mountainsMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
    this.scene.add(this.mountainsMesh);
  }

  public dispose(): void {
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
      (this.groundMesh.material as THREE.Material).dispose();
    }
    if (this.mountainsMesh) {
      this.scene.remove(this.mountainsMesh);
      this.mountainsMesh.geometry.dispose();
      (this.mountainsMesh.material as THREE.Material).dispose();
    }
  }
}
