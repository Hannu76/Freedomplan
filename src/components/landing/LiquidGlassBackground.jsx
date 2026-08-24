import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const NUM_NODES = 64;

const vertexShader = `
varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vViewPos;
varying vec3 vNormal;
uniform float uTime;
uniform float uIsMobile;
uniform vec3 uMousePos;
uniform float uMouseForce;
uniform vec4 uCardBoxes[4];
uniform int uCardCount;
uniform float uCollisionForce;
uniform vec4 uClothNodes[64];

vec2 sampleClothPhysics(float posX) {
    float normX = clamp((posX + 14.0) / 28.0, 0.0, 1.0);
    float indexF = normX * 63.0;
    int idx0 = int(floor(indexF)); int idx1 = min(idx0 + 1, 63);
    vec4 n0 = vec4(0.0); vec4 n1 = vec4(0.0);
    for (int i = 0; i < 64; i++) {
        if (i == idx0) n0 = uClothNodes[i];
        if (i == idx1) n1 = uClothNodes[i];
    }
    return vec2(mix(n0, n1, fract(indexF)).x, mix(n0, n1, fract(indexF)).y);
}

vec3 deform(vec3 p, float t) {
    float u = clamp((p.x + 14.0) / 28.0, 0.0, 1.0); // 0.0 to 1.0 along the localized ribbon
    
    // Natural fabric width variation
    float widthProfile = 1.0 + 0.08 * sin(u * 3.1415 * 1.5 + t * 0.6);
    float ty = p.y * widthProfile;
    
    // Fabric moving waves
    float wave1 = sin(u * 3.1415 * 1.8 + t * 1.2);
    float wave2 = sin(u * 3.1415 * 3.5 - t * 0.8) * 0.18;
    float wave3 = sin(u * 3.1415 * 6.0 + t * 1.5) * 0.08;
    float fabricWave = wave1 * 0.35 + wave2 * 0.40 + wave3 * 0.20;
    
    // Gradual physical downward fall
    float fall = pow(u, 1.45) * 6.5; 
    
    ty -= fall;
    ty += fabricWave * 0.8;
    float tz = p.z + fabricWave * 2.2;
    
    // Macro curvature belly
    tz += sin(u * 3.1415) * 2.5; 
    
    // Embedded card/mouse collision logic
    float dist = distance(vec3(p.x, ty, tz), uMousePos);
    tz -= exp(-dist * dist * 0.08) * uMouseForce * 3.0;
    
    float featherY = 1.0;
    if (uCardCount > 0) {
        featherY = exp(-pow((ty - uCardBoxes[0].y) / (uCardBoxes[0].w * 0.5 + 1.2), 2.0) * 1.6);
    }
    tz += sampleClothPhysics(p.x).x * featherY * uCollisionForce;

    return vec3(p.x, ty, tz);
}

void main() {
    float t = uTime * 0.6;
    float animTime = uIsMobile > 0.5 ? 0.0 : t;
    
    vUv = uv;
    vObjPos = position;
    
    float e = 0.05;
    vec3 p0 = deform(position, animTime);
    vec3 p1 = deform(position + vec3(1.0, 0.0, 0.0) * e, animTime);
    vec3 p2 = deform(position + vec3(0.0, 1.0, 0.0) * e, animTime);
    
    vec3 defNormal = normalize(cross(normalize(p1 - p0), normalize(p2 - p0)));
    
    vec4 mvPos = modelViewMatrix * vec4(p0, 1.0);
    gl_Position = projectionMatrix * mvPos;
    
    vViewPos = -mvPos.xyz;
    vNormal = normalMatrix * defNormal;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vViewPos;
varying vec3 vNormal;
uniform sampler2D uFlagTexture;

vec3 srgbToLinear(vec3 color) { return pow(color, vec3(2.2)); }
vec3 linearToSrgb(vec3 color) { return pow(color, vec3(1.0 / 2.2)); }

void main() {
    // Perfectly native bounded PlaneGeometry UVs
    vec4 texColor = texture2D(uFlagTexture, vUv);
    
    vec3 albedo = srgbToLinear(texColor.rgb);
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPos);
    
    // SOFT SATIN FABRIC LIGHTING
    vec3 lightDir1 = normalize(vec3(0.5, 1.0, 2.0));
    vec3 lightDir2 = normalize(vec3(-0.8, -0.4, 1.0));
    
    float diff1 = smoothstep(-0.25, 1.0, dot(normal, lightDir1));
    float diff2 = smoothstep(-0.15, 1.0, dot(normal, lightDir2));
    
    // Matte Premium Specular (Restrained to defeat white-fog blowouts)
    vec3 halfVec1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfVec1), 0.0), 22.0) * 0.15;
    
    float depthOcclusion = clamp((vObjPos.z + 3.0) / 6.0, 0.8, 1.0);
    vec3 ambient = albedo * 1.5 * depthOcclusion; 
    
    vec3 diffuse = albedo * diff1 * 1.4 + albedo * diff2 * 0.6;
    vec3 finalColor = ambient + diffuse;
    finalColor += vec3(1.0, 0.98, 0.96) * spec1;
    
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    gl_FragColor = vec4(linearToSrgb(finalColor), 1.0);
}
`;

