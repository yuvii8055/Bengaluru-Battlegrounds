import * as THREE from 'three';
import { BANGALORE_LANDMARKS } from '../utils/geoBangalore';

export interface UrbanObstacle {
  id: string;
  box: THREE.Box3;
  type: 'building' | 'pillar' | 'vehicle' | 'barrier' | 'tree';
  mesh: THREE.Object3D;
  center: THREE.Vector3;
}

export interface GroundLootEntity {
  id: string;
  itemId: string;
  name: string;
  category: 'weapon' | 'ammo' | 'armor' | 'med' | 'attachment';
  position: THREE.Vector3;
  mesh: THREE.Group;
  icon: string;
  count: number;
}

export class WorldBuilder {
  public scene: THREE.Scene;
  public obstacles: UrbanObstacle[] = [];
  public groundLoots: GroundLootEntity[] = [];
  public blueZoneMesh!: THREE.Mesh;
  public safeZoneMesh!: THREE.Line;
  public airdropMesh: THREE.Group | null = null;
  public airdropSmoke: THREE.Points | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildBengaluruEnvironment() {
    this.createSkyAndLighting();
    this.createGroundTerrain();
    this.createBanashankariBDAComplex();
    this.createNammaMetroElevatedCorridor();
    this.createKanakapuraRoadAndStreets();
    this.createVehiclesAndCoverProps();
    this.createCricketGrounds();
    this.createTreesAndFlora();
    this.createZoneVisualizers();
  }

  private createSkyAndLighting() {
    // Sky gradient & atmospheric fog
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0xb0d0e8, 0.0022);

