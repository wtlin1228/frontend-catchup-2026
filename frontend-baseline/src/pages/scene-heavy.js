import './scene-heavy.css';

const $ = (id) => document.getElementById(id);
const canvas = $('scene-canvas');
const wrap = $('scene-wrap');
const status = $('scene-status');
const controls = $('scene-controls');

main().catch((err) => {
  status.hidden = false;
  status.textContent = `Could not start the 3D scene: ${err.message}`;
  console.error(err);
});

async function main() {
  // Lazy import: three.js becomes a separate chunk that only this page downloads.
  const [THREE, { OrbitControls }] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]);
  status.hidden = true;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.4, 5.5);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 2);
  scene.add(key);
  const grid = new THREE.GridHelper(10, 20, 0x8a8a8a, 0x4a4a4a);
  grid.position.y = -1.4;
  scene.add(grid);

  const material = new THREE.MeshStandardMaterial({ color: controls.elements.namedItem('color').value, roughness: 0.35, metalness: 0.25 });
  const mesh = new THREE.Mesh(geometry(THREE, 'torusKnot'), material);
  scene.add(mesh);

  // Instanced field: up to 2000 cubes in one draw call, driven by a slider.
  const field = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x9aa4aa, roughness: 0.6 }), 2000);
  scene.add(field);
  const dummy = new THREE.Object3D();
  function layoutField(count) {
    field.count = count;
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(count, 1)) * Math.PI * 14;
      const radius = 2.2 + (i % 5) * 0.25;
      dummy.position.set(Math.cos(angle) * radius, Math.sin(i * 0.37) * 1.2, Math.sin(angle) * radius);
      dummy.rotation.set(i, i * 0.5, 0);
      dummy.updateMatrix();
      field.setMatrixAt(i, dummy.matrix);
    }
    field.instanceMatrix.needsUpdate = true;
  }
  layoutField(Number(controls.elements.namedItem('instances').value));

  // Picking: raycast on pointer move, highlight on hover, toggle selection on click.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = false;
  let selected = false;
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    hovered = raycaster.intersectObject(mesh).length > 0;
    material.emissive.set(hovered || selected ? 0x4a2a10 : 0x000000);
    canvas.style.cursor = hovered ? 'pointer' : '';
  });
  canvas.addEventListener('click', () => {
    if (!hovered) return;
    selected = !selected;
    $('selected').textContent = selected ? 'Selected: the main shape' : 'Nothing selected. Hover the shape and click.';
  });

  const state = { speed: 1, paused: false };

  // UI → scene. Objects are mutated in place, nothing is rebuilt. Declarative wrappers
  // (react-three-fiber, TresJS, Threlte, angular-three) do this reconciliation for you.
  controls.addEventListener('submit', (e) => e.preventDefault());
  controls.addEventListener('input', (e) => {
    const { name, value, checked } = e.target;
    if (name === 'color') material.color.set(value);
    else if (name === 'wireframe') material.wireframe = checked;
    else if (name === 'speed') { state.speed = Number(value); $('speed-out').value = Number(value).toFixed(1); }
    else if (name === 'shape') { mesh.geometry.dispose(); mesh.geometry = geometry(THREE, value); }
    else if (name === 'instances') { layoutField(Number(value)); $('instances-out').value = value; }
  });
  $('pause').addEventListener('click', (e) => {
    state.paused = !state.paused;
    e.currentTarget.textContent = state.paused ? 'Resume' : 'Pause';
    e.currentTarget.setAttribute('aria-pressed', String(state.paused));
  });
  $('snapshot').addEventListener('click', () => {
    renderer.render(scene, camera); // render right before reading pixels, so preserveDrawingBuffer is not needed
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scene.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });

  // Size follows the container, not the window.
  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(wrap);

  // Render loop, gated: no frames while off screen or in a hidden tab. Stats are written at 2 Hz, not per frame.
  let raf = 0, last = 0, frames = 0, fpsTime = 0, onScreen = true;
  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!state.paused) {
      mesh.rotation.y += dt * state.speed;
      mesh.rotation.x += dt * state.speed * 0.35;
    }
    field.rotation.y -= dt * 0.08;
    orbit.update();
    renderer.render(scene, camera);
    frames++;
    if (now - fpsTime > 500) {
      $('fps').textContent = Math.round((frames * 1000) / (now - fpsTime));
      $('tris').textContent = renderer.info.render.triangles.toLocaleString();
      frames = 0;
      fpsTime = now;
    }
  }
  function start() {
    if (raf) return;
    last = fpsTime = performance.now();
    frames = 0;
    raf = requestAnimationFrame(frame);
  }
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) start();
  });
  visibility.observe(canvas);
  document.addEventListener('visibilitychange', start);
  start();

  // Teardown: what a component's unmount hook has to do for an imperative library.
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    visibility.disconnect();
    orbit.dispose();
    mesh.geometry.dispose();
    material.dispose();
    field.geometry.dispose();
    field.material.dispose();
    renderer.dispose();
  }, { once: true });
}

function geometry(THREE, kind) {
  switch (kind) {
    case 'icosahedron': return new THREE.IcosahedronGeometry(1.3, 1);
    case 'torus': return new THREE.TorusGeometry(1.1, 0.4, 24, 64);
    case 'box': return new THREE.BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4);
    default: return new THREE.TorusKnotGeometry(0.9, 0.3, 160, 24);
  }
}