export default function LiquidGlassBackground() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // SCENE & CAMERA SETUP
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 16;
        camera.lookAt(0, 0, 0);

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);

        // BOUNDED 3D FABRIC MESH (Strictly restricted footprint preventing full-screen overflow errors)
        const ribbonWidth = 28.0;
        const ribbonHeight = 6.0;
        // High density vertex mesh ensures smooth wave deformations without jaggy edges
        const geometry = new THREE.PlaneGeometry(ribbonWidth, ribbonHeight, 140, 70);

        // STATE BUFFERS
        const physicsNodes = Array.from({ length: NUM_NODES }, (_, i) => ({
            x: -14.0 + (i / (NUM_NODES - 1)) * 28.0,
            offsetZ: 0.0,
            velocityZ: 0.0,
            targetZ: 0.0,
            memory: 0.0
        }));

        const clothNodesUniform = Array.from({ length: NUM_NODES }, () => new THREE.Vector4(0, 0, 0, 0));
        const cardBoxesUniform = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));

        // TEXTURE
        const textureLoader = new THREE.TextureLoader();
        const flagTexture = textureLoader.load('/images/union-jack-texture.png');
        flagTexture.anisotropy = renderer.capabilities?.getMaxAnisotropy?.() || 1;
        flagTexture.minFilter = THREE.LinearMipmapLinearFilter;
        flagTexture.magFilter = THREE.LinearFilter;
        flagTexture.wrapS = THREE.ClampToEdgeWrapping;
        flagTexture.wrapT = THREE.ClampToEdgeWrapping;

        // SAFE SHADER MATERIAL
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uIsMobile: { value: window.innerWidth < 768 ? 1.0 : 0.0 },
                uMousePos: { value: new THREE.Vector3(0, 0, 0) },
                uMouseForce: { value: 0.0 },
                uCardBoxes: { value: cardBoxesUniform },
                uCardCount: { value: 0 },
                uCollisionForce: { value: 1.0 },
                uClothNodes: { value: clothNodesUniform },
                uFlagTexture: { value: flagTexture }
            },
            transparent: false, // Forces completely solid, opaque rendering preventing white background bleed
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Correct physical drape angle ensuring the flag falls cleanly with gravity
        mesh.rotation.z = -0.15;
        mesh.rotation.y = 0.15;
        mesh.rotation.x = 0.05;
        scene.add(mesh);

        // RESPONSIVE LAYOUT BASE COORDINATES
        const layoutAnchor = { x: 8.5, y: 3.5 };

        const updateResponsiveLayout = () => {
            const w = window.innerWidth;
            material.uniforms.uIsMobile.value = w < 768 ? 1.0 : 0.0;

            if (w < 768) {
                layoutAnchor.x = 2.0; layoutAnchor.y = 5.0;
                mesh.scale.set(0.65, 0.65, 0.65);
            } else if (w < 1024) {
                layoutAnchor.x = 5.0; layoutAnchor.y = 4.0;
                mesh.scale.set(0.9, 0.9, 0.9);
            } else {
                // Desktop: Shifted right so it explicitly lives in the right 80%, guaranteeing 0vw safe text area
                layoutAnchor.x = 8.5; layoutAnchor.y = 3.5;
                mesh.scale.set(1.1, 1.1, 1.1);
            }
            mesh.position.set(layoutAnchor.x, layoutAnchor.y, -2.0);
        };
        updateResponsiveLayout();

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

        let animationFrameId;
        const clock = new THREE.Clock();

        const render = () => {
            const elapsedTime = clock.getElapsedTime();
            const dt = Math.min(clock.getDelta(), 0.033);

            material.uniforms.uTime.value = elapsedTime;
            material.uniforms.uMouseForce.value = currentForce;
            material.uniforms.uMousePos.value.copy(currentMouseWorld);

            currentForce += (targetForce - currentForce) * 0.04;
            currentMouseWorld.lerp(targetMouseWorld, 0.06);

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

            const activeCard = count > 0 ? cardBoxesUniform[0] : null;
            for (let i = 0; i < NUM_NODES; i++) {
                const node = physicsNodes[i];
                let nodeTargetZ = 0.0;

                if (activeCard && activeCard.z > 0) {
                    const cardX = activeCard.x;
                    const cardW = activeCard.z;
                    const halfW = cardW * 0.5;
                    const minX = cardX - halfW - 2.5;
                    const maxX = cardX + halfW;
                    const dx = node.x - cardX;

                    if (node.x >= minX && node.x <= maxX) {
                        const normX = dx / halfW;
                        if (normX < -1.0) {
                            const climbProgress = (node.x - minX) / (-halfW - (minX - cardX));
                            nodeTargetZ = Math.pow(Math.max(0, climbProgress), 1.8) * 2.6;
                        } else {
                            const sag = Math.cos(normX * 1.57) * 0.35;
                            nodeTargetZ = 2.6 - sag;
                        }
                        node.memory = 1.0;
                    } else if (node.x > maxX) {
                        const trailingDist = node.x - maxX;
                        node.memory *= Math.pow(0.93, dt * 60);
                        const trailingRipple = Math.sin(trailingDist * 1.5 - elapsedTime * 3.0) * 0.25 * node.memory;
                        nodeTargetZ = (2.6 * node.memory) + trailingRipple;
                    } else {
                        node.memory *= Math.pow(0.90, dt * 60);
                        nodeTargetZ = 0.0;
                    }
                } else {
                    node.memory *= Math.pow(0.90, dt * 60);
                    nodeTargetZ = 0.0;
                }

                node.targetZ = nodeTargetZ;

                let springForce = 0.0;
                if (i > 0) springForce += (physicsNodes[i - 1].offsetZ - node.offsetZ);
                if (i < NUM_NODES - 1) springForce += (physicsNodes[i + 1].offsetZ - node.offsetZ);
                springForce *= 18.0;

                const restoringForce = (node.targetZ - node.offsetZ) * 28.0;
                const totalForce = restoringForce + springForce;

                node.velocityZ += totalForce * dt;
                node.velocityZ *= 0.88;
                node.offsetZ += node.velocityZ * dt;

                material.uniforms.uClothNodes.value[i].set(node.offsetZ, node.memory, 0, 0);
            }

            camera.position.x = Math.sin(elapsedTime * 0.1) * 0.2;
            camera.position.y = Math.cos(elapsedTime * 0.1) * 0.1;
            camera.lookAt(0, 0, 0);

            // The continuous falling animation is fully handled inside the shader's travelling waves phase.
            // We strictly anchor the base transform horizontally so the geometry behaves natively without sliding rigidly.
            mesh.position.x = layoutAnchor.x;
            mesh.position.y = layoutAnchor.y;

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            updateResponsiveLayout();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0" />;
}
