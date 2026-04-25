import React from 'react';
import './TopNav.css';

export default function TopNav({ currentView, onNavigate }) {
  return (
    <nav id="top-nav" className="glass">
      {/* Brand */}
      <div className="nav-brand" onClick={() => onNavigate('landing')}>
        <span className="brand-icon">◈</span>
        <span className="brand-text">Urban Lens</span>
      </div>

      {/* Links */}
      <div className="nav-links">
        <button
          className={`nav-link ${currentView === 'map' ? 'active' : ''}`}
          onClick={() => onNavigate('map')}
        >
          <span className="link-dot" style={{ background: 'var(--cyan)' }} />
          City Map
        </button>
        <button
          className={`nav-link ${currentView === 'kanban' ? 'active' : ''}`}
          onClick={() => onNavigate('kanban')}
        >
          <span className="link-dot" style={{ background: 'var(--amber)' }} />
          Issue Board
        </button>
      </div>
    </nav>
  );
}
