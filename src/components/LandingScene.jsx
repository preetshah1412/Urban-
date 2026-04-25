import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

export default function LandingScene({ scrollProgress }) {
  const droneRef = useRef();
  const breathingRef = useRef();
  const tlRef = useRef();

  // Load the drone model
  const { scene } = useGLTF('/animated_drone_with_camera_free.glb');

  // Target propeller meshes for frame-rate independent rotation
  const propellers = useRef([]);
  useEffect(() => {
    const props = [];
    scene.traverse((child) => {
      // 1. Forced Debugging & Mesh Identification
      // Uncomment to inspect all nodes if the fans fail to spin:
      // console.log("DRONE_NODE:", child.name);

      const name = child.name.toLowerCase();

      // 2. Manual Override for this specific animated_drone model
      const isManualTarget = ['prop_1_jnt', 'prop_2_jnt', 'prop_3_jnt', 'prop_4_jnt'].some(n => name.includes(n));
      const isGenericTarget = name.includes('propeller') || name.includes('fan') || name.includes('blade') || name.includes('rotor');

      if (isManualTarget || isGenericTarget) {
        // Prevent double-rotation if a parent is already targeted
        let isChildOfProp = false;
        child.traverseAncestors((ancestor) => {
          if (props.includes(ancestor)) isChildOfProp = true;
        });

        if (!isChildOfProp) {
          console.log("SUCCESS: Targeted Fan Node:", child.name);
          props.push(child);
        }
      }
    });
    propellers.current = props;
  }, [scene]);

  // Set up materials for neon cyberpunk feel, and compute scale
  useEffect(() => {
    // 1. Force Scale (decreased to 20 so it fits nicely and doesn't overlap top nav)
    scene.scale.setScalar(20);

    // 2. Center Pivot to prevent swinging
    const box = new THREE.Box3().setFromObject(scene);
    box.getCenter(scene.position).multiplyScalar(-1);

    // 3. Materials Application (Guaranteed Cyberpunk Mix: Cyan, White, Blue)
    let meshIndex = 0;
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        meshIndex++;
        const name = child.name.toLowerCase();
        child.castShadow = true;
        child.receiveShadow = true;

        // Create a new material for each mesh to avoid shared material overrides
        const mat = new THREE.MeshStandardMaterial({
          metalness: 0.8,
          roughness: 0.2
        });

        // Distribution logic for a "Cyberpunk Mix"
        // 1. Forced Accents (if keywords match)
        if (name.includes('led') || name.includes('light') || name.includes('accent') || name.includes('glow')) {
          mat.color.set('#00ffff');
          mat.emissive.set('#00ffff');
          mat.emissiveIntensity = 10;
          mat.toneMapped = false;
        }
        // 2. Structural Mix (Modulo-based guarantee)
        else if (meshIndex % 3 === 0) {
          // Electric Blue
          mat.color.set('#0044ff');
          mat.metalness = 1.0;
        }
        else if (meshIndex % 3 === 1) {
          // Tech White
          mat.color.set('#ffffff');
          mat.metalness = 0.2;
          mat.roughness = 0.5;
        }
        else {
          // Deep Cyan / Dark Metal
          mat.color.set('#0088aa');
          mat.metalness = 0.9;
        }

        // Special override for rotors
        if (name.includes('prop') || name.includes('blade')) {
          mat.color.set('#111111');
          mat.metalness = 0.5;
        }

        child.material = mat;
      }
    });
  }, [scene]);

  // GSAP 3-Stage Waypoint Timeline
  useEffect(() => {
    if (!droneRef.current) return;

    const tl = gsap.timeline({ paused: true });

    // Stage 1 (0%): Start - Right Side, large, hovering
    gsap.set(droneRef.current.position, { x: 8, y: 0, z: 0 });
    gsap.set(droneRef.current.rotation, { x: 0, y: -Math.PI / 6, z: 0 });

    // Stage 2 (50%): Middle - Move to Left Side, tilt nose toward Map
    tl.to(droneRef.current.position, {
      x: -10,
      y: 0,
      z: 5,
      duration: 0.5,
      ease: "power2.inOut"
    }, 0);
    tl.to(droneRef.current.rotation, {
      x: Math.PI / 8, // Tilt nose down toward map
      y: Math.PI / 6,  // Face toward center
      duration: 0.5,
      ease: "power2.inOut"
    }, 0);

    // Stage 3 (100%): End - Fly Up and Out of viewport
    tl.to(droneRef.current.position, {
      x: 0,
      y: 30, // Fly high up
      z: 40, // Fly into/past camera
      duration: 0.5,
      ease: "power2.in"
    }, 0.5);
    tl.to(droneRef.current.rotation, {
      x: -Math.PI / 4, // Pitch up to fly out
      duration: 0.5,
      ease: "power2.in"
    }, 0.5);

    tlRef.current = tl;

    return () => tl.kill();
  }, []);

  useFrame((state, delta) => {
    // 1. Idle breathing (spring-based lerp for natural hover)
    const t = state.clock.getElapsedTime();
    const targetY = Math.sin(t * 1.5) * 0.8;
    if (breathingRef.current) {
      breathingRef.current.position.y = THREE.MathUtils.lerp(
        breathingRef.current.position.y,
        targetY,
        delta * 5 // Spring-based damping
      );
    }

    // 2. Real-Time Fan Logic (Continuous High-Velocity Spin)
    propellers.current.forEach(prop => {
      // Delta-based rotation for frame-rate independence (PS-03 blur effect)
      prop.rotation.y += delta * 50;
    });

    // 3. Scrub GSAP Timeline based on scroll progress
    if (tlRef.current) {
      // GSAP scrub (lerping is handled by ScrollTrigger usually, but direct set is fine)
      tlRef.current.progress(scrollProgress);
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={3}
        castShadow
        color="#00d2ff"
      />
      <directionalLight
        position={[-10, 5, -10]}
        intensity={2}
        color="#ff2a2a"
      />

      {/* Drone Hierarchy */}
      <group ref={droneRef}>
        {/* Breathing is applied on the inner group to not fight GSAP */}
        <group ref={breathingRef}>
          <primitive object={scene} />
        </group>
      </group>

      {/* Environment reflections */}
      <Environment preset="city" />
    </>
  );
}

useGLTF.preload('/animated_drone_with_camera_free.glb');
