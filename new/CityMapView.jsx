import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { usePolisState, addIssue, COLOR_HEX } from '../state.js';
import './CityMap.css';

function CityModel() {
  const { scene } = useGLTF('/cyberpunk_city_-_1.glb');
  
  useEffect(() => {
    // Auto-scale model
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    scene.position.x += (scene.position.x - center.x);
    scene.position.y += (scene.position.y - center.y); 
    scene.position.z += (scene.position.z - center.z);
    
    scene.position.y = 0;
    
    const desiredSize = 200;
    const scale = desiredSize / size;
    scene.scale.set(scale, scale, scale);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = 0.3;
          child.material.metalness = 0.8;
        }
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}

function Pins({ issues }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime() * 5;
    
    groupRef.current.children.forEach(pin => {
      if (pin.userData.isPin) {
        // Orbit scaling pulse
        const scale = 1 + 0.2 * Math.sin(time + pin.userData.phase);
        pin.children[1].scale.set(scale, scale, scale); // Orb is index 1
      }
    });
  });

  return (
    <group ref={groupRef}>
      {issues.map(issue => {
        const color = COLOR_HEX[issue.category];
        const phase = (issue.id % 10) * Math.PI * 2;
        
        return (
          <group 
            key={issue.id} 
            position={[issue.x, 5, issue.z]} 
            userData={{ isPin: true, id: issue.id, phase }}
          >
            {/* Shaft */}
            <mesh>
              <cylinderGeometry args={[0.5, 0.5, 10]} />
              <meshBasicMaterial color={0xffffff} transparent opacity={0.5} />
            </mesh>
            {/* Orb */}
            <mesh position={[0, 6, 0]}>
              <sphereGeometry args={[3, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Halo Ground */}
            <mesh position={[0, -4.9, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <ringGeometry args={[2, 5 + (issue.votes * 0.1), 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function CityMapView() {
  const state = usePolisState();
  const [issues, setIssues] = useState(state.issues);
  const [showForm, setShowForm] = useState(false);
  const [targetCoords, setTargetCoords] = useState(null);
  
  const titleRef = useRef();
  const categoryRef = useRef();

  useEffect(() => {
    // Poll or subscribe to state changes if needed. 
    // For simplicity we just read it on mount or rely on React state
    // But since state is external, a true subscription is better:
    import('../state.js').then(({ subscribe }) => {
      return subscribe((s) => setIssues(s.issues));
    });
  }, []);

  const handleDoubleClick = (e) => {
    // We intercept double click on the Canvas container
    // In R3F, we can just use the onClick on an invisible ground plane
  };

  const handleGroundClick = (e) => {
    e.stopPropagation();
    const { point } = e;
    setTargetCoords({ x: point.x, z: point.z });
    setShowForm(true);
  };

  const submitIssue = () => {
    const title = titleRef.current.value;
    const category = categoryRef.current.value;
    if (!title || !targetCoords) return;

    addIssue({
      title,
      category,
      x: targetCoords.x,
      z: targetCoords.z
    });

    setShowForm(false);
    setTargetCoords(null);
  };

  // Metrics
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const resolutionRate = issues.length ? Math.round((resolvedCount / issues.length) * 100) : 0;
  const highest = [...issues].sort((a,b) => b.votes - a.votes)[0];

  return (
    <div className="city-map-container fade-in">
      {/* Metric Strip Overlay */}
      <div id="metric-strip" className="glass">
        <div className="metric">
          <span className="metric-label">Total Reports</span>
          <span className="metric-value">{issues.length}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Resolution Rate</span>
          <span className="metric-value">{resolutionRate}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">High Density</span>
          <span className="metric-value">{highest ? highest.category.toUpperCase() : 'NONE'}</span>
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 150, 150], fov: 45 }}>
        <ambientLight intensity={6.0} color="#ffffff" />
        <directionalLight 
          position={[50, 150, 50]} 
          intensity={8.0} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-50, 50, -50]} intensity={5.0} color="#00d2ff" />
        
        <CityModel />
        <Pins issues={issues} />
        
        {/* Invisible ground plane to catch clicks */}
        <mesh 
          rotation={[-Math.PI/2, 0, 0]} 
          position={[0, 0, 0]} 
          onDoubleClick={handleGroundClick}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
        />
        <Environment preset="city" />
      </Canvas>

      {/* Add Issue Form Overlay */}
      {showForm && (
        <div id="add-issue-form" className="glass slide-in">
          <h3 style={{ marginBottom: 10, fontSize: '0.9rem', color: '#aaa', textTransform: 'uppercase' }}>
            Drop a Pin at [{targetCoords.x.toFixed(1)}, {targetCoords.z.toFixed(1)}]
          </h3>
          <input ref={titleRef} type="text" placeholder="Describe the issue..." />
          <select ref={categoryRef}>
            <option value="infrastructure">Infrastructure</option>
            <option value="sanitation">Sanitation</option>
            <option value="safety">Safety</option>
            <option value="greenery">Greenery</option>
          </select>
          <button className="glass-btn" onClick={submitIssue} style={{ background: 'var(--cyan)', color: '#000' }}>
            PIN TO MAP
          </button>
          <button className="glass-btn" onClick={() => setShowForm(false)} style={{ marginTop: 5, background: 'transparent' }}>
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}

useGLTF.preload('/cyberpunk_city_-_1.glb');
