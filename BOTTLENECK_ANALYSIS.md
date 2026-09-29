# Performance Bottleneck Analysis - River Shrine Game

## Analysis Date: 2026-09-25

## Critical Issues Identified

### 1. EXCESSIVE DRAW CALLS - HIGHEST PRIORITY
**Location: Environment.ts (createTrees)**
- **Issue**: Each tree creates 1 trunk + 3 foliage meshes = 4 draw calls per tree
- **Count**: ~30 riverPoints / 2 = 15 points × 2-3 trees per side × 2 sides = ~90-135 trees
- **Total draw calls from trees alone**: 360-540 draw calls
- **Fix**: Use InstancedMesh for tree trunks and foliage

**Location: Lantern.ts**
- **Issue**: Each lantern creates 3 cylinder meshes + 1 point light = 3 draw calls per lantern
- **Count**: 20 lanterns × 3 meshes = 60 draw calls
- **Fix**: Use InstancedMesh for lantern geometry, share materials

**Location: Obstacle.ts**
- **Issue**: Each obstacle has unique geometry and material
- **Count**: 15 obstacles = 15 draw calls
- **Fix**: Share base geometry, use InstancedMesh or shared materials

**Location: Environment.ts (decorative rocks)**
- **Issue**: Each rock has unique geometry
- **Count**: ~10 rocks with unique geometries = 10 draw calls
- **Fix**: Share base geometry with random rotations

### 2. DUPLICATED GEOMETRIES - HIGH PRIORITY
**Location: Lantern.ts**
- Each lantern creates NEW geometries (CylinderGeometry × 2)
- 20 lanterns × 2 unique geometries = 40 duplicate geometries in memory
- **Fix**: Share geometries across all lanterns

**Location: Environment.ts**
- Each tree creates NEW geometries (CylinderGeometry + SphereGeometry)
- 90-135 trees × 2 geometries = 180-270 duplicate geometries
- **Fix**: Create once, reuse via InstancedMesh

**Location: Environment.ts (rocks)**
- Each decorative rock creates unique deformed DodecahedronGeometry
- ~10 unique geometries (acceptable for variety, but could be reduced)

**Location: Obstacle.ts**
- Each obstacle creates unique deformed DodecahedronGeometry
- 15 unique geometries (acceptable for variety)

### 3. DUPLICATED MATERIALS - HIGH PRIORITY
**Location: Lantern.ts**
- Each lantern creates NEW materials (MeshStandardMaterial × 2)
- 20 lanterns × 2 materials = 40 duplicate materials
- **Fix**: Create once, share across all lanterns

**Location: Environment.ts**
- Each tree creates NEW materials (trunk + foliage)
- 90-135 trees × 2+ materials = 180+ duplicate materials
- **Fix**: Create 2-3 shared materials (brown trunk, green foliage, pink foliage)

**Location: Obstacle.ts**
- Each obstacle creates NEW material
- 15 duplicate materials
- **Fix**: Create one shared rock material

**Location: Environment.ts (rocks)**
- Each decorative rock creates NEW material
- ~10 duplicate materials
- **Fix**: Share one rock material

### 4. UNNECESSARY PER-FRAME ALLOCATIONS - CRITICAL
**Location: WaterEffects.ts (update method, lines 24-48)**
- **Issue**: Updates EVERY vertex of water mesh every frame
- Calls `positions.needsUpdate = true` every frame
- Calls `geometry.computeVertexNormals()` every frame
- This is EXTREMELY expensive for CPU
- **Fix**: Reduce update frequency, use shader-based water animation, or throttle updates

**Location: LanternManager.ts (createCollectionEffect, line 65-92)**
- Creates new geometry + material every time lantern is collected
- Separate requestAnimationFrame loop outside main game loop
- **Fix**: Use object pooling for flash effects

**Location: WaterEffects.ts (createSplash, lines 50-78)**
- Creates 15 new geometries + 15 new materials per splash
- Each has separate requestAnimationFrame loop
- Never called in current code, but available
- **Fix**: Use object pooling or remove if unused

