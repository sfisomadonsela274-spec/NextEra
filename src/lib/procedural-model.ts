import * as THREE from 'three';

// ============================================
// NexEra — Procedural 3D Model Generation
// ============================================
// Uses AI classification to generate procedural 3D models
// from geometric primitives, with proper materials and scaling

export interface GeneratedModelData {
  geometry: THREE.Group;
  classification: {
    category: string;
    description: string;
    material: { color: string; metalness: number; roughness: number };
  };
}

// Material factory
export function createTrainingMaterial(color: string, metalness: number, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness,
    roughness,
    envMapIntensity: 0.5,
  });
}

// Build a hard hat (safety equipment)
function buildHardHat(): THREE.Group {
  const group = new THREE.Group();

  // Dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    createTrainingMaterial('#FFB300', 0.1, 0.7)
  );
  dome.position.y = 0.15;
  dome.castShadow = true;
  group.add(dome);

  // Brim
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32),
    createTrainingMaterial('#E6A200', 0.1, 0.7)
  );
  brim.position.y = 0.1;
  brim.castShadow = true;
  group.add(brim);

  // Ridge on top
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.3),
    createTrainingMaterial('#CC8800', 0.2, 0.6)
  );
  ridge.position.set(0, 0.35, 0);
  ridge.castShadow = true;
  group.add(ridge);

  return group;
}

// Build a fire extinguisher
function buildFireExtinguisher(): THREE.Group {
  const group = new THREE.Group();

  // Body (cylinder)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.6, 32),
    createTrainingMaterial('#DC2626', 0.3, 0.5)
  );
  body.position.y = 0.3;
  body.castShadow = true;
  group.add(body);

  // Top cap
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.1, 32),
    createTrainingMaterial('#991B1B', 0.4, 0.4)
  );
  cap.position.y = 0.65;
  cap.castShadow = true;
  group.add(cap);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI),
    createTrainingMaterial('#374151', 0.8, 0.3)
  );
  handle.position.set(0.08, 0.7, 0);
  handle.rotation.x = Math.PI / 2;
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  group.add(handle);

  // Nozzle
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.15, 16),
    createTrainingMaterial('#374151', 0.8, 0.3)
  );
  nozzle.position.set(-0.12, 0.6, 0);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.castShadow = true;
  group.add(nozzle);

  // Hose
  const hose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
    createTrainingMaterial('#1F2937', 0.3, 0.7)
  );
  hose.position.set(-0.2, 0.55, 0);
  hose.rotation.z = Math.PI / 3;
  hose.castShadow = true;
  group.add(hose);

  return group;
}

// Build a wrench tool
function buildWrench(): THREE.Group {
  const group = new THREE.Group();

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.4, 0.02),
    createTrainingMaterial('#6B7280', 0.8, 0.3)
  );
  shaft.position.y = 0.2;
  shaft.castShadow = true;
  group.add(shaft);

  // Open end (C-shape)
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.42;

  // Top jaw
  const topJaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.025),
    createTrainingMaterial('#6B7280', 0.8, 0.3)
  );
  topJaw.position.set(0.02, 0.03, 0);
  topJaw.castShadow = true;
  headGroup.add(topJaw);

  // Bottom jaw
  const bottomJaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.025),
    createTrainingMaterial('#6B7280', 0.8, 0.3)
  );
  bottomJaw.position.set(0.02, -0.03, 0);
  bottomJaw.castShadow = true;
  headGroup.add(bottomJaw);

  // Back of C
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.025),
    createTrainingMaterial('#6B7280', 0.8, 0.3)
  );
  back.position.set(-0.02, 0, 0);
  back.castShadow = true;
  headGroup.add(back);

  group.add(headGroup);

  // Box end (other side)
  const boxEnd = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.03, 6),
    createTrainingMaterial('#6B7280', 0.8, 0.3)
  );
  boxEnd.position.y = -0.02;
  boxEnd.rotation.x = Math.PI / 2;
  boxEnd.castShadow = true;
  group.add(boxEnd);

  return group;
}

// Build a safety vest
function buildSafetyVest(): THREE.Group {
  const group = new THREE.Group();

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.08),
    createTrainingMaterial('#FF6600', 0.0, 0.9)
  );
  body.position.y = 0.3;
  body.castShadow = true;
  group.add(body);

  // Reflective stripes (yellow)
  const stripe1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.06, 0.085),
    createTrainingMaterial('#FFEB3B', 0.3, 0.4)
  );
  stripe1.position.set(0, 0.5, 0);
  stripe1.castShadow = true;
  group.add(stripe1);

  const stripe2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.06, 0.085),
    createTrainingMaterial('#FFEB3B', 0.3, 0.4)
  );
  stripe2.position.set(0, 0.1, 0);
  stripe2.castShadow = true;
  group.add(stripe2);

  // V-neck
  const vShape = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.2, 0.09),
    createTrainingMaterial('#FF6600', 0.0, 0.9)
  );
  vShape.position.set(0, 0.62, 0);
  vShape.castShadow = true;
  group.add(vShape);

  return group;
}

// Build a first aid kit
function buildFirstAidKit(): THREE.Group {
  const group = new THREE.Group();

  // Main box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.25, 0.12),
    createTrainingMaterial('#FFFFFF', 0.1, 0.6)
  );
  box.position.y = 0.125;
  box.castShadow = true;
  group.add(box);

  // Red cross on front
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.04, 0.005),
    createTrainingMaterial('#DC2626', 0.0, 0.8)
  );
  crossH.position.set(0, 0.14, 0.062);
  crossH.castShadow = true;
  group.add(crossH);

  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.005),
    createTrainingMaterial('#DC2626', 0.0, 0.8)
  );
  crossV.position.set(0, 0.14, 0.062);
  crossV.castShadow = true;
  group.add(crossV);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.01, 8, 16, Math.PI),
    createTrainingMaterial('#374151', 0.6, 0.4)
  );
  handle.position.set(0, 0.26, 0);
  handle.rotation.x = Math.PI / 2;
  handle.castShadow = true;
  group.add(handle);

  return group;
}

