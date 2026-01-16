// --- 1. Global Error Handling ---
window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = `ERROR: ${message} at ${source}:${lineno}`;
    console.error(errorMsg);
    const logEl = document.getElementById('error-log');
    if (logEl) logEl.innerHTML += `<br>${errorMsg}`;
};

// --- Initialization ---
window.addEventListener('load', () => {
    try {
        init();
    } catch (e) {
        console.error(e);
        document.getElementById('error-log').innerHTML = "INIT ERROR: " + e.message;
    }
});

let scene, camera, renderer, sun, planetGroup, planet, alien, photons, starfield, clock;

function init() {
    console.log("Initializing Extended Experience...");

    // Setup Three.js
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    // Initial: Top View (The Scale)
    camera.position.set(0, 60, 80);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Objects
    createSun();
    createPlanetAndAlien();
    createStarfield();
    createPhotons();

    // Loop
    clock = new THREE.Clock();
    animate();

    // Timeline
    setupExtendedTimeline();

    // Reveal
    gsap.to("#loader", {
        opacity: 0, duration: 1, onComplete: () => {
            document.getElementById('loader').style.display = 'none';
        }
    });

    window.addEventListener('resize', onWindowResize);
    setupInteraction();
}

function createSun() {
    // Custom Shader for Burning Sun
    const vShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        
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
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                        dot(p2,x2), dot(p3,x3) ) );
        }
        void main() {
            float noiseValue = snoise(vPosition * 0.2 + vec3(time * 0.5));
            vec3 finalColor = mix(color1, color2, noiseValue * 0.5 + 0.5);
            float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            gl_FragColor = vec4(finalColor + intensity * 0.8, 1.0);
        }
    `;

    const mat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0xffaa00) },
            color2: { value: new THREE.Color(0xff3300) }
        },
        vertexShader: vShader,
        fragmentShader: fShader
    });
    sun = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 64), mat);
    scene.add(sun);
    scene.add(new THREE.PointLight(0xffffff, 1.5, 300));
}

function createPlanetAndAlien() {
    planetOrbitGroup = new THREE.Group();
    scene.add(planetOrbitGroup);

    planetGroup = new THREE.Group();
    planetOrbitGroup.add(planetGroup);

    // Planet
    planet = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    planetGroup.add(planet);

    // Alien - Make it Brighter and Slightly Larger
    alien = new THREE.Group();
    if (THREE.CapsuleGeometry) {
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), // Larger body
            new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Glowing unlit green
        );
        body.position.y = 0.5; // On top of planet
        alien.add(body);

        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        eye.position.set(0, 0.7, 0.08);
        alien.add(eye);
    }
    planet.add(alien);
    alien.position.y = 0.4;
    alien.rotation.x = -0.3; // Angle towards camera

    // Initial Position (Wide Orbit)
    planetGroup.position.set(25, 0, 0);
}

function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(3000 * 3);
    for (let i = 0; i < 9000; i++) pos[i] = (Math.random() - 0.5) * 500;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starfield = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
    scene.add(starfield);
}

function createPhotons() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(100 * 3);
    for (let i = 0; i < 100 * 3; i++) {
        // Init with wide spread
        if (i % 3 === 2) pos[i] = Math.random() * 200; // Z
        else pos[i] = (Math.random() - 0.5) * 200; // X/Y
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    photons = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xffffdd,
        size: 0.4,
        opacity: 0,
        transparent: true,
        blending: THREE.AdditiveBlending
    }));
    scene.add(photons);
}

// --- 5-STAGE ANIMATION TIMELINE ---

const orbitState = { angle: 0 };
const orbitRadius = 25;

function setupExtendedTimeline() {
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5 // Smooth scrubbing
        }
    });

    // --- STAGE 1: THE SCALE (Start) ---
    // already at 0, 60, 80. Looking down.

    // --- STAGE 2: THE ALIGNMENT ---
    // Move Camera Down to Ecliptic (Y=0), keep distance.
    // Reveal Section 2 Text
    tl.to("#step-scale .content-block", { opacity: 0, duration: 1 })
        .to(camera.position, { x: 0, y: 0, z: 80, duration: 4, ease: "power2.inOut", onUpdate: lookAtSun }, "<")
        .to("#step-alignment .content-block", { opacity: 1, duration: 2 }, "-=2")
        .to("#step-alignment .content-block", { opacity: 0, duration: 1, delay: 2 }); // hold then hide

    // --- STAGE 3: THE SHADOW (TRANSIT) ---
    // Zoom In close. Rotate Orbit so planet crosses front.
    // Current Angle 0. Transit at PI/2.
    tl.to(orbitState, {
        angle: Math.PI / 2, // 90 deg = Front
        duration: 3,
        ease: "power1.inOut",
        onUpdate: updateOrbit
    }, "<")
        .to(camera.position, { z: 35, duration: 4, ease: "power2.inOut" }, "<") // Zoom in
        .to("#step-shadow .content-block", { opacity: 1, duration: 2 }, "-=1")
        .to("#step-shadow .content-block", { opacity: 0, duration: 1, delay: 2 });

    // --- STAGE 4: THE SIGNAL (LIGHT JOURNEY) ---
    // Pull Back fast.
    tl.to(camera.position, { z: 250, duration: 5, ease: "power1.in" }, "+=0.5")
        .to(photons.material, { opacity: 1.0, duration: 2 }, "<") // Show photons
        .to("#step-signal .content-block", { opacity: 1, duration: 2 }, "<")
        .to("#step-signal .content-block", { opacity: 0, duration: 1, delay: 2 });

    // --- STAGE 5: DISCOVERY (DASHBOARD) ---
    // Show Dashboard. Spin planet fast for graph.
    tl.to("#step-discovery .dashboard-overlay", { opacity: 1, duration: 2 })
        .to(orbitState, {
            angle: Math.PI * 6, // Spin multiple times
            duration: 10,
            ease: "none",
            onUpdate: () => {
                updateOrbit(); // visual
                updateGraph(orbitState.angle); // data
            }
        }, "<");
}

function lookAtSun() { camera.lookAt(0, 0, 0); }

function updateOrbit() {
    planetGroup.position.x = orbitRadius * Math.cos(orbitState.angle);
    planetGroup.position.z = orbitRadius * Math.sin(orbitState.angle);
}

function updateGraph(angle) {
    const curve = document.getElementById('curve-path');
    if (!curve) return;

    let d = "M0,50 ";
    const width = 800;

    // Draw Graph History
    for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        // Map t back in time. range 0..1 corresponds to recent history.
        const historyLen = 20; // 20 rads history
        const phase = angle - (1 - t) * historyLen;

        // Normalize phase relative to transit point (PI/2)
        const normPhase = (phase - Math.PI / 2) % (Math.PI * 2);

        // Dip logic
        let dist = Math.min(Math.abs(normPhase), Math.abs(normPhase - Math.PI * 2));
        if (phase < 0) dist = 99;

        let dip = 0;
        if (dist < 0.25) { // Narrow dip
            dip = 100 * Math.exp(-(dist * dist) / 0.015);
        }

        // Base Y = 50. Max Y = 150.
        const y = 50 + dip;
        d += `L${t * width},${y} `;
    }
    curve.setAttribute('d', d);
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (sun) {
        sun.material.uniforms.time.value = t;
        sun.rotation.y = t * 0.05;
    }
    // Photon Animation
    if (photons) {
        const pos = photons.geometry.attributes.position.array;
        for (let i = 0; i < 100; i++) {
            pos[i * 3 + 2] += 2.5; // Z speed
            if (pos[i * 3 + 2] > 200) {
                pos[i * 3 + 2] = 0; // Reset
                pos[i * 3] = (Math.random() - 0.5) * 20; // Tight beam check
                pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            }
        }
        photons.geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Drag Interaction
let isDragging = false, prev = { x: 0, y: 0 };
function setupInteraction() {
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
