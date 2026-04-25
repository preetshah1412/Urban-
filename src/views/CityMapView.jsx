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
    
    const desiredSize = 400; // Larger city
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

const STATUS_COLORS = {
  pending: 0xff2a2a,     // Red
  'in-progress': 0xffde00, // Yellow/Gold
  resolved: 0x00ff66     // Neon Green
};

function Pins({ issues }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime() * 5;
    
    groupRef.current.children.forEach(pin => {
      if (pin.userData.isPin) {
        const scale = 1 + 0.2 * Math.sin(time + pin.userData.phase);
        pin.children[1].scale.set(scale, scale, scale);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {issues.map(issue => {
        const color = STATUS_COLORS[issue.status] || 0xffffff;
        const phase = (issue.id % 10) * Math.PI * 2;
        
        // Map 0-100% to -200 to 200 for the 3D scene
        const posX = (issue.x / 100) * 400 - 200;
        const posZ = (issue.y / 100) * 400 - 200;

        return (
          <group 
            key={issue.id} 
            position={[posX, 2, posZ]} 
            userData={{ isPin: true, id: issue.id, phase }}
          >
            <mesh>
              <cylinderGeometry args={[0.2, 0.2, 4]} />
              <meshBasicMaterial color={0xffffff} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh position={[0, -1.9, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <ringGeometry args={[0.8, 3.5, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function CityMapView({ issues, onAddIssue }) {
  const [showForm, setShowForm] = useState(false);
  const [targetCoords, setTargetCoords] = useState(null);
  const titleRef = useRef();
  const descRef = useRef();
  const mapRef = useRef();

  const handleMapClick = (event) => {
    // 2. City Map: Click-to-Coordinate
    if (showForm) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setTargetCoords({ x, y });
    setShowForm(true);
  };

  const submitIssue = () => {
    const title = titleRef.current.value;
    const description = descRef.current.value;
    if (!title || !targetCoords) return;

    onAddIssue({
      title,
      description,
      x: targetCoords.x,
      y: targetCoords.y,
      status: 'pending'
    });

    setShowForm(false);
    setTargetCoords(null);
  };

  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const resolutionRate = issues.length ? Math.round((resolvedCount / issues.length) * 100) : 0;

  return (
    <div 
      ref={mapRef}
      className="city-map-container fade-in" 
      style={{ cursor: 'crosshair', position: 'relative' }}
    >
      <div id="metric-strip" className="glass" style={{ pointerEvents: 'auto' }}>
        <div className="metric">
          <span className="metric-label">Live Issues</span>
          <span className="metric-value">{issues.length}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Solved</span>
          <span className="metric-value">{resolvedCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Success Rate</span>
          <span className="metric-value">{resolutionRate}%</span>
        </div>
      </div>

      <Canvas 
        shadows 
        camera={{ position: [0, 100, 100], fov: 45 }}
        onClick={handleMapClick}
      >
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
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
        />
        <Environment preset="city" />
      </Canvas>

      {showForm && (
        <div 
          id="add-issue-form" 
          className="glass slide-in" 
          onClick={e => e.stopPropagation()}
          style={{ zIndex: 1000 }}
        >
          <h3 style={{ marginBottom: 10, fontSize: '0.9rem', color: 'var(--cyan)', textTransform: 'uppercase' }}>
            New Nexus Point
          </h3>
          <input ref={titleRef} type="text" placeholder="Issue Title..." autoFocus />
          <textarea ref={descRef} placeholder="Detailed description..." style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '10px',
            width: '100%',
            resize: 'none',
            height: '60px'
          }} />
          <button className="glass-btn" onClick={submitIssue} style={{ background: 'var(--cyan)', color: '#000' }}>
            SAVE PIN
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
