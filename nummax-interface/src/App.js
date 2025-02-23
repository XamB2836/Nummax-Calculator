// src/App.js
import React from 'react';
import LayoutDesigner from './components/LayoutDesigner';
import WattageCalculator from './components/WattageCalculator';
import './App.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Disposition des Boîtiers</h1>
      </header>
      <main>
        <LayoutDesigner />
        <WattageCalculator />
      </main>
    </div>
  );
}

export default App;
