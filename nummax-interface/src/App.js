// src/App.js
import React from 'react';
import LayoutDesigner from './components/LayoutDesigner';
import WattageCalculator from './components/WattageCalculator';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Disposition des Boîtiers</h1>
      <LayoutDesigner />
      <WattageCalculator />
    </div>
  );
}

export default App;
