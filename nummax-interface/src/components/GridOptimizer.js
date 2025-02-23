// src/components/GridOptimizer.js
import React from 'react';

// Dimensions en mm
const STANDARD_WIDTH = 1120;
const STANDARD_HEIGHT = 620;
const LED_WIDTH = 320;
const LED_HEIGHT = 160;

// Taille minimale pour un caisson custom (on ne veut pas de custom plus petit qu'un module LED)
const MIN_CUSTOM_WIDTH = LED_WIDTH;
const MIN_CUSTOM_HEIGHT = LED_HEIGHT;

/**
 * Cette fonction calcule un placement de caissons standard et custom
 * sur une zone d'écran de dimensions screenWidth x screenHeight.
 * Pour l'instant, on place d'abord les caissons standards sans chevauchement,
 * puis on détermine les zones résiduelles sur la droite et en bas.
 */
function computeGrid(screenWidth, screenHeight) {
  // Nombre de caissons standards pouvant tenir sans chevauchement complet
  const colsStandard = Math.floor(screenWidth / STANDARD_WIDTH);
  const rowsStandard = Math.floor(screenHeight / STANDARD_HEIGHT);

  let standardCases = [];

  // On place les caissons standards en grille
  for (let row = 0; row < rowsStandard; row++) {
    for (let col = 0; col < colsStandard; col++) {
      standardCases.push({
        x: col * STANDARD_WIDTH,
        y: row * STANDARD_HEIGHT,
        width: STANDARD_WIDTH,
        height: STANDARD_HEIGHT,
        type: 'standard'
      });
    }
  }

  // Calcul des espaces restants (en mm)
  const leftoverWidth = screenWidth - colsStandard * STANDARD_WIDTH;
  const leftoverHeight = screenHeight - rowsStandard * STANDARD_HEIGHT;

  let customCases = [];

  // Si la zone restante à droite est suffisamment large
  if (leftoverWidth >= MIN_CUSTOM_WIDTH) {
    for (let row = 0; row < rowsStandard; row++) {
      customCases.push({
        x: colsStandard * STANDARD_WIDTH,
        y: row * STANDARD_HEIGHT,
        width: leftoverWidth,
        height: STANDARD_HEIGHT,
        type: 'custom'
      });
    }
  }

  // Si la zone restante en bas est suffisamment haute
  if (leftoverHeight >= MIN_CUSTOM_HEIGHT) {
    for (let col = 0; col < colsStandard; col++) {
      customCases.push({
        x: col * STANDARD_WIDTH,
        y: rowsStandard * STANDARD_HEIGHT,
        width: STANDARD_WIDTH,
        height: leftoverHeight,
        type: 'custom'
      });
    }
  }

  // Zone en bas à droite, si les deux zones résiduelles existent
  if (leftoverWidth >= MIN_CUSTOM_WIDTH && leftoverHeight >= MIN_CUSTOM_HEIGHT) {
    customCases.push({
      x: colsStandard * STANDARD_WIDTH,
      y: rowsStandard * STANDARD_HEIGHT,
      width: leftoverWidth,
      height: leftoverHeight,
      type: 'custom'
    });
  }

  // Ici, on pourrait ajouter un algorithme d'optimisation pour autoriser
  // un chevauchement limité (moitié d'un module LED) entre caissons adjacents,
  // mais pour cette première version, nous restons sur une grille simple.

  return { standardCases, customCases };
}

/**
 * Le composant GridOptimizer reçoit en props la largeur et la hauteur de l'écran (en mm)
 * et affiche une visualisation (avec SVG) de la grille calculée.
 */
function GridOptimizer({ screenWidth, screenHeight }) {
  const { standardCases, customCases } = computeGrid(screenWidth, screenHeight);

  // Pour la visualisation, nous appliquons une échelle (par exemple division par 2)
  const scale = 0.5;

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Optimisation de l'agencement</h2>
      <p>
        Écran : {screenWidth} x {screenHeight} mm — {standardCases.length} caissons standard et {customCases.length} caisson(s) custom.
      </p>
      <svg
        width={screenWidth * scale}
        height={screenHeight * scale}
        style={{ border: '1px solid #fff', background: '#333' }}
      >
        {/* Affichage des caissons standard en vert */}
        {standardCases.map((c, i) => (
          <rect
            key={`std-${i}`}
            x={c.x * scale}
            y={c.y * scale}
            width={c.width * scale}
            height={c.height * scale}
            fill="green"
            stroke="white"
            strokeWidth="2"
          />
        ))}
        {/* Affichage des caissons custom en rouge */}
        {customCases.map((c, i) => (
          <rect
            key={`cust-${i}`}
            x={c.x * scale}
            y={c.y * scale}
            width={c.width * scale}
            height={c.height * scale}
            fill="red"
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

export default GridOptimizer;
