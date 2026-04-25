import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import './CityMap.css';

const STATUS_COLORS = {
  pending: 0xff2a2a,
  'in-progress': 0xffde00,
  resolved: 0x00ff66
};

function Pins({ issues }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime() * 5;
    groupRef.current.children.forEach(pin => {
      const scale = 1 + 0.1 * Math.sin(time + (pin.userData.phase || 0));
      if (pin.children[1]) pin.children[1].scale.set(scale, scale, scale);
    });
  });

  return (
    <group ref={groupRef}>
      {issues.map(issue => (
        <group 
          key={issue.id} 
          position={[issue.x, issue.y, issue.z]} 
          userData={{ isPin: true, phase: (issue.id % 10) * Math.PI }}
        >
          {/* Vertical Beam */}
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 1.5]} />
            <meshBasicMaterial color={STATUS_COLORS[issue.status]} transparent opacity={0.5} />
          </mesh>
          {/* Floating Data Orb */}
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color={STATUS_COLORS[issue.status]} />
          </mesh>
          {/* Ground Contact Ring */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.15, 0.3, 32]} />
            <meshBasicMaterial color={STATUS_COLORS[issue.status]} side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function UrbanNexusWorld({ issues, onCityClick }) {
  const { scene } = useGLTF('/cyberpunk_city_-_1.glb');
  const worldGroup = useRef();

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    
    // 1. Center the city geometry internally
    scene.position.x -= center.x;
    scene.position.y -= center.y;
    scene.position.z -= center.z;
    scene.position.y = 0;

    // 2. Scale the entire world group
    const desiredSize = 400;
    const scale = desiredSize / size;
    if (worldGroup.current) {
      worldGroup.current.scale.set(scale, scale, scale);
    }

    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group ref={worldGroup}>
      {/* The City Geometry */}
      <primitive 
        object={scene} 
        onClick={(e) => {
          e.stopPropagation();
          onCityClick(e.point);
        }}
      />
      
      {/* The Pins - Nested in the same scaled world */}
      <Pins issues={issues} />
    </group>
  );
}

export default function CityMapView({ issues, onAddIssue }) {
  const [showForm, setShowForm] = useState(false);
  const [targetCoords, setTargetCoords] = useState(null);
  const titleRef = useRef();
  const descRef = useRef();

  const handleCityClick = (point) => {
    setTargetCoords({ x: point.x, y: point.y, z: point.z });
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
      z: targetCoords.z,
      status: 'pending'
    });

    setShowForm(false);
    setTargetCoords(null);
  };

  return (
    <div className="city-map-container fade-in">
      <div id="metric-strip" className="glass">
        <div className="metric">
          <span className="metric-label">Operational Nexus</span>
          <span className="metric-value">{issues.length}</span>
        </div>
      </div>

      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [100, 100, 100], fov: 45 }}
      >
        <ambientLight intensity={4.0} />
        <spotLight position={[100, 200, 100]} angle={0.5} penumbra={1} intensity={20} castShadow />
        <pointLight position={[-100, 50, -100]} intensity={10} color="#00d2ff" />
        
        <UrbanNexusWorld issues={issues} onCityClick={handleCityClick} />
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.1} 
        />
        <Environment preset="city" />
      </Canvas>

      {showForm && (
        <div id="add-issue-form" className="glass slide-in" onClick={e => e.stopPropagation()}>
          <h3>Deploy Node</h3>
          <input ref={titleRef} type="text" placeholder="Designation" autoFocus />
          <textarea ref={descRef} placeholder="Telemetry details..." />
          <button className="glass-btn" onClick={submitIssue}>INITIALIZE</button>
          <button className="glass-btn cancel" onClick={() => setShowForm(false)}>ABORT</button>
        </div>
      )}
    </div>
  );
}

useGLTF.preload('/cyberpunk_city_-_1.glb');
