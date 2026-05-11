import * as THREE from "three";

export interface GuitarMaterialOptions {
  color: number;
  emissive: number;
  emissiveIntensity?: number;
}

/* ── Stratocaster ── */
export function createStratGroup(options: GuitarMaterialOptions): THREE.Group {
  const group = new THREE.Group();
  const { color, emissive, emissiveIntensity = 1.5 } = options;

  // Body — bright flat colour, ignores lighting
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshBasicMaterial({ color })
  );
  body.scale.set(1.3, 1.9, 0.35);
  body.position.y = 0.3;
  group.add(body);

  // Emissive glow shell (slightly larger, semi-transparent)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    })
  );
  glow.scale.set(1.6, 2.3, 0.6);
  glow.position.y = 0.3;
  group.add(glow);

  // Cutaways
  const cutGeo = new THREE.SphereGeometry(0.55, 16, 12);
  const cutMat = new THREE.MeshBasicMaterial({ color });
  const cut1 = new THREE.Mesh(cutGeo, cutMat);
  cut1.scale.set(1, 1.3, 0.5);
  cut1.position.set(0.85, 0.9, 0.1);
  group.add(cut1);

  const cut2 = cut1.clone();
  cut2.position.set(-0.85, 0.9, 0.1);
  group.add(cut2);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
  );
  neck.position.y = 2.6;
  group.add(neck);

  // Headstock
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 0.12),
    new THREE.MeshBasicMaterial({ color })
  );
  head.position.set(0.06, 3.75, 0);
  head.rotation.z = -0.1;
  group.add(head);

  // Bridge
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 })
  );
  bridge.position.set(0, -0.5, 0.18);
  group.add(bridge);

  // Pickups
  for (let i = 0; i < 3; i++) {
    const pup = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.5 })
    );
    pup.position.set(0, 0.3 + i * 0.35, 0.25);
    group.add(pup);
  }

  return group;
}

/* ── Jaguar ── */
export function createJaguarGroup(options: GuitarMaterialOptions): THREE.Group {
  const group = new THREE.Group();
  const { color, emissive, emissiveIntensity = 1.5 } = options;

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.6, 0.4),
    new THREE.MeshBasicMaterial({ color })
  );
  body.position.y = 0.2;
  group.add(body);

  // Glow shell
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.6, 0.4),
    new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    })
  );
  glow.scale.set(1.3, 1.3, 1.8);
  glow.position.y = 0.2;
  group.add(glow);

  // Rounded corners
  const cornerGeo = new THREE.SphereGeometry(0.5, 16, 12);
  const cornerMat = new THREE.MeshBasicMaterial({ color });
  [
    { x: 0.9, y: -0.9 },
    { x: -0.9, y: -0.9 },
    { x: 0.9, y: 1.1 },
    { x: -0.9, y: 1.1 },
  ].forEach((c) => {
    const corner = new THREE.Mesh(cornerGeo, cornerMat);
    corner.scale.set(1.2, 1, 0.5);
    corner.position.set(c.x, c.y, 0);
    group.add(corner);
  });

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 2.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
  );
  neck.position.y = 2.5;
  group.add(neck);

  // Headstock
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.12),
    new THREE.MeshBasicMaterial({ color })
  );
  head.position.set(0.04, 3.55, 0);
  head.rotation.z = -0.08;
  group.add(head);

  // Bridge
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.8 })
  );
  bridge.position.set(0, -0.6, 0.18);
  group.add(bridge);

  // Pickups
  for (let i = 0; i < 2; i++) {
    const pup = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.5 })
    );
    pup.position.set(0, 0.6 + i * 0.5, 0.25);
    group.add(pup);
  }

  return group;
}
