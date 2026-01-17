/*
 * FINDING EXOPLANETS: THE MOVIE (HYBRID CUT)
 * COMBINING: OG Narrative + Master Plan Visuals (Audio, Energy Alien, Plasma Sun)
 */

console.log("INITIALIZING HYBRID SYSTEM...");

// --- GLOBALS ---
let scene, camera, renderer, clock;
let sun, planetOrbitGroup, planetGroup, planet, alien, satellite, earth, photons, starfield, beam;
let earthUniforms, sunUniforms, alienUniforms;
// Timeline State
let orbitState = { angle: 0 };
const orbitRadius = 25;

// --- AUDIO ENGINE (from Master Plan) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.drone = null;
        this.droneGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Low Volume
        this.masterGain.connect(this.ctx.destination);

        // Ambience Drone (FM Synthesis)
        this.drone = this.ctx.createOscillator();
        this.drone.type = 'sine';
        this.drone.frequency.value = 60; // Deep space hum

        const mod = this.ctx.createOscillator();
        mod.frequency.value = 0.15;
        const modGain = this.ctx.createGain();
        modGain.gain.value = 5;
        mod.connect(modGain);
        modGain.connect(this.drone.frequency);
        mod.start();

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0; // Fade in
        this.drone.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);
        this.drone.start();

        this.droneGain.gain.setTargetAtTime(0.4, this.ctx.currentTime, 5);
        this.initialized = true;
        console.log("AUDIO SYSTEM ONLINE");
    }

    playBlip() {
        if (!this.initialized) this.init();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(t + 0.1);
    }

    playScan() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(440, t);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(t + 0.5);
    }

    playSuccess() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.05, t + 2 + i * 0.5);
            gain.gain.linearRampToValueAtTime(0, t + 8);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(t + 8);
        });
    }
}
const audio = new SoundManager();

// --- INIT ---
window.addEventListener('load', init);
window.addEventListener('click', () => audio.init(), { once: true });
window.addEventListener('scroll', () => audio.init(), { once: true });

function init() {
    try {
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000005);
        scene.fog = new THREE.FogExp2(0x000005, 0.0002);

        // Initial Camera (Match OG: 0, 60, 80)
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(0, 60, 80);
        camera.lookAt(0, 0, 0);
        // Enable Layers for Isolated Lighting
        camera.layers.enable(1); // Satellite Layer
        camera.layers.enable(2); // Earth Layer

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        // Create High-Fidelity Assets
        createStarfield();
        createSun(); // Plasma Sun
        createPlanetSystem(); // Energy Alien
        createSatellite(); // Gold Satellite
        createRealEarth(); // Shader Earth
        createPhotons();
        createDataBeam(); // Laser beam

        const ambient = new THREE.AmbientLight(0xffffff, 0.05);
        scene.add(ambient);

        gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
        setupHybridTimeline();

        document.getElementById('loader').style.display = 'none';

        window.addEventListener('resize', onWindowResize, false);
        setupInteraction();
        animate();

    } catch (e) {
        console.error("FATAL ERROR:", e);
        document.getElementById('error-log').innerText = e.message;
    }
}

// --- ASSET FUNCTIONS (HIGH FIDELITY) ---
function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(10000 * 3);
    for (let i = 0; i < 10000 * 3; i++) pos[i] = (Math.random() - 0.5) * 2000;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starfield = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 }));
    scene.add(starfield);
}

