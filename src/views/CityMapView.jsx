import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import './CityMap.css';

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
        
        return (
          <group 
            key={issue.id} 
            position={[issue.x, issue.y + 2, issue.z]} 
            userData={{ isPin: true, id: issue.id, phase }}
          >
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 4]} />
              <meshBasicMaterial color={0xffffff} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh position={[0, -1.9, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <ringGeometry args={[0.4, 1.5, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function CityModel({ onCityClick }) {
  const { scene } = useGLTF('/cyberpunk_city_-_1.glb');
  
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    scene.position.x += (scene.position.x - center.x);
    scene.position.y += (scene.position.y - center.y); 
    scene.position.z += (scene.position.z - center.z);
    scene.position.y = 0;
    
    const desiredSize = 400; 
    const scale = desiredSize / size;
    scene.scale.set(scale, scale, scale);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive 
      object={scene} 
      onClick={(e) => {
        e.stopPropagation();
        onCityClick(e.point);
      }}
    />
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

  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const resolutionRate = issues.length ? Math.round((resolvedCount / issues.length) * 100) : 0;

  return (
    <div className="city-map-container fade-in" style={{ cursor: 'default' }}>
      <div id="metric-strip" className="glass" style={{ pointerEvents: 'auto' }}>
        <div className="metric">
          <span className="metric-label">City Infrastructure</span>
          <span className="metric-value">{issues.length}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Resolution</span>
          <span className="metric-value">{resolutionRate}%</span>
        </div>
      </div>

      <Canvas 
        shadows 
        camera={{ position: [0, 80, 80], fov: 45 }}
      >
        <ambientLight intensity={6.0} color="#ffffff" />
        <spotLight position={[50, 150, 50]} angle={0.3} penumbra={1} intensity={15} castShadow />
        <directionalLight position={[-50, 50, -50]} intensity={5.0} color="#00d2ff" />
        
        <CityModel onCityClick={handleCityClick} />
        <Pins issues={issues} />
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2 - 0.1} 
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
