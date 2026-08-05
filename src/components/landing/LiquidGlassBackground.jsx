import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

// Master deformation function holding the solid structure intact
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
    // Gaussian falloff for elegant, localized bending
    float pushForce = exp(-dist * dist * 0.08) * uMouseForce;
    
    // Push the ribbon into the screen (-Z) smoothly where the cursor interacts
    tz -= pushForce * 4.0;
    
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
    float ny = (vObjPos.y + vObjPos.z) / 5.0; // Adding Z allows texture to naturally wrap the vertical bevels
    
    float freqU = 180.0; // Reduced for thicker, cleaner ribs
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
    // Exponential curve pushes gloss only to the outer rim
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
    
    // Optional contrast enforcement
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
        camera.position.z = 12; // Pulled back significantly so wide structural folds fit
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
        const width = 5.0;     // Total ribbon width
        const thickness = 0.4; // Real physical depth wall
        const radius = 0.19;   // Premium soft rounded bevel avoiding sharp 90 corners

        const shape = new THREE.Shape();
        // Trace exact beveled pill profile facing down X-Y axis
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
            steps: 400, // HD vertices across structural length
            depth: length,
            bevelEnabled: false, // The profile is pre-beveled in the base shape!
            curveSegments: 8   // Resolution of the rounded edge
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Realign 3D extrude from default Z-axis layout to mapped X/Y/Z structural physics
        geometry.center(); // Bound center
        geometry.rotateY(Math.PI / 2); // Transfer structural length from Z to X
        geometry.rotateX(Math.PI / 2); // Transfer width face and depth to align physically towards viewer

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uMousePos: { value: new THREE.Vector3(0, 0, 0) },
                uMouseForce: { value: 0.0 }
            },
            wireframe: false,
            transparent: true, // required for opacity mapping if used
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Base Premium Composition: Start shifted right to never obstruct > 20% of hero text
        mesh.rotation.z = -Math.PI / 4.5;
        mesh.position.set(6.5, 0, 0); // Pushed heavily to the right per 75/25 balance requirement
        scene.add(mesh);

        // INTERACTIVE PHYSICAL SOFT-BODY LOGIC
        let mouseX = 0;
        let mouseY = 0;
        let targetForce = 0.0;
        let currentForce = 0.0;

        const targetMouseWorld = new THREE.Vector3(0, 0, 0);
        const currentMouseWorld = new THREE.Vector3(0, 0, 0);

        const handleMouseMove = (e) => {
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = -(e.clientY / window.innerHeight) * 2 + 1;

            mouseX = nx;
            mouseY = ny;

            // Safe Zone Logic: Protect the Hero Text (Left 45-50% of screen)
            if (nx < 0.1) {
                targetForce = 0.0; // Dissipate all deformation when near text
            } else {
                targetForce = 1.0; // Ribbon becomes responsive again

                // Raycast math to find where cursor hits the Z=0 plane
                const vec = new THREE.Vector3(nx, ny, 0.5);
                vec.unproject(camera);
                vec.sub(camera.position).normalize();
                const distance = -camera.position.z / vec.z;

                // Absolute world position
                const worldPos = new THREE.Vector3().copy(camera.position).add(vec.multiplyScalar(distance));

                // Convert to mesh's rotated local space to feed into the shader
                mesh.worldToLocal(worldPos);
                targetMouseWorld.copy(worldPos);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);

        const handleMouseLeave = () => { targetForce = 0.0; };
        window.addEventListener('mouseleave', handleMouseLeave);

        // RENDER LOOP
        let animationFrameId;
        const clock = new THREE.Clock();

        const render = () => {
            const elapsedTime = clock.getElapsedTime();
            material.uniforms.uTime.value = elapsedTime;

            // Fluid Spring/Damping applied to physical soft-body interaction
            currentForce += (targetForce - currentForce) * 0.04;
            currentMouseWorld.lerp(targetMouseWorld, 0.06);

            material.uniforms.uMouseForce.value = currentForce;
            material.uniforms.uMousePos.value.copy(currentMouseWorld);

            // Floating organic static camera drift (idle animation)
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
