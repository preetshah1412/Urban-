import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Center } from '@react-three/drei';
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
      if (pin.userData.isPin) {
        const scale = 1 + 0.1 * Math.sin(time + pin.userData.phase);
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
            position={[issue.x, issue.y, issue.z]} 
            userData={{ isPin: true, id: issue.id, phase }}
          >
            {/* Beam */}
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.5]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
            {/* Floating Orb */}
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Ground Ring */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.15, 0.3, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
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
    // 1. Stable Scaling
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    // Offset the internal scene once so [0,0,0] is the city center
    scene.position.x -= center.x;
    scene.position.y -= center.y;
    scene.position.z -= center.z;
    scene.position.y = 0; // Keep floor at zero
    
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
          <span className="metric-label">Nexus Points</span>
          <span className="metric-value">{issues.length}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Efficiency</span>
          <span className="metric-value">{resolutionRate}%</span>
        </div>
      </div>

      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [70, 70, 70], fov: 45 }}
      >
        <ambientLight intensity={4.0} color="#ffffff" />
        <spotLight position={[100, 200, 100]} angle={0.5} penumbra={1} intensity={20} castShadow />
        <pointLight position={[-100, 50, -100]} intensity={10} color="#00d2ff" />
        
        <CityModel onCityClick={handleCityClick} />
        <Pins issues={issues} />
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.1} 
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
            New Report
          </h3>
          <input ref={titleRef} type="text" placeholder="Title..." autoFocus />
          <textarea ref={descRef} placeholder="Details..." style={{ 
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
            CONFIRM PIN
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
