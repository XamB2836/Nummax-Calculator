// src/components/LayoutDesigner.js
import React, { useState } from 'react';

function LayoutDesigner() {
  const [nombreBoitiers, setNombreBoitiers] = useState(1);

  return (
    <div>
      <label>
        Nombre de boîtiers :
        <input
          type="number"
          value={nombreBoitiers}
          onChange={(e) => setNombreBoitiers(Number(e.target.value))}
          min="1"
        />
      </label>
      <p>Vous avez choisi {nombreBoitiers} boîtiers.</p>
    </div>
  );
}

export default LayoutDesigner;