function createSun() {
    // Plasma Shader Logic
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPos;
        // Simplex Noise (simplified for brevity)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) { 
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i); 
            vec4 p = permute( permute( permute( 
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }
        void main() {
            float n = snoise(vPos * 0.5 + vec3(time * 0.5));
            float n2 = snoise(vPos * 1.5 - vec3(time * 0.8));
            float combined = n * 0.7 + n2 * 0.3;
            // Orange/Yellow Plasma
            vec3 orange = vec3(1.0, 0.4, 0.0);
            vec3 yellow = vec3(1.0, 0.9, 0.4);
            vec3 dark = vec3(0.8, 0.1, 0.0);
            vec3 color = mix(orange, dark, combined);
            color = mix(color, yellow, smoothstep(0.3, 0.8, combined));
            // Limb Darkening
            float viewAngle = dot(vNormal, vec3(0,0,1));
            float fresnel = pow(1.0 - abs(viewAngle), 3.0);
            color += fresnel * vec3(0.5, 0.2, 0.0);
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    window.sunUniforms = { time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: window.sunUniforms, vertexShader: vertexShader, fragmentShader: fragmentShader });
    sun = new THREE.Mesh(geometry, mat);

    // Simple Glow
    const glowGeo = new THREE.PlaneGeometry(35, 35);
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,170,0,0.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.lookAt(camera.position);
    sun.add(glow);
    scene.add(sun);
}

function createPlanetSystem() {
    planetOrbitGroup = new THREE.Group();
    scene.add(planetOrbitGroup);
    planetGroup = new THREE.Group();
    planetOrbitGroup.add(planetGroup);

    planet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 64), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 }));

    // ENERGY SWARM ALIEN
    alien = new THREE.Group();
    const geometry = new THREE.IcosahedronGeometry(0.2, 10);
    const vertexShader = `
        uniform float time;
        varying vec3 vNormal;
        void main() {
            vNormal = normal;
            float displacement = sin(position.x * 4.0 + time * 2.0) * 0.1;
            vec3 newPos = position + normal * displacement;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
    `;
    const fragmentShader = `
        varying vec3 vNormal;
        void main() {
            gl_FragColor = vec4(0.0, 1.0, 1.0, 0.8);
        }
    `;
    window.alienUniforms = { time: { value: 0 } };
    const material = new THREE.ShaderMaterial({ uniforms: window.alienUniforms, vertexShader: vertexShader, fragmentShader: fragmentShader, transparent: true, blending: THREE.AdditiveBlending });
    const core = new THREE.Mesh(geometry, material);
    alien.add(core);

    // Particles around alien
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(300);
    for (let i = 0; i < 300; i++) pPos[i] = (Math.random() - 0.5) * 0.8;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.02, transparent: true });
    alien.add(new THREE.Points(pGeo, pMat));

    alien.position.set(0, 0.45, 0);
    planet.add(alien);
    planetGroup.add(planet);
    planetGroup.position.set(orbitRadius, 0, 0); // Start wide
}

// --- HELPER: GLOW TEXTURE ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function createSatellite() {
    satellite = new THREE.Group();

    // LIGHTS (Layer 1 Only)
    const key = new THREE.SpotLight(0xffffff, 2, 50, 0.5);
    key.position.set(10, 10, 20); key.layers.set(1); satellite.add(key);

    const fill = new THREE.PointLight(0xccddff, 0.5);
    fill.position.set(-10, 0, 10); fill.layers.set(1); satellite.add(fill);

    const rim = new THREE.SpotLight(0x00aaff, 3, 50);
    rim.position.set(0, 5, -10); rim.lookAt(0, 0, 0); rim.layers.set(1); satellite.add(rim);

    // MESHES (Layer 1 Only)
    const bodyGeo = new THREE.CylinderGeometry(1, 1, 4, 32);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 }));
    body.layers.set(1);
    satellite.add(body);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 1.0, roughness: 0.2 }));
    panel.layers.set(1);
    satellite.add(panel);

    satellite.position.set(0, 5, 200);
    satellite.rotation.y = Math.PI; // FLIP 180 DEGREES
    satellite.visible = false;
    scene.add(satellite);
}

