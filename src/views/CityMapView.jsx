import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import './CityMap.css';

const STATUS_COLORS = {
  pending: 0xff2a2a,
  'in-progress': 0xffde00,
  resolved: 0x00ff66
};

const DISTRICTS = [
  { name: 'NEON MARKET', pos: [-150, 5, 100], color: '#00d2ff' },
  { name: 'TECH QUARTER', pos: [50, 5, -120], color: '#bf00ff' },
  { name: 'CIVIC CORE', pos: [-80, 5, -50], color: '#ff00ff' },
  { name: 'INDUSTRIAL BELT', pos: [120, 5, 40], color: '#ff6600' }
];

function Pins({ issues }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime() * 4;
    groupRef.current.children.forEach(pin => {
      if (pin.userData.isPin) {
        const bounce = Math.sin(time + pin.userData.phase) * 0.5;
        pin.children[1].position.y = 3 + bounce; // Orb bounce
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
            {/* Ultra-Thin Connector */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 3]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>
            {/* Tiny Glowing Orb */}
            <mesh position={[0, 3, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color={color} />
              <Html distanceFactor={15}>
                <div className="pin-label" style={{ color }}>{issue.title}</div>
              </Html>
            </mesh>
            {/* Ground Pulse */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.1, 0.4, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.4} />
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
    
    scene.position.x -= center.x;
    scene.position.y -= center.y;
    scene.position.z -= center.z;
    scene.position.y = 0; 
    
    const desiredSize = 800; // Much larger
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
    <group>
      <primitive 
        object={scene} 
        onClick={(e) => {
          e.stopPropagation();
          onCityClick(e.point);
        }}
      />
      {/* District Labels */}
      {DISTRICTS.map(d => (
        <group key={d.name} position={d.pos}>
          <Html distanceFactor={20} center>
            <div className="district-label" style={{ '--d-color': d.color }}>{d.name}</div>
          </Html>
        </group>
      ))}
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

  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const resolutionRate = issues.length ? Math.round((resolvedCount / issues.length) * 100) : 0;

  return (
    <div className="city-map-container fade-in">
      <div id="urban-lens-header" className="glass">
        <div className="header-brand">URBAN<span>LENS</span></div>
        <div className="header-metrics">
          <div className="h-metric">REPORTS <span>{issues.length}</span></div>
          <div className="h-metric">RATE <span>{resolutionRate}%</span></div>
          <div className="h-metric highlight">HOTSPOT <span>INDUSTRIAL BELT</span></div>
        </div>
      </div>

      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [250, 150, 250], fov: 45 }}
      >
        <ambientLight intensity={3.0} />
        <spotLight position={[200, 400, 200]} angle={0.4} penumbra={1} intensity={25} castShadow />
        <pointLight position={[-200, 100, -200]} intensity={15} color="#00d2ff" />
        
        <CityModel onCityClick={handleCityClick} />
        <Pins issues={issues} />
        
        {/* Deep Horizon Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial color="#03050a" />
        </mesh>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.2} 
        />
        <Environment preset="night" />
      </Canvas>

      {showForm && (
        <div id="urban-drop-form" className="glass slide-in">
          <div className="form-tip">Double-click the map to drop a pin</div>
          <h3>DROP A PIN</h3>
          <input ref={titleRef} type="text" placeholder="Describe the issue..." autoFocus />
          <select style={{ marginBottom: 15, background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', width: '100%' }}>
            <option>Infrastructure</option>
            <option>Sanitation</option>
            <option>Safety</option>
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="glass-btn cancel" onClick={() => setShowForm(false)}>CANCEL</button>
            <button className="glass-btn submit" onClick={submitIssue}>PIN TO MAP</button>
          </div>
        </div>
      )}
    </div>
  );
}

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