**Location: WaterEffects.ts (createWake, lines 112-151)**
- Creates new geometry + material per wake
- Separate requestAnimationFrame loop
- Never called in current code, but available
- **Fix**: Use object pooling or remove if unused

**Location: BoatController.ts (line 81)**
- `new THREE.Vector3(0, 1, 0)` allocated every frame
- **Fix**: Store as class member

**Location: Lantern.ts (line 70)**
- `.find()` called every frame for every active lantern to get light
- **Fix**: Store light reference in constructor

### 5. EXCESSIVE POINT LIGHTS - MODERATE
**Location: Lantern.ts**
- 20 point lights (one per lantern)
- Each point light has performance cost
- **Fix**: Limit to closest N lanterns to camera, or use emissive only

**Location: Environment.ts (shrine)**
- 1 point light at shrine (acceptable)

### 6. EXCESSIVE TRANSPARENCY - LOW
**Location: WaterEffects.ts**
- Water mesh uses transparency (opacity: 0.9)
- Transparent materials require sorting and are more expensive
- **Fix**: Remove transparency if not visually critical

### 7. WATER RENDERING - CRITICAL CPU BOTTLENECK
**Location: WaterEffects.ts (update method)**
- Modifies every vertex position every frame
- River has ~200 vertices (100 points × 2 sides)
- This is pure CPU work that blocks the main thread
- `computeVertexNormals()` is also expensive
- **Fix**: Use shader-based animation or update less frequently

### 8. UNNECESSARY ANIMATION UPDATES - MODERATE
**Location: ObstacleManager.ts (update)**
- Updates rotation for all 15 obstacles every frame
- Rotation is very subtle (0.1 rad/s)
- **Fix**: Update only nearby obstacles or skip entirely

**Location: Lantern.ts (update)**
- Updates position, rotation, and light intensity for all uncollected lanterns
- Light intensity update requires `.find()` every frame
- **Fix**: Store light reference, skip updates for distant lanterns

### 9. OBJECTS THAT SHOULD USE INSTANCEDMESH
1. **Tree trunks** (90-135 instances) - CRITICAL
2. **Tree foliage spheres** (270-405 instances) - CRITICAL
3. **Lantern bodies** (20 instances) - HIGH
4. **Lantern caps** (40 instances) - HIGH
5. **Decorative rocks** (~10 instances) - LOW
6. **Obstacles** (15 instances) - MODERATE

### 10. MEMORY LEAKS / INEFFICIENCIES
**Location: LanternManager.ts, WaterEffects.ts**
- Multiple separate requestAnimationFrame loops for effects
- These continue even if game is paused
- **Fix**: Integrate into main game loop or cancel properly

### 11. MISSING OPTIMIZATIONS
- No frustum culling for distant objects
- No distance-based LOD
- No object pooling for temporary effects
- No texture compression or atlasing (though no textures currently used)
- Shadow maps disabled (good!)

## Estimated Current Performance

**Draw Calls**: 450-600 (VERY HIGH - target <120)
**Geometries**: 250-350 unique geometries (HIGH)
**Materials**: 250-350 materials (VERY HIGH)
**Triangles**: ~30k-50k (acceptable)
**CPU Bottleneck**: Water vertex updates every frame
**GPU Bottleneck**: Excessive draw calls and materials

## Optimization Priority Queue

1. **CRITICAL**: Remove per-frame water vertex updates (shader or throttle)
2. **CRITICAL**: Convert trees to InstancedMesh (saves 360-540 draw calls)
3. **HIGH**: Share geometries and materials for lanterns (saves 80 draw calls + memory)
4. **HIGH**: Share materials for obstacles and rocks (saves memory)
5. **MODERATE**: Store references instead of searching every frame
6. **MODERATE**: Limit active point lights
7. **LOW**: Distance-based update throttling
8. **LOW**: Remove unused effects (splash, wake)

## Expected Gains

With optimizations:
- **Draw calls**: 450-600 → 50-80 (8-10× improvement)
- **Geometries**: 250-350 → 10-20 (20× improvement)
- **Materials**: 250-350 → 8-15 (30× improvement)
- **Frame time**: Should significantly decrease (water CPU usage eliminated)
