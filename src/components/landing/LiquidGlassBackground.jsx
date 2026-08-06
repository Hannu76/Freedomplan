import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const NUM_NODES = 64; // High-density physics backbone nodes along structural length

const vertexShader = `
varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vTangentX;
varying vec3 vTangentY;
uniform float uTime;
uniform vec3 uMousePos;
uniform float uMouseForce;

// Card Collision Data: vec4(centerX, centerY, width, height) in local mesh space
uniform vec4 uCardBoxes[4];
uniform int uCardCount;
uniform float uCollisionForce;

// Persistent Spring-Mass Cloth State Buffer: vec4(offsetZ, memory, 0, 0) for each backbone node
uniform vec4 uClothNodes[64];

// Sample physics buffer linearly along ribbon length (-17.5 to +17.5)
vec2 sampleClothPhysics(float posX) {
    float normX = clamp((posX + 17.5) / 35.0, 0.0, 1.0);
    float indexF = normX * 63.0;
    int idx0 = int(floor(indexF));
    int idx1 = min(idx0 + 1, 63);
    float frac = fract(indexF);
    
    vec4 n0 = vec4(0.0);
    vec4 n1 = vec4(0.0);
    
    // Unroll array lookup safely
    for (int i = 0; i < 64; i++) {
        if (i == idx0) n0 = uClothNodes[i];
        if (i == idx1) n1 = uClothNodes[i];
    }
    
    vec4 interpolated = mix(n0, n1, frac);
    return vec2(interpolated.x, interpolated.y); // (offsetZ, shapeMemory)
}

// Master deformation function holding solid structure intact + persistent cloth simulation
vec3 deform(vec3 p, float t) {
    vec3 p1 = p;
    // 1. Structural Macro Z-Wave (Up/Down)
    p1.z += sin(p1.x * 0.4 - t) * 3.5;
    // 2. Structural Macro Y-Wave (Left/Right)
    p1.y += sin(p1.x * 0.3 - t * 0.8) * 1.5;
    
    // 3. Constant-thickness 3D twist 
    float twist = cos(p1.x * 0.25 - t * 0.5) * 0.6;
    float ty = p1.y * cos(twist) - p1.z * sin(twist);
    float tz = p1.y * sin(twist) + p1.z * cos(twist);
    
    // 4. Physical Soft-Body Mouse Deformation
    float dist = distance(vec3(p1.x, ty, tz), uMousePos);
    float pushForce = exp(-dist * dist * 0.08) * uMouseForce;
    tz -= pushForce * 4.0;

    // 5. PERSISTENT SPRING-MASS CLOTH SIMULATION & SHAPE MEMORY
    vec2 clothData = sampleClothPhysics(p1.x);
    float clothOffsetZ = clothData.x;
    
    // Y-axis Gaussian profile feathering across ribbon width
    float featherY = 1.0;
    if (uCardCount > 0) {
        vec4 card = uCardBoxes[0];
        float dy = ty - card.y;
        featherY = exp(-pow(dy / (card.w * 0.5 + 1.2), 2.0) * 1.6);
    }
    
    tz += clothOffsetZ * featherY * uCollisionForce;

    return vec3(p1.x, ty, tz);
}

void main() {
    float t = uTime * 0.15;
    vUv = uv;
    vObjPos = position; // Raw undeformed object space
    
    // Build intrinsic tangent space over arbitrary un-deformed 3D volume surfaces
    vec3 t1 = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
    if (length(t1) < 0.1) t1 = normalize(cross(normal, vec3(1.0, 0.0, 0.0)));
    vec3 t2 = normalize(cross(normal, t1));
    
    // Apply volumetric Jacobian differentiation to capture TRUE deformed normals on side-walls & bevels
    float e = 0.01;
    vec3 p0 = deform(position, t);
    vec3 p1 = deform(position + t1 * e, t);
    vec3 p2 = deform(position + t2 * e, t);
    
    vec3 defTangent = normalize(p1 - p0);
    vec3 defBitangent = normalize(p2 - p0);
    vec3 defNormal = normalize(cross(defTangent, defBitangent));
    
    vec4 mvPos = modelViewMatrix * vec4(p0, 1.0);
    gl_Position = projectionMatrix * mvPos;
    
    vViewPos = -mvPos.xyz;
    
    // Export pristine vectors to pixel shader
    vNormal = normalMatrix * defNormal;
    vTangentX = normalMatrix * defTangent;
    vTangentY = normalMatrix * defBitangent;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vTangentX;
varying vec3 vTangentY;
uniform float uTime;

void main() {
    float t = uTime * 0.3;
    
    vec3 macroNormal = normalize(vNormal);
    vec3 tx = normalize(vTangentX);
    vec3 ty = normalize(vTangentY);
    
    // Normalize object space variables back to 0..1 scale so textures don't alias (Moire effect)
    float nx = vObjPos.x / 35.0;
    float ny = (vObjPos.y + vObjPos.z) / 5.0; // Adding Z allows texture to naturally wrap vertical bevels
    
    float freqU = 180.0;
    float freqV = 40.0;
    float bumpScale = 0.5;
    
    float phase = nx * freqU + ny * freqV - t * 3.0;
    float weavePhase2 = nx * 100.0 - ny * 30.0 + t;
    
    // Analytic derivative slopes
    float dHdU = cos(phase) * freqU * 0.015 + cos(weavePhase2) * 100.0 * 0.005;
    float dHdV = cos(phase) * freqV * 0.015 - cos(weavePhase2) * 30.0 * 0.005;
    
    // Micro-displacement Normal bump
    vec3 bumpedNormal = normalize(macroNormal - (tx * dHdU * bumpScale) - (ty * dHdV * bumpScale));
    
    vec3 viewDir = normalize(vViewPos);
    float f = 1.0 - max(dot(bumpedNormal, viewDir), 0.0);
    float fresnel = pow(f, 3.0);
    
    // Foundation is rich deep black
    vec3 baseColor = vec3(0.005);
    
    // Ultra sharp front structural highlights
    vec3 lightDir1 = normalize(vec3(1.0, 1.5, 2.0));
    vec3 halfVector1 = normalize(lightDir1 + viewDir);
    float specular1 = pow(max(dot(bumpedNormal, halfVector1), 0.0), 120.0) * 2.5;
    
    // Soft side-wall fill light
    vec3 lightDir2 = normalize(vec3(-1.0, -1.0, 1.0));
    vec3 halfVector2 = normalize(lightDir2 + viewDir);
    float specular2 = pow(max(dot(bumpedNormal, halfVector2), 0.0), 60.0) * 1.5;
    
    // Ambient mid-tone gloss spread
    float specSpread = pow(max(dot(bumpedNormal, halfVector1), 0.0), 18.0) * 0.2;
    
    // Continuous sharp environmental reflection on all facing angles
    float envMap = smoothstep(0.3, 1.0, fresnel);
    vec3 envReflection = vec3(1.0) * envMap * 0.8;
    
    vec3 finalColor = baseColor + vec3(specular1 + specular2 + specSpread) + envReflection;
    finalColor = mix(finalColor, vec3(0.0), 0.05); 
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function LiquidGlassBackground() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // SCENE SETUP
        const scene = new THREE.Scene();

        // CAMERA SETUP
        const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 12;
        camera.position.y = 0;
        camera.lookAt(0, 0, 0);

        // RENDERER SETUP
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);

        // ==========================================
        // GEOMETRY GENERATION
        // 3D Solid Pill-Profile shape holding physical thickness and rounded bevels
        // ==========================================
        const length = 35;
        const width = 5.0;
        const thickness = 0.4;
        const radius = 0.19;

        const shape = new THREE.Shape();
        const x = -width / 2, y = -thickness / 2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + width - radius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + radius);
        shape.lineTo(x + width, y + thickness - radius);
        shape.quadraticCurveTo(x + width, y + thickness, x + width - radius, y + thickness);
        shape.lineTo(x + radius, y + thickness);
        shape.quadraticCurveTo(x, y + thickness, x, y + thickness - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);

        const extrudeSettings = {
            steps: 400, // HD vertices across length
            depth: length,
            bevelEnabled: false,
            curveSegments: 8
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);
        geometry.rotateX(Math.PI / 2);

        // Persistent Spring-Mass Cloth State Buffer (64 Physics Backbone Nodes)
        const physicsNodes = Array.from({ length: NUM_NODES }, (_, i) => ({
            x: -17.5 + (i / (NUM_NODES - 1)) * 35.0,
            offsetZ: 0.0,
            velocityZ: 0.0,
            targetZ: 0.0,
            memory: 0.0 // Shape memory decay factor (0 to 1)
        }));

        const clothNodesUniform = Array.from({ length: NUM_NODES }, () => new THREE.Vector4(0, 0, 0, 0));
        const cardBoxesUniform = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uMousePos: { value: new THREE.Vector3(0, 0, 0) },
                uMouseForce: { value: 0.0 },
                uCardBoxes: { value: cardBoxesUniform },
                uCardCount: { value: 0 },
                uCollisionForce: { value: 1.0 },
                uClothNodes: { value: clothNodesUniform }
            },
            wireframe: false,
            transparent: true,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = -Math.PI / 4.5;
        mesh.position.set(6.5, 0, 0);
        scene.add(mesh);

        // Mouse interaction logic
        let targetForce = 0.0;
        let currentForce = 0.0;
        const targetMouseWorld = new THREE.Vector3(0, 0, 0);
        const currentMouseWorld = new THREE.Vector3(0, 0, 0);

        const handleMouseMove = (e) => {
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = -(e.clientY / window.innerHeight) * 2 + 1;

            if (nx < 0.1) {
                targetForce = 0.0;
            } else {
                targetForce = 1.0;
                const vec = new THREE.Vector3(nx, ny, 0.5);
                vec.unproject(camera);
                vec.sub(camera.position).normalize();
                const distance = -camera.position.z / vec.z;
                const worldPos = new THREE.Vector3().copy(camera.position).add(vec.multiplyScalar(distance));
                mesh.worldToLocal(worldPos);
                targetMouseWorld.copy(worldPos);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', () => { targetForce = 0.0; });

        // Helper: Convert DOM screen bounding rect to mesh local coordinate space
        const domRectToMeshLocal = (rect) => {
            const cxScreen = rect.left + rect.width / 2;
            const cyScreen = rect.top + rect.height / 2;
            const ndcX = (cxScreen / window.innerWidth) * 2 - 1;
            const ndcY = -(cyScreen / window.innerHeight) * 2 + 1;

            const vecCenter = new THREE.Vector3(ndcX, ndcY, 0.5);
            vecCenter.unproject(camera);
            vecCenter.sub(camera.position).normalize();
            const distCenter = -camera.position.z / vecCenter.z;
            const worldCenter = new THREE.Vector3().copy(camera.position).add(vecCenter.multiplyScalar(distCenter));
            mesh.worldToLocal(worldCenter);

            const rightScreen = rect.left + rect.width;
            const bottomScreen = rect.top + rect.height;
            const ndcRight = (rightScreen / window.innerWidth) * 2 - 1;
            const ndcBottom = -(bottomScreen / window.innerHeight) * 2 + 1;

            const vecEdge = new THREE.Vector3(ndcRight, ndcBottom, 0.5);
            vecEdge.unproject(camera);
            vecEdge.sub(camera.position).normalize();
            const distEdge = -camera.position.z / vecEdge.z;
            const worldEdge = new THREE.Vector3().copy(camera.position).add(vecEdge.multiplyScalar(distEdge));
            mesh.worldToLocal(worldEdge);

            const localW = Math.max(1.0, Math.abs((worldEdge.x - worldCenter.x) * 2.0));
            const localH = Math.max(1.0, Math.abs((worldEdge.y - worldCenter.y) * 2.0));

            return new THREE.Vector4(worldCenter.x, worldCenter.y, localW, localH);
        };

        // RENDER & PHYSICS SIMULATION LOOP
        let animationFrameId;
        const clock = new THREE.Clock();

        const render = () => {
            const elapsedTime = clock.getElapsedTime();
            const dt = Math.min(clock.getDelta(), 0.033); // Clamp delta time to 30-60 FPS window
            material.uniforms.uTime.value = elapsedTime;

            // Fluid Spring/Damping applied to mouse interaction
            currentForce += (targetForce - currentForce) * 0.04;
            currentMouseWorld.lerp(targetMouseWorld, 0.06);
            material.uniforms.uMouseForce.value = currentForce;
            material.uniforms.uMousePos.value.copy(currentMouseWorld);

            // Sample DOM feature cards
            const cardElements = document.querySelectorAll('.feature-card-container');
            const count = Math.min(cardElements.length, 4);
            material.uniforms.uCardCount.value = count;

            for (let i = 0; i < count; i++) {
                const rect = cardElements[i].getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const box = domRectToMeshLocal(rect);
                    material.uniforms.uCardBoxes.value[i].copy(box);
                }
            }

            // ========================================================
            // PERSISTENT SPRING-MASS CLOTH SIMULATION & SHAPE RECOVERY
            // ========================================================
            const activeCard = count > 0 ? cardBoxesUniform[0] : null;

            for (let i = 0; i < NUM_NODES; i++) {
                const node = physicsNodes[i];
                let nodeTargetZ = 0.0;

                if (activeCard && activeCard.z > 0) {
                    const cardX = activeCard.x;
                    const cardW = activeCard.z;
                    const halfW = cardW * 0.5;
                    const minX = cardX - halfW - 2.5; // Approach zone
                    const maxX = cardX + halfW;       // Exit edge
                    const dx = node.x - cardX;

                    if (node.x >= minX && node.x <= maxX) {
                        // ZONE 1 & 2: TOUCHING/CONFORMING TO CARD
                        const normX = dx / halfW;
                        if (normX < -1.0) {
                            // Front edge steep climb/wrap
                            const climbProgress = (node.x - minX) / (-halfW - (minX - cardX));
                            nodeTargetZ = Math.pow(Math.max(0, climbProgress), 1.8) * 2.6;
                        } else {
                            // Top surface resting with gravity sag
                            const sag = Math.cos(normX * 1.57) * 0.35;
                            nodeTargetZ = 2.6 - sag;
                        }
                        // Charge shape memory to 100% while touching card
                        node.memory = 1.0;
                    } else if (node.x > maxX) {
                        // ZONE 3: TRAILING SHAPE MEMORY & RECOVERY PHASE (100% -> 90% -> 80% -> ... -> 0%)
                        const trailingDist = node.x - maxX;
                        
                        // Frame-rate independent exponential memory decay
                        node.memory *= Math.pow(0.93, dt * 60);
                        
                        // Lingering card deformation offset + fabric trailing ripple
                        const trailingRipple = Math.sin(trailingDist * 1.5 - elapsedTime * 3.0) * 0.25 * node.memory;
                        nodeTargetZ = (2.6 * node.memory) + trailingRipple;
                    } else {
                        // Normal un-deformed ribbon ahead of card
                        node.memory *= Math.pow(0.90, dt * 60);
                        nodeTargetZ = 0.0;
                    }
                } else {
                    node.memory *= Math.pow(0.90, dt * 60);
                    nodeTargetZ = 0.0;
                }

                node.targetZ = nodeTargetZ;

                // Virtual Hooke's Law Spring Constraints between adjacent backbone nodes
                let springForce = 0.0;
                if (i > 0) springForce += (physicsNodes[i - 1].offsetZ - node.offsetZ);
                if (i < NUM_NODES - 1) springForce += (physicsNodes[i + 1].offsetZ - node.offsetZ);
                springForce *= 18.0; // Spring stiffness constant

                // Restoring spring force towards target + gravity settling
                const restoringForce = (node.targetZ - node.offsetZ) * 28.0;
                const totalForce = restoringForce + springForce;

                // Verlet / Velocity Integration with viscous cloth damping
                node.velocityZ += totalForce * dt;
                node.velocityZ *= 0.88; // Damping (prevents infinite oscillation)
                node.offsetZ += node.velocityZ * dt;

                // Update GPU physics state buffer uniform: vec4(offsetZ, memory, 0, 0)
                material.uniforms.uClothNodes.value[i].set(node.offsetZ, node.memory, 0, 0);
            }

            // Floating organic static camera drift
            camera.position.x = Math.sin(elapsedTime * 0.1) * 0.2;
            camera.position.y = Math.cos(elapsedTime * 0.1) * 0.1;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        // RESIZE HANDLER
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
        />
    );
}

