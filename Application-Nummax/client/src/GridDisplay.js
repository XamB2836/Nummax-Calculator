// client/src/GridDisplay.js
import React from 'react';

function GridDisplay({ layout }) {
  const { screen, boitiers } = layout;

  const gridStyle = {
    position: 'relative',
    width: `${screen.width}px`,
    height: `${screen.height}px`,
    border: '2px solid #000',
    backgroundColor: '#f5f5f5'
  };

  return (
    <div style={gridStyle}>
      {boitiers.map((boit, index) => {
        const style = {
          position: 'absolute',
          left: `${boit.x}px`,
          top: `${boit.y}px`,
          width: `${boit.width}px`,
          height: `${boit.height}px`,
          backgroundColor: boit.custom ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)',
          border: '1px solid #000',
          boxSizing: 'border-box'
        };
        return <div key={index} style={style}></div>;
      })}
    </div>
  );
}

export default GridDisplay;