    // Warm tropical Bengaluru sunlight
    const dirLight = new THREE.DirectionalLight(0xfff6e5, 1.3);
    dirLight.position.set(120, 220, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 600;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -250;
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x3f4d38, 0.6);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);
  }

  private createGroundTerrain() {
    // Large ground plane representing Banashankari 2nd Stage & Kanakapura Rd area
    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 64, 64);
    // Slight topological variation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      // Gentle slope towards Kanakapura valley
      const zOffset = Math.sin(vx * 0.01) * 0.8 + Math.cos(vy * 0.01) * 0.6;
      pos.setZ(i, zOffset);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a5d43, // Lush Bengaluru green turf
      roughness: 0.9,
      metalness: 0.1,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Paved concrete plaza around BDA Complex
    const plazaGeo = new THREE.PlaneGeometry(160, 160);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x7a7d80,
      roughness: 0.8,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.05, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);
  }

  /**
   * Banashankari BDA Shopping Complex
   * Multi-level brutalist concrete commercial hub with central courtyard,
   * rooftop parapets, shopfronts, and stair access.
   */
  private createBanashankariBDAComplex() {
    const complexGroup = new THREE.Group();

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x8c8f94,
      roughness: 0.85,
    });
    const brickMat = new THREE.MeshStandardMaterial({
      color: 0xa35e46,
      roughness: 0.9,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x243342,
      roughness: 0.2,
      metalness: 0.8,
    });
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xd9822b, // Bengaluru Kannada yellow/orange signboard
      roughness: 0.5,
    });

    // 1. Main North Wing
    const northWing = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 22), concreteMat);
    northWing.position.set(0, 7, -35);
    northWing.castShadow = true;
    northWing.receiveShadow = true;
    complexGroup.add(northWing);
    this.registerObstacle('bda_north_wing', northWing, 'building');

    // 2. West Wing
    const westWing = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 60), concreteMat);
    westWing.position.set(-35, 6, 0);
    westWing.castShadow = true;
    westWing.receiveShadow = true;
    complexGroup.add(westWing);
    this.registerObstacle('bda_west_wing', westWing, 'building');

    // 3. East Wing (2 Story Arcade)
    const eastWing = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 60), brickMat);
    eastWing.position.set(35, 5, 0);
    eastWing.castShadow = true;
    eastWing.receiveShadow = true;
    complexGroup.add(eastWing);
    this.registerObstacle('bda_east_wing', eastWing, 'building');

    // 4. Rooftop Pavilions / Snipers Nests
    const sniperTower = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 14), concreteMat);
    sniperTower.position.set(0, 16.5, -35);
    sniperTower.castShadow = true;
    complexGroup.add(sniperTower);
    this.registerObstacle('bda_tower', sniperTower, 'building');

    // 5. Central BDA Signboard banner
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(32, 2.5, 0.8), signMat);
    signMesh.position.set(0, 15, -23.5);
    complexGroup.add(signMesh);

    // 6. Courtyard Fountain / Concrete seating barrier in central plaza
    const fountainMesh = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 1.2, 16), concreteMat);
    fountainMesh.position.set(0, 0.6, 5);
    fountainMesh.castShadow = true;
    fountainMesh.receiveShadow = true;
    complexGroup.add(fountainMesh);
    this.registerObstacle('bda_fountain', fountainMesh, 'barrier');

    // 7. Commercial Annex Blocks (Nandini Milk Booth, Bangalore Cafe)
    const cafeMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 12), brickMat);
    cafeMesh.position.set(-25, 2.25, 32);
    cafeMesh.castShadow = true;
    complexGroup.add(cafeMesh);
    this.registerObstacle('bda_cafe', cafeMesh, 'building');

    const nandiniBooth = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x1976d2 }));
    nandiniBooth.position.set(22, 1.75, 30);
    nandiniBooth.castShadow = true;
    complexGroup.add(nandiniBooth);
    this.registerObstacle('bda_nandini', nandiniBooth, 'barrier');

    this.scene.add(complexGroup);
  }

  /**
   * Namma Metro Elevated Corridor (Green Line)
   * Elevated tracks running parallel along Kanakapura Road with numbered pillars (P-140..P-148)
   */
  private createNammaMetroElevatedCorridor() {
    const metroGroup = new THREE.Group();

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x9e9e9e,
      roughness: 0.8,
    });
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x5a5c60,
      roughness: 0.6,
      metalness: 0.3,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x33b864, // Namma Metro Green Line theme
      roughness: 0.4,
    });

    const pillarGeo = new THREE.CylinderGeometry(2.4, 2.8, 14, 16);
    const capGeo = new THREE.BoxGeometry(12, 1.8, 4.5);

    // Viaduct spanning over 600 meters along Kanakapura axis
    const startZ = -280;
    const endZ = 280;
    const spacing = 38;
    const roadX = -120; // Road offset

    for (let z = startZ; z <= endZ; z += spacing) {
      // Pillar cylinder
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(roadX, 7, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      metroGroup.add(pillar);
      this.registerObstacle(`metro_pillar_${z}`, pillar, 'pillar');

      // T-Cap support for double tracks
      const cap = new THREE.Mesh(capGeo, pillarMat);
      cap.position.set(roadX, 14.2, z);
      cap.castShadow = true;
      metroGroup.add(cap);
    }

    // Continuous elevated viaduct deck
    const viaductDeck = new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 580), trackMat);
    viaductDeck.position.set(roadX, 15.2, 0);
    viaductDeck.castShadow = true;
    viaductDeck.receiveShadow = true;
    metroGroup.add(viaductDeck);

    // Green line acoustic safety side barriers
    const leftBarrier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 580), railMat);
    leftBarrier.position.set(roadX - 5.2, 16.5, 0);
    metroGroup.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 580), railMat);
    rightBarrier.position.set(roadX + 5.2, 16.5, 0);
    metroGroup.add(rightBarrier);

    // Elevated Banashankari Metro Station Concourse
    const stationMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
    const stationMesh = new THREE.Mesh(new THREE.BoxGeometry(32, 12, 65), stationMat);
    stationMesh.position.set(roadX, 16, 68);
    stationMesh.castShadow = true;
    stationMesh.receiveShadow = true;
    metroGroup.add(stationMesh);
    this.registerObstacle('bsk_metro_station', stationMesh, 'building');

    this.scene.add(metroGroup);
  }

  /**
   * Kanakapura Road Dual Carriageway and arterial street grid
   */
  private createKanakapuraRoadAndStreets() {
    const roadGroup = new THREE.Group();
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x26292b, roughness: 0.9 });
    const markingsMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    // Kanakapura Road (running north-south)
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(32, 640), asphaltMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(-120, 0.08, 0);
    mainRoad.receiveShadow = true;
    roadGroup.add(mainRoad);

    // Median strip between lanes
    const median = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 640), new THREE.MeshStandardMaterial({ color: 0x757575 }));
    median.position.set(-120, 0.22, 0);
    median.castShadow = true;
    median.receiveShadow = true;
    roadGroup.add(median);
    this.registerObstacle('kanakapura_median', median, 'barrier');

    // Outer Ring Road connector avenue (East-West)
    const ringRoad = new THREE.Mesh(new THREE.PlaneGeometry(640, 24), asphaltMat);
    ringRoad.rotation.x = -Math.PI / 2;
    ringRoad.position.set(0, 0.07, 140);
    ringRoad.receiveShadow = true;
    roadGroup.add(ringRoad);

    // BDA Complex access roadway
    const complexRoad = new THREE.Mesh(new THREE.PlaneGeometry(140, 16), asphaltMat);
    complexRoad.rotation.x = -Math.PI / 2;
    complexRoad.position.set(-50, 0.075, 0);
    complexRoad.receiveShadow = true;
    roadGroup.add(complexRoad);

    this.scene.add(roadGroup);
  }

  /**
   * Bengaluru Urban Vehicles:
   * BMTC Green buses, Auto-rickshaws, Police barricades, creating tactical cover
   */
  private createVehiclesAndCoverProps() {
    const propsGroup = new THREE.Group();

    // 1. BMTC Suvarna Buses (Green / White)
    const bmtcBusMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.6 });
    const busRoofMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });
    const busWindowMat = new THREE.MeshStandardMaterial({ color: 0x111b24, roughness: 0.2 });

    const spawnBMTCBus = (x: number, z: number, rotY: number, id: string) => {
      const bus = new THREE.Group();
      // Main body
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 11), bmtcBusMat);
      body.position.y = 2.0;
      body.castShadow = true;
      bus.add(body);

      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 10.6), busRoofMat);
      roof.position.y = 3.8;
      bus.add(roof);

      // Windows
      const windows = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.1, 8.5), busWindowMat);
      windows.position.y = 2.5;
      bus.add(windows);

      bus.position.set(x, 0, z);
      bus.rotation.y = rotY;
      propsGroup.add(bus);
      this.registerObstacle(id, bus, 'vehicle');
    };

    spawnBMTCBus(-128, 45, 0.05, 'bmtc_bus_1');
    spawnBMTCBus(-112, -75, -0.1, 'bmtc_bus_2');
    spawnBMTCBus(-85, 140, Math.PI / 2 + 0.15, 'bmtc_bus_3');
    spawnBMTCBus(45, 140, Math.PI / 2, 'bmtc_bus_4');

    // 2. Bengaluru Auto-Rickshaws (Yellow roof, green body)
    const autoGreenMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });
    const autoYellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.4 });

    const spawnAuto = (x: number, z: number, rotY: number, id: string) => {
      const auto = new THREE.Group();
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.6), autoGreenMat);
      body.position.y = 0.9;
      body.castShadow = true;
      auto.add(body);

      // Yellow top hood
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2.3), autoYellowMat);
      hood.position.y = 1.7;
      hood.castShadow = true;
      auto.add(hood);

      auto.position.set(x, 0, z);
      auto.rotation.y = rotY;
      propsGroup.add(auto);
      this.registerObstacle(id, auto, 'vehicle');
    };

    spawnAuto(-15, 20, 0.4, 'auto_1');
    spawnAuto(20, -15, -0.8, 'auto_2');
    spawnAuto(-105, 12, 1.5, 'auto_3');
    spawnAuto(-135, -20, -1.2, 'auto_4');
    spawnAuto(65, 80, 0.2, 'auto_5');

    // 3. Bengaluru Police Concrete / Steel Barricades
    const barricadeMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.7 });
    const spawnBarricade = (x: number, z: number, rotY: number, id: string) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.5), barricadeMat);
      b.position.set(x, 0.6, z);
      b.rotation.y = rotY;
      b.castShadow = true;
      propsGroup.add(b);
      this.registerObstacle(id, b, 'barrier');
    };

    spawnBarricade(-10, 8, 0, 'barricade_1');
    spawnBarricade(10, 8, 0, 'barricade_2');
    spawnBarricade(-45, 12, 0.3, 'barricade_3');
    spawnBarricade(-120, 110, Math.PI / 2, 'barricade_4');
    spawnBarricade(0, -18, 0, 'barricade_5');

    this.scene.add(propsGroup);
  }

  /**
   * Banashankari 2nd Stage Cricket Ground
   * Pitch, boundary rope, nets, pavilion
   */
  private createCricketGrounds() {
    const cricketGroup = new THREE.Group();

    // Turf oval
    const ovalGeo = new THREE.CircleGeometry(75, 32);
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.9 });
    const oval = new THREE.Mesh(ovalGeo, turfMat);
    oval.rotation.x = -Math.PI / 2;
    oval.position.set(160, 0.08, -180);
    cricketGroup.add(oval);

    // 22-Yard Clay Pitch
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0xbcaaa4, roughness: 0.95 });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(160, 0.1, -180);
    cricketGroup.add(pitch);

    // Practice Nets (wireframe cover)
    const netFrameMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const net1 = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 18), netFrameMat);
    net1.position.set(215, 2, -180);
    net1.castShadow = true;
    cricketGroup.add(net1);
    this.registerObstacle('cricket_nets', net1, 'building');

    // Pavilion Grandstand
    const pavilionMat = new THREE.MeshStandardMaterial({ color: 0x78909c });
    const pavilion = new THREE.Mesh(new THREE.BoxGeometry(32, 6.5, 14), pavilionMat);
    pavilion.position.set(160, 3.25, -245);
    pavilion.castShadow = true;
    cricketGroup.add(pavilion);
    this.registerObstacle('cricket_pavilion', pavilion, 'building');

    this.scene.add(cricketGroup);
  }

  /**
   * Red Gulmohar & Rain Trees of Bengaluru (Garden City foliage)
   */
  private createTreesAndFlora() {
    const treeGroup = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
    const gulmoharMat = new THREE.MeshStandardMaterial({ color: 0xd84315, roughness: 0.8 }); // Red flowers

    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 6, 8);
    const foliageGeo = new THREE.DodecahedronGeometry(3.6, 1);

    const treePositions = [
      { x: -50, z: -25, red: false },
      { x: -70, z: 40, red: true },
      { x: -20, z: 65, red: false },
      { x: 30, z: 75, red: true },
      { x: 75, z: -40, red: false },
      { x: 90, z: 30, red: true },
      { x: -160, z: -110, red: false },
      { x: -160, z: 120, red: true },
      { x: 110, z: -140, red: false },
      { x: 190, z: -90, red: true },
      { x: 50, z: -90, red: false },
      { x: -30, z: -120, red: true },
    ];

    treePositions.forEach((pos, idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(foliageGeo, pos.red ? gulmoharMat : foliageMat);
      crown.position.y = 7.5;
      crown.castShadow = true;
      tree.add(crown);

      tree.position.set(pos.x, 0, pos.z);
      treeGroup.add(tree);
      this.registerObstacle(`tree_${idx}`, tree, 'tree');
    });

    this.scene.add(treeGroup);
  }

  /**
   * 3D Visualizer rings for Battle Royale Blue Zone (Electric dome)
   * and White Safe Zone perimeter ring
   */
  private createZoneVisualizers() {
    // 1. Blue Zone Electric Wall (Tall translucent cylinder)
    const blueGeo = new THREE.CylinderGeometry(420, 420, 160, 64, 1, true);
    const blueMat = new THREE.MeshBasicMaterial({
      color: 0x00b0ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    this.blueZoneMesh = new THREE.Mesh(blueGeo, blueMat);
    this.blueZoneMesh.position.set(0, 80, 0);
    this.scene.add(this.blueZoneMesh);

    // Blue Zone glowing ground contour ring
    const blueRingGeo = new THREE.RingGeometry(418, 422, 64);
    const blueRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const blueRing = new THREE.Mesh(blueRingGeo, blueRingMat);
    blueRing.rotation.x = -Math.PI / 2;
    blueRing.position.y = 0.2;
    this.blueZoneMesh.add(blueRing);

    // 2. White Safe Zone Perimeter Circle (Line loop)
    const safeRadius = 280;
    const safePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      safePoints.push(new THREE.Vector3(Math.cos(theta) * safeRadius, 0.3, Math.sin(theta) * safeRadius));
    }
    const safeLineGeo = new THREE.BufferGeometry().setFromPoints(safePoints);
    const safeLineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    this.safeZoneMesh = new THREE.Line(safeLineGeo, safeLineMat);
    this.scene.add(this.safeZoneMesh);
  }

  /**
   * Updates 3D visual positions and radii for Blue & Safe zones
   */
  public updateZoneVisuals(
    blueCenter: { x: number; z: number },
    blueRadius: number,
    safeCenter: { x: number; z: number },
    safeRadius: number
  ) {
    if (this.blueZoneMesh) {
      this.blueZoneMesh.position.x = blueCenter.x;
      this.blueZoneMesh.position.z = blueCenter.z;
      const scaleXZ = Math.max(0.01, blueRadius / 420);
      this.blueZoneMesh.scale.set(scaleXZ, 1, scaleXZ);
    }

    if (this.safeZoneMesh) {
      this.safeZoneMesh.position.x = safeCenter.x;
      this.safeZoneMesh.position.z = safeCenter.z;
      const safeScale = Math.max(0.01, safeRadius / 280);
      this.safeZoneMesh.scale.set(safeScale, 1, safeScale);
    }
  }

  /**
   * Spawns an airdrop care package with red smoke
   */
  public spawnAirdrop(x: number, z: number): THREE.Group {
    const airdrop = new THREE.Group();
    // Red & Blue military crate
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const tarpMat = new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.6 });

    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), crateMat);
    crate.position.y = 1.2;
    crate.castShadow = true;
    airdrop.add(crate);

    const blueTarp = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 2.5), tarpMat);
    blueTarp.position.y = 2.4;
    airdrop.add(blueTarp);

    airdrop.position.set(x, 0, z);
    this.scene.add(airdrop);
    this.registerObstacle('airdrop_crate', airdrop, 'vehicle');
    this.airdropMesh = airdrop;
    return airdrop;
  }

  /**
   * Spawns ground loot items around Banashankari BDA Complex
   */
  public spawnInitialGroundLoot() {
    const lootList = [
      { itemId: 'm416', name: 'M416 5.56 Assault Rifle', category: 'weapon', icon: '🔫', count: 1 },
      { itemId: 'akm', name: 'AKM 7.62 Assault Rifle', category: 'weapon', icon: '🔫', count: 1 },
      { itemId: 'awm', name: 'AWM .300 Magnum Sniper', category: 'weapon', icon: '🎯', count: 1 },
      { itemId: 'vector', name: 'Vector 9mm SMG', category: 'weapon', icon: '⚡', count: 1 },
      { itemId: 'ammo_556', name: '5.56mm Ammo (x60)', category: 'ammo', icon: '📦', count: 60 },
      { itemId: 'ammo_762', name: '7.62mm Ammo (x60)', category: 'ammo', icon: '📦', count: 60 },
      { itemId: 'ammo_300', name: '.300 Magnum Ammo (x20)', category: 'ammo', icon: '📦', count: 20 },
      { itemId: 'medkit', name: 'Medkit (Full HP)', category: 'med', icon: '🩹', count: 1 },
      { itemId: 'energy_drink', name: 'Energy Drink (+Boost)', category: 'med', icon: '⚡', count: 2 },
      { itemId: 'helmet_lvl3', name: 'Spetsnaz Helmet (Tier 3)', category: 'armor', icon: '🪖', count: 1 },
      { itemId: 'vest_lvl3', name: 'Military Vest (Tier 3)', category: 'armor', icon: '🛡️', count: 1 },
      { itemId: 'scope_4x', name: '4x ACOG Optical Scope', category: 'attachment', icon: '🔭', count: 1 },
      { itemId: 'scope_8x', name: '8x CQB Sniper Scope', category: 'attachment', icon: '🔭', count: 1 },
      { itemId: 'frag_grenade', name: 'Frag Grenade', category: 'weapon', icon: '💣', count: 2 },
    ];

    const spawnPoints = [
      { x: -5, z: -8 },
      { x: 8, z: -15 },
      { x: 15, z: 12 },
      { x: -18, z: 25 },
      { x: -28, z: -10 },
      { x: 28, z: -5 },
      { x: -60, z: 15 },
      { x: -100, z: 40 },
      { x: 120, z: -150 },
      { x: 170, z: -200 },
      { x: -125, z: -60 },
      { x: 5, z: 45 },
      { x: -40, z: 80 },
      { x: 60, z: -60 },
    ];

    spawnPoints.forEach((pt, i) => {
      const lootDef = lootList[i % lootList.length];
      this.createGroundLootItem(`loot_${i}`, lootDef, pt.x, pt.z);
    });
  }

  public createGroundLootItem(id: string, lootDef: any, x: number, z: number) {
    const group = new THREE.Group();

    // Glowing loot marker base cylinder
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16);
    const baseMat = new THREE.MeshBasicMaterial({
      color: lootDef.category === 'weapon' ? 0xffb300 : lootDef.category === 'armor' ? 0x00e5ff : 0x76ff03,
      transparent: true,
      opacity: 0.8,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.08;
    group.add(baseMesh);

    // Glowing beacon vertical beam
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: baseMat.color,
      transparent: true,
      opacity: 0.45,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.3;
    group.add(beam);

    // Floating item box
    const boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.4,
      roughness: 0.3,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.8;
    group.add(box);

    group.position.set(x, 0, z);
    this.scene.add(group);

    const entity: GroundLootEntity = {
      id,
      itemId: lootDef.itemId,
      name: lootDef.name,
      category: lootDef.category,
      position: new THREE.Vector3(x, 0, z),
      mesh: group,
      icon: lootDef.icon,
      count: lootDef.count || 1,
    };
    this.groundLoots.push(entity);
  }

  public removeGroundLoot(id: string) {
    const index = this.groundLoots.findIndex((l) => l.id === id);
    if (index !== -1) {
      const entity = this.groundLoots[index];
      this.scene.remove(entity.mesh);
      this.groundLoots.splice(index, 1);
    }
  }

  private registerObstacle(id: string, mesh: THREE.Object3D, type: 'building' | 'pillar' | 'vehicle' | 'barrier' | 'tree') {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.obstacles.push({
      id,
      box,
      type,
      mesh,
      center,
    });
  }

  /**
   * Raycast line of sight check between two points.
   * Returns true if there is an unobstructed line of sight.
   */
  public hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    dir.normalize();

    const ray = new THREE.Ray(from, dir);
    for (const obs of this.obstacles) {
      // Don't test against small low trees or markers
      if (obs.type === 'tree') continue;
      const intersection = ray.intersectBox(obs.box, new THREE.Vector3());
      if (intersection && intersection.distanceTo(from) < dist - 0.5) {
        return false; // Obstructed by urban building or Metro pillar!
      }
    }
    return true;
  }
}
