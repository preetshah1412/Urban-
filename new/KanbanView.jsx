import React, { useState, useEffect } from 'react';
import { usePolisState, moveIssue, upvoteIssue, COLOR_MAP } from '../state.js';
import './Kanban.css';

export default function KanbanView() {
  const state = usePolisState();
  const [issues, setIssues] = useState(state.issues);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    import('../state.js').then(({ subscribe }) => {
      return subscribe((s) => setIssues(s.issues));
    });
  }, []);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // A small timeout allows the dragged visual to look normal before making the source opaque
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedId) {
      moveIssue(draggedId, newStatus);
    }
  };

  const sortedIssues = [...issues].sort((a, b) => b.votes - a.votes);

  const renderColumn = (status, title) => {
    const colIssues = sortedIssues.filter(i => i.status === status);
    
    return (
      <div 
        className="kanban-column glass"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="kanban-header">{title}</div>
        <div className="kanban-cards">
          {colIssues.map(issue => (
            <div 
              key={issue.id}
              className={`card ${issue.status === 'resolved' ? 'resolved-badge' : ''}`}
              style={{ '--card-color': COLOR_MAP[issue.category] }}
              draggable
              onDragStart={(e) => handleDragStart(e, issue.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="card-title">{issue.title}</div>
              <div className="card-meta">
                <span style={{ textTransform: 'capitalize', color: 'var(--card-color)' }}>
                  {issue.category}
                </span>
                <button 
                  className="upvote-btn" 
                  onClick={(e) => { e.stopPropagation(); upvoteIssue(issue.id); }}
                >
                  ▲ {issue.votes}
                </button>
              </div>
              
              {/* Particle effects for resolved items */}
              {issue.status === 'resolved' && (
                <>
                  <div className="particle" style={{ left: '10%', animationDelay: '0s' }} />
                  <div className="particle" style={{ left: '50%', animationDelay: '0.5s' }} />
                  <div className="particle" style={{ left: '80%', animationDelay: '1s' }} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="kanban-view-container fade-in">
      <div className="kanban-board">
        {renderColumn('new', 'New Reports')}
        {renderColumn('in-progress', 'In Progress')}
        {renderColumn('resolved', 'Resolved')}
      </div>
    </div>
  );
}
