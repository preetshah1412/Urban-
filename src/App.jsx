import React, { useState, useEffect } from 'react';
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

  // 1. Global State & Persistence
  const [issues, setIssues] = useState(() => {
    const saved = localStorage.getItem('urban-nexus-issues');
    return saved ? JSON.parse(saved) : [
      { id: 1, x: 25, y: 30, title: 'Network Outage', description: 'Central hub is offline', status: 'pending' },
      { id: 2, x: 60, y: 45, title: 'Water Leak', description: 'Main pipe burst near sector 7', status: 'in-progress' },
      { id: 3, x: 40, y: 70, title: 'Drone Crash', description: 'Clearance required at deck 4', status: 'resolved' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('urban-nexus-issues', JSON.stringify(issues));
  }, [issues]);

  const addIssue = (newIssue) => {
    setIssues(prev => [...prev, { ...newIssue, id: Date.now() }]);
  };

  const updateIssueStatus = (id, status) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const deleteIssue = (id) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div style={{ background: '#03050a', minHeight: '100vh', position: 'relative' }}>
      <TopNav currentView={view} onNavigate={(v) => {
        window.scrollTo(0, 0); 
        setView(v);
      }} />

      {/* Persistent 3D Drone Layer */}
      <div style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
        zIndex: 1, pointerEvents: 'none',
        opacity: view === 'landing' ? 1 : 0,
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
            <CityMapView issues={issues} onAddIssue={addIssue} />
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
            <KanbanView 
              issues={issues} 
              onUpdateStatus={updateIssueStatus} 
              onDelete={deleteIssue}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
