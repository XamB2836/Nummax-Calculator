// src/components/WattageCalculator.js
import React, { useState } from 'react';

// Exemple de données pour les panneaux LED
const ledPanels = [
  { id: 'panel1', name: 'Panneau LED A', wattPerM2: 550 },
  { id: 'panel2', name: 'Panneau LED B', wattPerM2: 150 },
  { id: 'panel3', name: 'Panneau LED C', wattPerM2: 200 },
];

function WattageCalculator() {
  // États pour stocker les dimensions (en mm), le panneau sélectionné et le résultat
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [selectedPanel, setSelectedPanel] = useState(ledPanels[0].id);
  const [result, setResult] = useState(null);

  // Fonction de calcul
  const calculateWattage = () => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (isNaN(w) || isNaN(h)) {
      setResult(null);
      return;
    }
    // Conversion de mm à m : 1 mm = 0,001 m
    const area = (w * 0.001) * (h * 0.001); // Aire en m²
    // Récupérer le wattage par m² du panneau sélectionné
    const panel = ledPanels.find(panel => panel.id === selectedPanel);
    const wattPerM2 = panel ? panel.wattPerM2 : 0;
    const wattage = area * wattPerM2;
    setResult(wattage);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', marginTop: '20px' }}>
      <h2>Calculateur de Wattage</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Largeur (mm):&nbsp;
          <input 
            type="number" 
            value={width} 
            onChange={(e) => setWidth(e.target.value)} 
            placeholder="Ex: 1120" 
          />
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Hauteur (mm):&nbsp;
          <input 
            type="number" 
            value={height} 
            onChange={(e) => setHeight(e.target.value)} 
            placeholder="Ex: 640" 
          />
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Panneau LED:&nbsp;
          <select value={selectedPanel} onChange={(e) => setSelectedPanel(e.target.value)}>
            {ledPanels.map(panel => (
              <option key={panel.id} value={panel.id}>
                {panel.name} ({panel.wattPerM2} W/m²)
              </option>
            ))}
          </select>
        </label>
      </div>
      <button onClick={calculateWattage}>Calculer</button>
      {result !== null && (
        <div style={{ marginTop: '20px' }}>
          <h3>Wattage Total: {result.toFixed(2)} W</h3>
        </div>
      )}
    </div>
  );
}

export default WattageCalculator;
