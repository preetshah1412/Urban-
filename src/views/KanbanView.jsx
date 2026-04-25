import React, { useState, useEffect } from 'react';
import { usePolisState, moveIssue, upvoteIssue, COLOR_MAP } from '../state.js';
import './Kanban.css';

export default function KanbanView({ issues, onUpdateStatus, onDelete }) {
  const [draggedId, setDraggedId] = useState(null);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedId) {
      onUpdateStatus(draggedId, newStatus);
    }
  };

  const renderColumn = (status, title) => {
    const colIssues = issues.filter(i => i.status === status);
    
    return (
      <div 
        className="kanban-column glass"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="kanban-header">
          {title} <span>({colIssues.length})</span>
        </div>
        <div className="kanban-cards">
          {colIssues.map(issue => (
            <div 
              key={issue.id}
              className={`card ${issue.status === 'resolved' ? 'resolved-badge' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, issue.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="card-header-row">
                <div className="card-title">{issue.title}</div>
                <button 
                  className="delete-btn" 
                  onClick={() => onDelete(issue.id)}
                  title="Delete Issue"
                >
                  ✕
                </button>
              </div>
              
              <div className="card-desc">{issue.description}</div>
              
              <div className="card-meta">
                <span className="coord-badge">
                  Loc: {issue.x.toFixed(0)}%, {issue.y.toFixed(0)}%
                </span>
              </div>
              
              {issue.status === 'resolved' && (
                <div className="success-glow" />
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
        {renderColumn('pending', 'Pending')}
        {renderColumn('in-progress', 'In Progress')}
        {renderColumn('resolved', 'Resolved')}
      </div>
    </div>
  );
}