function createRealEarth() {
    // LIGHTS (Layer 2 Only)
    const earthSun = new THREE.DirectionalLight(0xffffff, 3.5);
    earthSun.position.set(-50, 10, 50);
    earthSun.layers.set(2);

    earth = new THREE.Group();
    earth.add(earthSun);

    const textures = generateEarthTextures();

    const material = new THREE.MeshStandardMaterial({
        map: textures.color,
        roughnessMap: textures.roughness,
        metalnessMap: textures.metalness,
        normalMap: textures.normal,
        emissive: 0x000000
    });

    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(20, 64, 64), material);
    earthMesh.layers.set(2);
    earth.add(earthMesh);

    // Cloud
    const cCan = document.createElement('canvas'); cCan.width = 512; cCan.height = 256;
    const cCtx = cCan.getContext('2d');
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512, y = Math.random() * 256, r = Math.random() * 30 + 10;
        const g = cCtx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        cCtx.fillStyle = g; cCtx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const cTex = new THREE.CanvasTexture(cCan);

    const clouds = new THREE.Mesh(new THREE.SphereGeometry(20.3, 64, 64), new THREE.MeshStandardMaterial({ map: cTex, transparent: true, opacity: 0.8, side: THREE.FrontSide }));
    clouds.layers.set(2);
    earth.add(clouds);

    // Atmosphere
    const atmoMat = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vN; void main() { float i = pow(0.6 - dot(vN, vec3(0,0,1)), 4.0); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * i; }`,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(21.5, 32, 32), atmoMat);
    atmo.layers.set(2);
    earth.add(atmo);

    earth.position.set(0, -35, 260);
    earth.visible = false;
    scene.add(earth);
}

function generateEarthTextures() {
    const w = 512, h = 256;
    const can = document.createElement('canvas'); can.width = w; can.height = h;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#051040'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * w, y = Math.random() * h * 0.8 + h * 0.1, r = Math.random() * 40 + 10;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `hsl(${100 + Math.random() * 40},60%,30%)`; ctx.fill();
    }
    const color = new THREE.CanvasTexture(can);

    const data = ctx.getImageData(0, 0, w, h).data;
    const rData = new Uint8Array(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
        const isWater = data[i + 2] > data[i + 1];
        const v = isWater ? 50 : 200;
        rData[i] = v; rData[i + 1] = v; rData[i + 2] = v; rData[i + 3] = 255;
    }
    const rough = new THREE.DataTexture(rData, w, h, THREE.RGBAFormat); rough.needsUpdate = true;
    return { color: color, roughness: rough, metalness: rough, normal: rough };
}

function createPhotons() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(6000 * 3); // More photons
    for (let i = 0; i < 6000; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = Math.random() * 500;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: 0x00aaff,
        size: 0.8,
        transparent: true,
        opacity: 0,
        map: createGlowTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    photons = new THREE.Points(geo, mat);
    scene.add(photons);
}

function createDataBeam() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(1500); // 500 points
    // Create a long cylinder of points
    for (let i = 0; i < 1500; i += 3) {
        const r = Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 2;
        pos[i] = r * Math.cos(theta); // X (Width)
        pos[i + 1] = r * Math.sin(theta); // Y (Width)
        pos[i + 2] = Math.random() * 100; // Z (Length) - Beam length
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Shift geometry center to start from origin (0,0,0) and go negative Z
    geo.translate(0, 0, -50); // Shift so 0 is start

    const mat = new THREE.PointsMaterial({
        color: 0x00ff44,
        size: 1.5,
        transparent: true,
        map: createGlowTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8
    });

    beam = new THREE.Points(geo, mat);
    // Position at Satellite (0, 5, 200)
    beam.position.set(0, 5, 200);
    // Look at Earth (0, -35, 260)
    beam.lookAt(0, -35, 260);

    beam.visible = false;
    scene.add(beam); // Add to SCENE, not Satellite
}

// --- HYBRID TIMELINE (OG Logic + Master Parts) ---
function setupHybridTimeline() {
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5
        }
    });

    // 1. SCALE (Already at 0,60,80) -> ALIGNMENT (0,0,80)
    tl.to("#step-scale .content-block", { opacity: 0, duration: 1 })
        .to(camera.position, { x: 0, y: 0, z: 80, duration: 5, ease: "power2.inOut", onUpdate: () => camera.lookAt(0, 0, 0) }, "start")
        .to("#step-alignment .content-block", { opacity: 1, duration: 1 }, "-=1")
        .to("#step-alignment .content-block", { opacity: 0, duration: 1 }, "+=2");

    // 2. SHADOW (Transit) - Zero in
    tl.to(orbitState, { angle: Math.PI / 2, duration: 4, ease: "power1.inOut", onUpdate: updateOrbit }, "transit") // Rotate to front
        .to(camera.position, { z: 35, duration: 4, ease: "power2.inOut" }, "transit") // Zoom
        .call(() => audio.playBlip()) // Audio Cue
        .to("#step-shadow .content-block", { opacity: 1, duration: 1 })
        .to("#step-shadow .content-block", { opacity: 0, duration: 1 }, "+=2");

    // 3. SIGNAL (Voyage) - Pull Back
    tl.to(photons.material, { opacity: 1, duration: 1 }) // Show photons
        .to(camera.position, { z: 250, duration: 5, ease: "power1.in" }, "pullback")
        .to("#step-signal .content-block", { opacity: 1, duration: 1 }, "-=2")
        .to("#step-signal .content-block", { opacity: 0, duration: 1 }, "+=1");

    // 4. SENTINEL (Satellite Reveal) - From Master Plan
    tl.call(() => { satellite.visible = true; })
        .to(satellite.position, { z: 200 }, 0) // Ensure pos
        .to(camera.position, { x: 30, y: 5, z: 220, duration: 3, onUpdate: () => camera.lookAt(0, 5, 200) }) // Side view of Sat
        .to("#step-sentinel .content-block", { opacity: 1, duration: 1 })
        .to("#step-sentinel .content-block", { opacity: 0, duration: 1 }, "+=2");

    // 5. UPLINK (Earth Reveal) - From Master Plan
    tl.call(() => { earth.visible = true; if (beam) beam.visible = true; audio.playScan(); })
        .to(camera.position, { x: 0, y: 0, z: 320, duration: 3, onUpdate: () => camera.lookAt(0, 0, 0) }) // Behind Sat looking at Star
        .to(satellite.rotation, { x: Math.PI, duration: 2 }, "<") // Rotate Antenna
        .to("#step-uplink .content-block", { opacity: 1, duration: 1 }, "-=1")
        .to("#step-uplink .content-block", { opacity: 0, duration: 1 }, "+=2");

    // 6. DISCOVERY (Dashboard) - From Snippet
    tl.to("#step-discovery .dashboard-overlay", { opacity: 1, duration: 1 })
        .call(() => audio.playSuccess())
        .to(orbitState, {
            angle: Math.PI * 6, duration: 10, ease: "none", onUpdate: () => {
                updateOrbit();
                updateGraph(orbitState.angle);
            }
        }, "<");
}

function updateOrbit() {
    if (planetGroup) {
        planetGroup.position.x = orbitRadius * Math.cos(orbitState.angle);
        planetGroup.position.z = orbitRadius * Math.sin(orbitState.angle);
    }
}

function updateGraph(angle) {
    const curve = document.getElementById('curve-path');
    if (!curve) return;
    let d = "M0,50 ";
    const width = 800;
    for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const phase = angle - (1 - t) * 20;
        const normPhase = (phase - Math.PI / 2) % (Math.PI * 2);
        let dist = Math.min(Math.abs(normPhase), Math.abs(normPhase - Math.PI * 2));
        if (phase < 0) dist = 99;
        let dip = 0;
        if (dist < 0.25) dip = 100 * Math.exp(-(dist * dist) / 0.015);
        d += `L${t * width},${50 + dip} `;
    }
    curve.setAttribute('d', d);
}

function setupInteraction() {
    let isDragging = false, prev = { x: 0, y: 0 };
    window.addEventListener('mousedown', e => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', e => {
        if (isDragging) {
            scene.rotation.y += (e.clientX - prev.x) * 0.002;
            scene.rotation.x += (e.clientY - prev.y) * 0.002;
            prev = { x: e.clientX, y: e.clientY };
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (window.sunUniforms) window.sunUniforms.time.value = t;
    if (window.alienUniforms) window.alienUniforms.time.value = t;
    if (earthUniforms) earthUniforms.time.value = t;
    if (satellite) satellite.rotation.z += 0.002;
    if (earth) earth.rotation.y += 0.001;

    // Animate Photons (Flyby)
    if (photons && photons.visible) {
        const pos = photons.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let z = pos.getZ(i);
            z += 0.5;
            if (z > 500) z = 0;
            pos.setZ(i, z);
        }
        pos.needsUpdate = true;
    }
    renderer.render(scene, camera);
}
