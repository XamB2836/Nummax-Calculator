// src/App.js
import React from 'react';
import Header from './components/Header'; // Votre header déjà créé
import WattageCalculator from './components/WattageCalculator';
import GridOptimizer from './components/GridOptimizer';
import './App.css';

function App() {
  // Vous pouvez changer ces valeurs pour tester différentes dimensions d'écran
  const screenWidth = 2240;  // par exemple 2240 mm
  const screenHeight = 1280; // par exemple 1280 mm

  return (
    <div className="app">
      <Header />
      <main>
        <WattageCalculator />
        <GridOptimizer screenWidth={screenWidth} screenHeight={screenHeight} />
      </main>
    </div>
  );
}

export default App;