// Build a ladder
function buildLadder(): THREE.Group {
  const group = new THREE.Group();

  // Side rails
  const rail1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.2, 0.08),
    createTrainingMaterial('#E6A200', 0.1, 0.7)
  );
  rail1.position.set(-0.2, 0.6, 0);
  rail1.castShadow = true;
  group.add(rail1);

  const rail2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.2, 0.08),
    createTrainingMaterial('#E6A200', 0.1, 0.7)
  );
  rail2.position.set(0.2, 0.6, 0);
  rail2.castShadow = true;
  group.add(rail2);

  // Rungs
  for (let i = 0; i < 6; i++) {
    const rung = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.03, 0.06),
      createTrainingMaterial('#CC8800', 0.1, 0.7)
    );
    rung.position.set(0, 0.1 + i * 0.2, 0);
    rung.castShadow = true;
    group.add(rung);
  }

  // Feet
  const foot1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.1),
    createTrainingMaterial('#1F2937', 0.3, 0.8)
  );
  foot1.position.set(-0.2, 0.02, 0);
  foot1.castShadow = true;
  group.add(foot1);

  const foot2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.1),
    createTrainingMaterial('#1F2937', 0.3, 0.8)
  );
  foot2.position.set(0.2, 0.02, 0);
  foot2.castShadow = true;
  group.add(foot2);

  return group;
}

// Build a compound model for complex objects
function buildCompound(parts: Array<{ shape: 'box' | 'cylinder' | 'sphere'; args: number[]; position: [number, number, number]; color: string }>): THREE.Group {
  const group = new THREE.Group();

  for (const part of parts) {
    let geometry: THREE.BufferGeometry;
    switch (part.shape) {
      case 'box':
        geometry = new THREE.BoxGeometry(part.args[0], part.args[1], part.args[2]);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(part.args[0], part.args[1], part.args[2], part.args[3] ?? 32);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(part.args[0], part.args[1] ?? 32, part.args[2] ?? 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }

    const mesh = new THREE.Mesh(
      geometry,
      createTrainingMaterial(part.color, 0.3, 0.5)
    );
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

// Main procedural generator based on keyword classification
export async function generateProceduralModel(
  prompt: string,
  classification: {
    category: string;
    geometry: string;
    material: { color: string; metalness: number; roughness: number };
  }
): Promise<GeneratedModelData> {
  // Build based on category and geometry hint
  let model: THREE.Group;

  switch (classification.category) {
    case 'safety_equipment':
      if (/hat|helmet/.test(prompt.toLowerCase())) {
        model = buildHardHat();
      } else if (/extinguisher|fire/.test(prompt.toLowerCase())) {
        model = buildFireExtinguisher();
      } else if (/vest|safety/.test(prompt.toLowerCase())) {
        model = buildSafetyVest();
      } else {
        model = buildHardHat();
      }
      break;

    case 'tool':
      if (/wrench/.test(prompt.toLowerCase())) {
        model = buildWrench();
      } else if (/ladder/.test(prompt.toLowerCase())) {
        model = buildLadder();
      } else {
        model = buildWrench();
      }
      break;

    case 'medical':
      model = buildFirstAidKit();
      break;

    case 'vehicle':
      // Simplified vehicle as compound shape
      model = buildCompound([
        { shape: 'box', args: [0.6, 0.3, 0.4], position: [0, 0.2, 0], color: '#1E40AF' },
        { shape: 'box', args: [0.5, 0.15, 0.35], position: [0, 0.4, 0], color: '#1E3A8A' },
        { shape: 'cylinder', args: [0.08, 0.08, 0.1, 16], position: [-0.22, 0.08, 0.18], color: '#1F2937' },
        { shape: 'cylinder', args: [0.08, 0.08, 0.1, 16], position: [0.22, 0.08, 0.18], color: '#1F2937' },
        { shape: 'cylinder', args: [0.08, 0.08, 0.1, 16], position: [-0.22, 0.08, -0.18], color: '#1F2937' },
        { shape: 'cylinder', args: [0.08, 0.08, 0.1, 16], position: [0.22, 0.08, -0.18], color: '#1F2937' },
      ]);
      break;

    default:
      // Generic box as fallback
      if (classification.geometry === 'cylinder') {
        model = new THREE.Group();
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32),
          createTrainingMaterial(classification.material.color, classification.material.metalness, classification.material.roughness)
        );
        cyl.position.y = 0.25;
        cyl.castShadow = true;
        model.add(cyl);
      } else {
        model = new THREE.Group();
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          createTrainingMaterial(classification.material.color, classification.material.metalness, classification.material.roughness)
        );
        box.position.y = 0.2;
        box.castShadow = true;
        model.add(box);
      }
  }

  // Auto-center and scale
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 0) {
    model.scale.setScalar(2 / maxDim);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  return {
    geometry: model,
    classification: {
      category: classification.category,
      description: `Training asset: ${prompt} - ${classification.category}`,
      material: classification.material,
    },
  };
}

// Export a Three.js group to GLB (client-side)
export async function exportToGLB(group: THREE.Group): Promise<Blob> {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          const json = JSON.stringify(result);
          resolve(new Blob([json], { type: 'application/json' }));
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

// Download GLB file
export function downloadGLB(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
