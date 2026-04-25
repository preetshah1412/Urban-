import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TopNav from './components/TopNav.jsx';
import LandingPage from './landing/LandingPage.jsx';
import CityMapView from './views/CityMapView.jsx';
import KanbanView from './views/KanbanView.jsx';

/*
  Views:
    'landing'  → Drone scrollytelling hero
    'map'      → 3D City Map (Three.js)
    'kanban'   → Issue Board (Kanban)
*/

import { Canvas } from '@react-three/fiber';
import LandingScene from './components/LandingScene.jsx';

export default function App() {
  const [view, setView] = useState('landing');
  const [scrollProgress, setScrollProgress] = useState(0);

  return (
    <div style={{ background: '#03050a', minHeight: '100vh', position: 'relative' }}>
      <TopNav currentView={view} onNavigate={(v) => {
        window.scrollTo(0, 0); // Viewport Snap-Back
        setView(v);
      }} />

      {/* Persistent 3D Drone Layer - Always Mounted */}
      <div style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
        zIndex: 1, pointerEvents: 'none',
        opacity: view === 'landing' ? 1 : 0, // Fade out when not on landing
        transition: 'opacity 0.8s ease-in-out'
      }}>
        <Canvas 
          shadows 
          camera={{ position: [0, 10, 30], fov: 45 }}
          gl={{ alpha: true, antialias: true }}
        >
          <LandingScene scrollProgress={scrollProgress} active={view === 'landing'} />
        </Canvas>
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <LandingPage onEnter={() => setView('map')} onScroll={setScrollProgress} />
          </motion.div>
        )}
        {view === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
          >
            <CityMapView />
          </motion.div>
        )}
        {view === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <KanbanView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
