const THREE_MODULE_URL = "https://unpkg.com/three@0.164.1/build/three.module.js";

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function disposeScene(root) {
  root.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    const material = child.material;

    if (!material) {
      return;
    }

    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material.dispose();
  });
}

function createVillaGroup(THREE) {
  // Keep the composition geometric and lightweight so the scene feels editorial, not game-like.
  const villa = new THREE.Group();
  const ivory = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe4,
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.28,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x9d9388,
    roughness: 0.82,
    metalness: 0.05,
  });
  const graphite = new THREE.MeshStandardMaterial({
    color: 0x14171d,
    roughness: 0.5,
    metalness: 0.24,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xc9a84c,
    roughness: 0.32,
    metalness: 0.74,
    emissive: 0x2a1e07,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x7ca2ad,
    transparent: true,
    opacity: 0.28,
    transmission: 0.88,
    roughness: 0.08,
    metalness: 0.18,
    clearcoat: 1,
  });

  const podium = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.42, 7.2), concrete);
  podium.position.set(0, -1.45, 0);
  villa.add(podium);

  const terrace = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.18, 5.8), ivory);
  terrace.position.set(0.45, -0.95, 0.15);
  villa.add(terrace);

  const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(3.15, 2.15, 2.8), ivory);
  mainBlock.position.set(-0.55, 0.2, 0.45);
  villa.add(mainBlock);

  const wingBlock = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.95, 2.35), ivory);
  wingBlock.position.set(1.92, 0.55, -0.3);
  villa.add(wingBlock);

  const connector = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.3, 1.85), concrete);
  connector.position.set(1.02, -0.25, 1.08);
  villa.add(connector);

  const roofMain = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.14, 3.05), graphite);
  roofMain.position.set(-0.52, 1.28, 0.48);
  villa.add(roofMain);

  const roofWing = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.14, 2.62), graphite);
  roofWing.position.set(1.96, 2.06, -0.28);
  villa.add(roofWing);

  const cantilever = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.25), graphite);
  cantilever.position.set(2.68, 0.08, 0.92);
  villa.add(cantilever);

  const glassFront = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.5, 0.06), glass);
  glassFront.position.set(-0.62, 0.08, 1.88);
  villa.add(glassFront);

  const glassCorner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 1.08), glass);
  glassCorner.position.set(0.97, 0.22, 1.31);
  villa.add(glassCorner);

  const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 1.24), glass);
  glassSide.position.set(3.0, 0.55, -0.32);
  villa.add(glassSide);

  const mullionA = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.62, 0.04), gold);
  mullionA.position.set(-0.62, 0.12, 1.9);
  villa.add(mullionA);

  const mullionB = mullionA.clone();
  mullionB.position.set(0.98, 0.28, 1.32);
  villa.add(mullionB);

  const mullionC = mullionA.clone();
  mullionC.position.set(2.98, 0.56, -0.32);
  villa.add(mullionC);

  const path = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.035, 0.28), gold);
  path.position.set(0.88, -1.2, 2.48);
  villa.add(path);

  const step = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.52), concrete);
  step.position.set(2.65, -1.1, 1.74);
  villa.add(step);

  const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x32423a,
    roughness: 0.94,
  });
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x413022,
    roughness: 0.92,
  });

  for (const x of [-2.55, -2.0, -1.5]) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), treeMaterial);
    crown.position.set(x, -0.42, 1.9 + x * 0.04);
    crown.scale.set(1, 1.18, 1);
    villa.add(crown);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.45, 10), trunkMaterial);
    trunk.position.set(x, -0.84, 1.9 + x * 0.04);
    villa.add(trunk);
  }

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xd8c68d,
    transparent: true,
    opacity: 0.46,
  });

  [mainBlock, wingBlock, connector].forEach((mesh) => {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24), edgeMaterial);
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    edges.scale.copy(mesh.scale);
    villa.add(edges);
  });

  villa.rotation.x = -0.18;
  villa.rotation.y = 0.56;
  return villa;
}

export async function initHeroScene() {
  const visualRoot = document.querySelector("[data-hero-visual]");
  const canvas = document.querySelector("[data-hero-canvas]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!visualRoot || !canvas || prefersReducedMotion || !canUseWebGL()) {
    return () => {};
  }

  try {
    const THREE = await import(THREE_MODULE_URL);

    // The page can rerender while the module is loading; bail out if this mount is stale.
    if (!visualRoot.isConnected || !canvas.isConnected) {
      return () => {};
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);

    if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    if ("toneMapping" in renderer && "ACESFilmicToneMapping" in THREE) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(8.6, 5.2, 9.4);
    camera.lookAt(0.4, 0.4, 0.2);

    const ambientLight = new THREE.HemisphereLight(0xf7f1e4, 0x11151a, 1.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0d2, 1.4);
    keyLight.position.set(6, 9, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd0b15b, 0.95);
    rimLight.position.set(-5, 4, -6);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xc9a84c, 1.35, 20);
    pointLight.position.set(2.4, 1.2, 3.2);
    scene.add(pointLight);

    const world = new THREE.Group();
    const villa = createVillaGroup(THREE);
    world.add(villa);

    // The grid and halo keep the scene tied to architectural drawing language.
    const grid = new THREE.GridHelper(16, 24, 0xc9a84c, 0x2d3440);
    grid.position.y = -1.46;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    const haloGeometry = new THREE.RingGeometry(3.3, 3.42, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9a84c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0.4, -1.35, 0.2);
    scene.add(halo);

    scene.add(world);

    const resize = () => {
      const bounds = visualRoot.getBoundingClientRect();
      const width = Math.max(bounds.width, 1);
      const height = Math.max(bounds.height, 1);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const compactScale = width < 540 ? 0.78 : width < 740 ? 0.88 : 1;
      world.scale.setScalar(compactScale);
      world.position.x = width < 540 ? 0.45 : 0;
      camera.position.set(width < 540 ? 9.2 : 8.6, height < 360 ? 5.7 : 5.2, width < 540 ? 10.3 : 9.4);
      camera.lookAt(0.4, 0.3, 0.2);
    };

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;

    if (resizeObserver) {
      resizeObserver.observe(visualRoot);
    } else {
      window.addEventListener("resize", resize);
    }

    let frameId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const elapsed = clock.getElapsedTime();

      // Motion stays restrained: a slow orbit, gentle float, and subtle light drift.
      world.rotation.y = 0.16 + elapsed * 0.16;
      world.position.y = Math.sin(elapsed * 0.95) * 0.16;
      world.position.x = Math.sin(elapsed * 0.45) * 0.1;
      halo.rotation.z = elapsed * 0.18;
      keyLight.position.x = 5.6 + Math.sin(elapsed * 0.28) * 0.4;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    resize();
    visualRoot.classList.add("has-three");
    frameId = window.requestAnimationFrame(render);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", resize);
      }

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      visualRoot.classList.remove("has-three");
      renderer.dispose();
      disposeScene(scene);
    };
  } catch (error) {
    console.warn("Hero scene fallback activated.", error);
    return () => {};
  }
}
