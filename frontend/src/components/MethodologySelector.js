import React from 'react';

const MethodologySelector = ({ selected, onSelect }) => {
  const methodologies = [
    { 
      id: 'agile', 
      name: 'Agile/Scrum', 
      desc: 'User stories, sprints, iterative',
      icon: '🔄'
    },
    { 
      id: 'waterfall', 
      name: 'Waterfall/V-Model', 
      desc: 'Sequential phases, formal docs',
      icon: '📋'
    },
    { 
      id: 'hybrid', 
      name: 'Hybrid', 
      desc: 'Best of both worlds',
      icon: '⚡'
    }
  ];

  return (
    <div className="methodology-selector">
      <h2>🎯 Select Your Testing Methodology</h2>
      <div className="methodology-grid">
        {methodologies.map(method => (
          <div 
            key={method.id}
            className={`methodology-card ${selected === method.id ? 'selected' : ''}`}
            onClick={() => onSelect(method.id)}
          >
            <div className="method-icon">{method.icon}</div>
            <h3>{method.name}</h3>
            <p>{method.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MethodologySelector;