// src/App.js
import React from 'react';
import Header from './components/Header';
import LayoutDesigner from './components/LayoutDesigner';
import WattageCalculator from './components/WattageCalculator';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <LayoutDesigner />
        <WattageCalculator />
      </main>
    </div>
  );
}

export default App;
