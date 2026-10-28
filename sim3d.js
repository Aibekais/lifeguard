/* LifeGuard 3D apartment — vanilla Three.js (r134) */
(function (global) {
  const H = 2.55;
  let renderer, scene, camera, rafId, clock;
  let player, yaw = 0, pitch = -0.12;
  let lookOn = false, pointerLocked = false;
  let lastX = 0, lastY = 0;
  let fireGroup, fireLight, kitchenDoor, smokePts, smokeGeo, smokeAttr;
  let overlayEl, canvas;
  let disposed = true;
  let previewMode = false;
  let interactables = [];
  const keys = {};
  const smokeDummy = new THREE.Object3D();

  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0.05 }, opts || {}));
  }

  function box(w, h, d, material, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }

  function cyl(r, h, material, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    (parent || scene).add(m);
    return m;
  }

  function buildApartment() {
    const wall = mat(0x1c283c);
    const wallIn = mat(0x243248);
    const floor = mat(0x3a2a1c);
    const ceil = mat(0x121a28);
    const wood = mat(0x4a3424);
    const fabric = mat(0x2c3f5c);
    const dark = mat(0x151c28);
    const metal = mat(0x6a778c, { metalness: 0.45, roughness: 0.4 });
    const red = mat(0xc62828);
    const blue = mat(0x3d7ed4);
    const cream = mat(0xc9b8a0);

    // Floor living (-4..4) + kitchen (4..8)
    box(8.2, 0.08, 6.2, floor, 0, 0, 0);
    box(4.2, 0.08, 6.2, mat(0x2f3338), 6, 0, 0);
    box(12.2, 0.06, 6.2, ceil, 2, H, 0);

    // Outer walls
    box(12.2, H, 0.16, wall, 2, H / 2, -3.08);
    box(12.2, H, 0.16, wall, 2, H / 2, 3.08);
    box(0.16, H, 6.2, wall, -4.08, H / 2, 0);
    box(0.16, H, 6.2, wall, 8.08, H / 2, 0);

    // Interior wall with doorway at z=0
    box(0.14, H, 2.15, wallIn, 4, H / 2, -1.95);
    box(0.14, H, 2.15, wallIn, 4, H / 2, 1.95);
    box(0.14, 0.55, 1.2, wallIn, 4, H - 0.28, 0);

    kitchenDoor = box(0.08, 2.0, 1.12, mat(0xc9a227), 4.02, 1.02, 0);
    kitchenDoor.visible = false;

    // Exit door (living, west wall)
    box(0.08, 2.05, 0.95, blue, -4.02, 1.05, 0);
    const exitHandle = cyl(0.03, 0.12, metal, -3.96, 1.05, 0.32);
    exitHandle.rotation.z = Math.PI / 2;

    // Window living
    const glass = mat(0x6ea8e8, { emissive: 0x1a3a66, emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.55 });
    box(1.8, 1.15, 0.06, glass, -1.2, 1.55, -3.02);
    box(0.08, 1.15, 0.1, wood, -2.12, 1.55, -3.02);
    box(0.08, 1.15, 0.1, wood, -0.28, 1.55, -3.02);

    // Sofa
    box(2.4, 0.42, 0.9, fabric, -1.6, 0.28, 2.15);
    box(2.4, 0.55, 0.18, fabric, -1.6, 0.7, 2.5);
    box(0.18, 0.55, 0.9, fabric, -2.72, 0.7, 2.15);
    box(0.18, 0.55, 0.9, fabric, -0.48, 0.7, 2.15);

    // Coffee table + laptop
    box(1.15, 0.08, 0.62, wood, 0.15, 0.38, 0.55);
    cyl(0.04, 0.36, dark, -0.32, 0.18, 0.3);
    cyl(0.04, 0.36, dark, 0.62, 0.18, 0.3);
    cyl(0.04, 0.36, dark, -0.32, 0.18, 0.8);
    cyl(0.04, 0.36, dark, 0.62, 0.18, 0.8);
    box(0.32, 0.02, 0.22, dark, 0.15, 0.44, 0.55);
    box(0.32, 0.22, 0.02, metal, 0.15, 0.55, 0.44);

    // TV unit
    box(1.6, 0.4, 0.4, wood, 1.8, 0.22, -2.55);
    box(1.2, 0.7, 0.06, dark, 1.8, 1.05, -2.72);

    // Side table + phone
    box(0.45, 0.5, 0.45, wood, -3.2, 0.27, 1.7);
    box(0.12, 0.04, 0.22, mat(0x222), -3.2, 0.55, 1.7);
    cyl(0.05, 0.16, mat(0x111), -3.2, 0.64, 1.7);

    // Alarm on wall
    cyl(0.12, 0.05, mat(0xe8a317), -2.6, 1.85, -2.95);
    cyl(0.12, 0.05, mat(0xe8a317), -2.6, 1.85, -2.95).rotation.x = Math.PI / 2;

    // Kitchen cabinets
    box(3.6, 0.9, 0.62, cream, 6.1, 0.45, -2.55);
    box(3.6, 0.04, 0.64, mat(0x2a3038), 6.1, 0.92, -2.55);
    box(1.1, 1.6, 0.62, cream, 7.55, 0.82, 2.35);

    // Stove
    box(0.85, 0.12, 0.55, dark, 6.4, 0.98, -2.5);
    cyl(0.12, 0.03, metal, 6.2, 1.05, -2.4);
    cyl(0.12, 0.03, metal, 6.6, 1.05, -2.4);

    // Fire
    fireGroup = new THREE.Group();
    fireGroup.position.set(6.4, 1.12, -2.48);
    scene.add(fireGroup);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4a1a, transparent: true, opacity: 0.88 });
    const flame2 = new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.8 });
    fireGroup.add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), flameMat));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), flame2);
    inner.position.y = -0.05;
    fireGroup.add(inner);
    fireLight = new THREE.PointLight(0xff6a22, 1.8, 7, 2);
    fireLight.position.set(6.4, 1.45, -2.4);
    scene.add(fireLight);

    // Extinguisher
    cyl(0.08, 0.5, red, 7.55, 0.4, 1.35);
    cyl(0.03, 0.12, metal, 7.55, 0.7, 1.35);

    // Kitchen counter clutter
    cyl(0.07, 0.22, mat(0xdfe6ef), 5.3, 1.08, -2.45);
    box(0.28, 0.18, 0.2, mat(0x88a), 5.7, 1.05, -2.5);

    // Rug
    box(2.2, 0.03, 1.5, mat(0x5a2a2a), -0.4, 0.06, 0.7);

    // Ceiling lights
    const lamp = new THREE.PointLight(0xcfe4ff, 0.55, 8);
    lamp.position.set(-0.4, 2.25, 0.2);
    scene.add(lamp);
    const lamp2 = new THREE.PointLight(0xffe6c8, 0.35, 6);
    lamp2.position.set(6.2, 2.25, 0);
    scene.add(lamp2);

    const hemi = new THREE.HemisphereLight(0x8eb4e8, 0x1a120c, 0.45);
    scene.add(hemi);

    // Labels as simple markers (optional rings)
    const mark = mat(0x4a8fe7, { emissive: 0x4a8fe7, emissiveIntensity: 0.7 });
    [
      [-2.6, 1.55, -2.7],
      [-3.2, 0.85, 1.7],
      [4.0, 1.35, 0.0],
      [0.15, 0.62, 0.55],
      [7.55, 0.85, 1.35],
      [-3.7, 1.2, 0.0]
    ].forEach((p) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), mark);
      s.position.set(p[0], p[1], p[2]);
      scene.add(s);
    });

    interactables = [
      { id: "alarm", pos: new THREE.Vector3(-2.6, 1.4, -2.6), l: "Өрт дабылын қағу" },
      { id: "phone", pos: new THREE.Vector3(-3.2, 0.7, 1.7), l: "112-ге қоңырау шалу" },
      { id: "close", pos: new THREE.Vector3(4.0, 1.1, 0.0), l: "Ас үй есігін жабу" },
      { id: "laptop", pos: new THREE.Vector3(0.15, 0.5, 0.55), l: "Ноутбукті алу" },
      { id: "extg", pos: new THREE.Vector3(7.55, 0.5, 1.35), l: "Өртті сөндіруге тырысу" },
      { id: "exit", pos: new THREE.Vector3(-3.85, 1.1, 0.0), l: "Пәтерден шығу" }
    ];

    buildSmoke();
  }

  function buildSmoke() {
    const n = 140;
    smokeGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const spd = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = 5.4 + Math.random() * 2.2;
      pos[i * 3 + 1] = 0.9 + Math.random() * 1.4;
      pos[i * 3 + 2] = -2.6 + Math.random() * 1.4;
      spd.push(0.15 + Math.random() * 0.35);
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    smokeGeo.userData.spd = spd;
    const sm = new THREE.PointsMaterial({
      color: 0x8a93a3,
      size: 0.22,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    smokePts = new THREE.Points(smokeGeo, sm);
    scene.add(smokePts);
    smokeAttr = smokeGeo.getAttribute("position");
  }

  function collide(x, z, closed) {
    x = Math.max(-3.72, Math.min(7.72, x));
    z = Math.max(-2.72, Math.min(2.72, z));
    const inDoor = Math.abs(z) < 0.48;
    if (Math.abs(x - 4) < 0.28) {
      if (closed || !inDoor) {
        x = x < 4 ? 3.72 : 4.28;
      }
    }
    // sofa
    if (x > -2.9 && x < -0.3 && z > 1.55 && z < 2.65) {
      if (z < 2.1) z = 1.55;
      else z = 2.65;
    }
    // coffee table
    if (x > -0.5 && x < 0.8 && z > 0.15 && z < 0.95) {
      z = z < 0.55 ? 0.15 : 0.95;
    }
    return { x, z };
  }

  function nearOf(px, pz, G) {
    let best = null, bd = 1.35;
    for (const o of interactables) {
      if (o.id === "close" && G.closed) continue;
      const d = Math.hypot(o.pos.x - px, o.pos.z - pz);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  function onMouseMove(e) {
    if (previewMode || disposed) return;
    const dx = e.movementX != null && pointerLocked ? e.movementX : e.clientX - lastX;
    const dy = e.movementY != null && pointerLocked ? e.movementY : e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (!lookOn && !pointerLocked) return;
    yaw -= dx * 0.0022;
    pitch -= dy * 0.002;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  }

  function onPointerDown(e) {
    if (previewMode || disposed) return;
    lastX = e.clientX;
    lastY = e.clientY;
    lookOn = true;
    overlayEl && (overlayEl.style.display = "none");
    if (canvas.requestPointerLock && matchMedia("(pointer: fine)").matches) {
      canvas.requestPointerLock();
    }
  }

  function onPointerUp() {
    if (!pointerLocked) lookOn = false;
  }

  function onLockChange() {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked) lookOn = false;
  }

  function key(e, down) {
    keys[e.key.toLowerCase()] = down;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
  }

  function resize() {
    if (!renderer || !canvas) return;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function updateSmoke(dt, G) {
    const n = smokeAttr.count;
    const arr = smokeAttr.array;
    const spd = smokeGeo.userData.spd;
    const spread = G.closed ? 0.15 : G.smoke;
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 1] += spd[i] * dt;
      arr[i * 3] += (Math.random() - 0.5) * 0.2 * dt;
      arr[i * 3 + 2] += (Math.random() - 0.5) * 0.2 * dt;
      if (arr[i * 3 + 1] > 2.4) {
        const inLiving = Math.random() < spread * 0.85;
        arr[i * 3] = inLiving ? -2 + Math.random() * 5.5 : 5.2 + Math.random() * 2.4;
        arr[i * 3 + 1] = 0.7 + Math.random() * 0.4;
        arr[i * 3 + 2] = inLiving ? -2 + Math.random() * 4 : -2.7 + Math.random() * 1.6;
      }
    }
    smokeAttr.needsUpdate = true;
    smokePts.material.opacity = 0.18 + G.smoke * 0.5;
    smokePts.material.size = 0.18 + G.smoke * 0.2;
    scene.fog.density = 0.045 + G.smoke * 0.09;
  }

  function tickPlay(now, G, api) {
    if (disposed || !G || !G.run) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = now * 0.001;
    fireGroup.scale.set(1 + Math.sin(t * 14) * 0.12, 1 + Math.sin(t * 18) * 0.22, 1);
    fireGroup.rotation.y = Math.sin(t * 6) * 0.15;
    fireLight.intensity = 1.3 + Math.sin(t * 16) * 0.5 + Math.random() * 0.25;

    if (!G.paused && !G.over) {
      G.t += dt;
      const rate = (G.closed ? 0.006 : 0.014) * G.dm;
      G.smoke = Math.min(1, G.smoke + rate * dt * (1 + (G.t > 60 ? 0.5 : 0)));

      let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      let dz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      if (G.stick) {
        dx += G.stick.x;
        dz += G.stick.z;
      }
      const sp = (G.crouch ? 1.35 : 2.35) * dt;
      const c = Math.cos(yaw), s = Math.sin(yaw);
      let nx = player.x + (dx * c + dz * s) * sp;
      let nz = player.z + (-dx * s + dz * c) * sp;
      const p = collide(nx, nz, G.closed);
      player.x = p.x;
      player.z = p.z;

      const inKit = player.x > 4.15;
      let dmg = 0;
      if (inKit) dmg = 8;
      else if (G.smoke > 0.3) dmg = G.crouch ? G.smoke * 1.2 : G.smoke * 5;
      G.hp -= dmg * dt;
      if (dmg > 0 && !G.crouch && G.smoke > 0.3) G.done.smokeNoCrouch = 1;
      if (dmg > 0 && G.crouch) G.done.smokeCrouch = 1;
      if (inKit && !G.done.kit) {
        G.done.kit = 1;
        api.rec("kit", 0, "Түтінді ас үйге кірдіңіз");
      }
      if (G.hp <= 0) {
        G.hp = 0;
        api.end(false, "Денсаулығыңыз таусылды.");
      } else if (G.t >= G.lim) api.end(false, "Уақыт бітті: өрт таралды.");
    }

    kitchenDoor.visible = !!G.closed;
    const eye = G.crouch ? 0.95 : 1.58;
    camera.position.set(player.x, eye, player.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);

    updateSmoke(dt, G);
    api.draw(nearOf(player.x, player.z, G));
    rafId = requestAnimationFrame((n) => tickPlay(n, G, api));
  }

  function tickPreview() {
    if (disposed || !previewMode) return;
    const t = clock.getElapsedTime();
    camera.position.set(Math.sin(t * 0.22) * 5.2, 2.1, Math.cos(t * 0.22) * 5.2);
    camera.lookAt(2.2, 0.9, 0);
    fireGroup.scale.set(1, 1 + Math.sin(t * 16) * 0.2, 1);
    fireLight.intensity = 1.4 + Math.sin(t * 12) * 0.4;
    rafId = requestAnimationFrame(tickPreview);
    renderer.render(scene, camera);
  }

  function mount(container, opts) {
    dispose();
    disposed = false;
    previewMode = !!(opts && opts.preview);
    overlayEl = null;
    container.innerHTML = "";
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "3D пәтер");
    canvas.style.width = "100%";
    canvas.style.height = previewMode ? "280px" : "min(68vh, 560px)";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);
    if (!previewMode) {
      overlayEl = document.createElement("div");
      overlayEl.className = "look-hint";
      overlayEl.textContent = "Сахнаны басыңыз — қарау үшін";
      container.appendChild(overlayEl);
    }

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x0b1424);
    renderer.shadowMap.enabled = false;
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a2230, 0.05);
    camera = new THREE.PerspectiveCamera(70, 1, 0.08, 40);
    clock = new THREE.Clock();
    buildApartment();
    player = { x: -0.4, z: -0.2 };
    yaw = 0.4;
    pitch = -0.08;
    camera.position.set(player.x, 1.58, player.z);

    resize();
    window.addEventListener("resize", resize);
    if (!previewMode) {
      canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointermove", onMouseMove);
      document.addEventListener("pointerlockchange", onLockChange);
      window.addEventListener("keydown", (e) => key(e, 1));
      window.addEventListener("keyup", (e) => key(e, 0));
    }
    return true;
  }

  function startPlay(container, G, api) {
    if (!global.THREE) return false;
    try {
      mount(container, { preview: false });
      Object.keys(keys).forEach((k) => (keys[k] = 0));
      rafId = requestAnimationFrame((n) => tickPlay(n, G, api));
      const renderLoop = () => {
        if (disposed) return;
        renderer.render(scene, camera);
        requestAnimationFrame(renderLoop);
      };
      requestAnimationFrame(renderLoop);
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  function startPreview(container) {
    if (!global.THREE) return false;
    try {
      mount(container, { preview: true });
      rafId = requestAnimationFrame(tickPreview);
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  function setKey(k, v) {
    keys[k] = v;
  }

  function dispose() {
    disposed = true;
    previewMode = false;
    lookOn = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointermove", onMouseMove);
    document.removeEventListener("pointerlockchange", onLockChange);
    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
    }
    if (document.pointerLockElement) document.exitPointerLock();
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    scene = camera = canvas = null;
  }

  global.Sim3D = { startPlay, startPreview, dispose, setKey, nearOf, getPlayer: () => player };
})(window);
