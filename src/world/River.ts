import * as THREE from 'three';

export interface RiverPoint {
  position: THREE.Vector3;
  width: number;
  direction: THREE.Vector3;
}

export class River {
  private spline: THREE.CatmullRomCurve3;
  private riverPoints: RiverPoint[] = [];
  private riverMesh: THREE.Mesh | null = null;
  private seed: number;
  public readonly RIVER_WIDTH: number = 16;

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.generateRiverPath();
    this.spline = new THREE.CatmullRomCurve3(
      this.riverPoints.map(p => p.position)
    );
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private generateRiverPath(): void {
    const numPoints = 30;
    let x = 0;
    let z = 0;
    let angle = 0;

    for (let i = 0; i < numPoints; i++) {
      // Create natural curves
      const angleChange = (this.seededRandom() - 0.5) * 0.35;
      angle += angleChange;

      const segmentLength = 20 + this.seededRandom() * 15; // Longer segments for grander scale
      x += Math.sin(angle) * segmentLength;
      z += Math.cos(angle) * segmentLength;

      const y = 0; // Keep river at water level

      this.riverPoints.push({
        position: new THREE.Vector3(x, y, z),
        width: this.RIVER_WIDTH,
        direction: new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle))
      });
    }
  }

  public createRiverMesh(scene: THREE.Scene): THREE.Mesh {
    const numSamples = 120;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      points.push(this.spline.getPointAt(i / numSamples));
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const halfWidth = this.RIVER_WIDTH / 2;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = points[i];

      let tangent: THREE.Vector3;
      if (i < numSamples) {
        tangent = new THREE.Vector3().subVectors(points[i + 1], point).normalize();
      } else {
        tangent = new THREE.Vector3().subVectors(point, points[i - 1]).normalize();
      }

      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Add left and right vertices
      const left = point.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
      const right = point.clone().add(perpendicular.clone().multiplyScalar(-halfWidth));

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      uvs.push(0, t * 10);
      uvs.push(1, t * 10);

      if (i < numSamples) {
        const current = i * 2;
        const next = (i + 1) * 2;

        indices.push(current, next, current + 1);
        indices.push(current + 1, next, next + 1);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x5BA3C5,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x1a4d5c,
      emissiveIntensity: 0.1
    });

    this.riverMesh = new THREE.Mesh(geometry, material);
    scene.add(this.riverMesh);

    return this.riverMesh;
  }

  public getSpline(): THREE.CatmullRomCurve3 {
    return this.spline;
  }

  public getPoints(): RiverPoint[] {
    return this.riverPoints;
  }

  public getPositionAt(t: number): THREE.Vector3 {
    return this.spline.getPointAt(Math.max(0, Math.min(1, t)));
  }

  public getTangentAt(t: number): THREE.Vector3 {
    return this.spline.getTangentAt(Math.max(0, Math.min(1, t)));
  }

  public getExtrapolatedPosition(t: number): THREE.Vector3 {
    if (t < 0) {
      const startPos = this.spline.getPointAt(0);
      const startTangent = this.spline.getTangentAt(0);
      const extraDist = t * this.getLength();
      return startPos.clone().add(startTangent.clone().multiplyScalar(extraDist));
    } else if (t > 1) {
      const endPos = this.spline.getPointAt(1);
      const endTangent = this.spline.getTangentAt(1);
      const extraDist = (t - 1) * this.getLength();
      return endPos.clone().add(endTangent.clone().multiplyScalar(extraDist));
    } else {
      return this.spline.getPointAt(t);
    }
  }

  public getExtrapolatedTangent(t: number): THREE.Vector3 {
    const clampedT = Math.max(0, Math.min(1, t));
    return this.spline.getTangentAt(clampedT);
  }

  public getLength(): number {
    return this.spline.getLength();
  }

  public getClosestPointOnRiver(position: THREE.Vector3): {
    point: THREE.Vector3;
    t: number;
    distance: number;
    perpendicular: THREE.Vector3;
  } {
    let closestT = 0;
    let minDistance = Infinity;
    const samples = 120;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = this.spline.getPointAt(t);
      const distance = position.distanceTo(point);

      if (distance < minDistance) {
        minDistance = distance;
        closestT = t;
      }
    }

    const point = this.spline.getPointAt(closestT);
    const tangent = this.spline.getTangentAt(closestT);
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    return { point, t: closestT, distance: minDistance, perpendicular };
  }

  public isWithinRiver(position: THREE.Vector3, margin: number = 0): boolean {
    const closest = this.getClosestPointOnRiver(position);
    const maxDistance = (this.RIVER_WIDTH / 2) - margin;
    return closest.distance <= maxDistance;
  }

  public getRiverWidthAt(_t: number): number {
    return this.RIVER_WIDTH;
  }
}
