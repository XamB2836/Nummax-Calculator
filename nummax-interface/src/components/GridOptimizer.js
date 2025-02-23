// src/components/GridOptimizer.js
import React, { useState } from 'react';

// Dimensions en mm
const STANDARD_WIDTH = 1120;
const STANDARD_HEIGHT = 620;

// Dimensions du caisson standard quand il est roté (90°)
const ROTATED_WIDTH = 620;
const ROTATED_HEIGHT = 1120;

// On définit la taille minimale pour un caisson custom (au moins de la taille d'un module LED)
const MIN_CUSTOM_WIDTH = 320;
const MIN_CUSTOM_HEIGHT = 160;

/**
 * Liste des caissons custom préfaits.
 * Ici, nous utilisons les deux cases demandées.
 */
const preMadeCustomCases = [
  { id: 'custom-1120x480', width: 1120, height: 480 },
  { id: 'custom-1440x480', width: 1440, height: 480 },
];

/**
 * Recherche une correspondance exacte dans la liste des caissons custom préfaits.
 */
function findMatchingCustomCase(zoneWidth, zoneHeight, customList) {
  return customList.find(
    (caseItem) => caseItem.width === zoneWidth && caseItem.height === zoneHeight
  );
}

/**
 * Essaie de partitionner la largeur totale d'une rangée custom (screenWidth)
 * en utilisant les caissons custom préfaits.
 * Retourne un tableau de caissons custom si une partition exacte est trouvée, sinon null.
 *
 * Pour simplifier, nous essayons ici de combiner au maximum deux caissons custom.
 */
function partitionCustomRow(screenWidth, rowHeight) {
  // On ne tente la partition que si la hauteur demandée correspond aux caissons préfaits (ici 480)
  if (rowHeight !== preMadeCustomCases[0].height) {
    return null;
  }

  // Vérifions d'abord si l'écran correspond exactement à l'un des caissons.
  for (let custom of preMadeCustomCases) {
    if (custom.width === screenWidth) {
      return [{ ...custom, x: 0, y: 0 }];
    }
  }

  // Sinon, essayons de trouver une combinaison de deux caissons.
  for (let customA of preMadeCustomCases) {
    for (let customB of preMadeCustomCases) {
      if (customA.width + customB.width === screenWidth) {
        return [
          { ...customA, x: 0, y: 0 },
          { ...customB, x: customA.width, y: 0 }
        ];
      }
    }
  }
  return null;
}

/**
 * Calcul du layout en mode standard (orientation par défaut)
 */
function computeLayoutStandard(screenWidth, screenHeight) {
  const cols = Math.floor(screenWidth / STANDARD_WIDTH);
  const rows = Math.floor(screenHeight / STANDARD_HEIGHT);

  let standardCases = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      standardCases.push({
        x: col * STANDARD_WIDTH,
        y: row * STANDARD_HEIGHT,
        width: STANDARD_WIDTH,
        height: STANDARD_HEIGHT,
        type: 'standard'
      });
    }
  }

  const leftoverWidth = screenWidth - cols * STANDARD_WIDTH;
  const leftoverHeight = screenHeight - rows * STANDARD_HEIGHT;
  let customCases = [];

  // Zone résiduelle à droite
  if (leftoverWidth >= MIN_CUSTOM_WIDTH) {
    for (let row = 0; row < rows; row++) {
      const preMade = findMatchingCustomCase(leftoverWidth, STANDARD_HEIGHT, preMadeCustomCases);
      if (preMade) {
        customCases.push({
          ...preMade,
          x: cols * STANDARD_WIDTH,
          y: row * STANDARD_HEIGHT,
          type: 'custom (pre-made)'
        });
      } else {
        customCases.push({
          x: cols * STANDARD_WIDTH,
          y: row * STANDARD_HEIGHT,
          width: leftoverWidth,
          height: STANDARD_HEIGHT,
          type: 'custom (new)'
        });
      }
    }
  }

  // Zone résiduelle en bas
  if (leftoverHeight >= MIN_CUSTOM_HEIGHT) {
    for (let col = 0; col < cols; col++) {
      const preMade = findMatchingCustomCase(STANDARD_WIDTH, leftoverHeight, preMadeCustomCases);
      if (preMade) {
        customCases.push({
          ...preMade,
          x: col * STANDARD_WIDTH,
          y: rows * STANDARD_HEIGHT,
          type: 'custom (pre-made)'
        });
      } else {
        customCases.push({
          x: col * STANDARD_WIDTH,
          y: rows * STANDARD_HEIGHT,
          width: STANDARD_WIDTH,
          height: leftoverHeight,
          type: 'custom (new)'
        });
      }
    }
  }

  // Zone en bas à droite
  if (leftoverWidth >= MIN_CUSTOM_WIDTH && leftoverHeight >= MIN_CUSTOM_HEIGHT) {
    const preMade = findMatchingCustomCase(leftoverWidth, leftoverHeight, preMadeCustomCases);
    if (preMade) {
      customCases.push({
        ...preMade,
        x: cols * STANDARD_WIDTH,
        y: rows * STANDARD_HEIGHT,
        type: 'custom (pre-made)'
      });
    } else {
      customCases.push({
        x: cols * STANDARD_WIDTH,
        y: rows * STANDARD_HEIGHT,
        width: leftoverWidth,
        height: leftoverHeight,
        type: 'custom (new)'
      });
    }
  }

  return { standardCases, customCases };
}

/**
 * Calcul du layout en mode rotated.
 * Ici, on utilise des caissons standard rotés (620x1120) sur la première rangée,
 * puis on tente de remplir la rangée inférieure entière avec une partition custom.
 *
 * Cette méthode est applicable lorsque screenHeight >= ROTATED_HEIGHT + (custom height)
 * et que la partition de la rangée custom existe.
 */
function computeLayoutRotated(screenWidth, screenHeight) {
  // Première rangée : caissons rotés
  const rotatedCols = Math.floor(screenWidth / ROTATED_WIDTH);
  let rotatedCases = [];
  for (let col = 0; col < rotatedCols; col++) {
    rotatedCases.push({
      x: col * ROTATED_WIDTH,
      y: 0,
      width: ROTATED_WIDTH,
      height: ROTATED_HEIGHT,
      type: 'rotated standard'
    });
  }
  // On note qu'il peut rester un petit espace à droite sur la première rangée.
  // Pour la rangée inférieure, on remplit toute la largeur.
  const remainingHeight = screenHeight - ROTATED_HEIGHT;

  // Tenter de partitionner la largeur totale avec nos caissons custom préfaits
  const partition = partitionCustomRow(screenWidth, remainingHeight);
  let customRow = [];
  if (partition) {
    // On attribue la position en y égale à ROTATED_HEIGHT
    partition.forEach((custom, index) => {
      customRow.push({
        ...custom,
        x: custom.x, // custom.x déjà calculé dans partition (0 pour le premier, customA.width pour le second)
        y: ROTATED_HEIGHT,
        type: 'custom (pre-made)'
      });
    });
  } else {
    // Si aucune partition n'est trouvée, on génère une custom case pour toute la rangée.
    customRow.push({
      x: 0,
      y: ROTATED_HEIGHT,
      width: screenWidth,
      height: remainingHeight,
      type: 'custom (new)'
    });
  }

  return { standardCases: rotatedCases, customCases: customRow };
}

/**
 * Le composant GridOptimizer permet d'entrer dynamiquement la dimension de l'écran
 * et choisit automatiquement le layout le plus avantageux.
 *
 * Ici, nous privilégions le layout rotated si l'écran correspond à un cas typique (par exemple 2560x1600)
 * qui permet d'utiliser des caissons rotés et une rangée custom partitionnée.
 */
function GridOptimizer() {
  const [screenWidth, setScreenWidth] = useState(2560);
  const [screenHeight, setScreenHeight] = useState(1600);
  const [useRotated, setUseRotated] = useState(false);

  // On propose de basculer automatiquement en rotated si screenHeight >= ROTATED_HEIGHT + 480 (ex: 1120+480)
  // Mais on laisse aussi la possibilité de forcer la sélection via un bouton.
  const layoutRotated =
    screenHeight >= ROTATED_HEIGHT + preMadeCustomCases[0].height &&
    // Ici, on peut ajouter d'autres critères pour la largeur si besoin.
    computeLayoutRotated(screenWidth, screenHeight);
  const layoutStandard = computeLayoutStandard(screenWidth, screenHeight);

  // On choisit le layout rotated si l'utilisateur l'a forcé et que le layoutRotated est applicable.
  const finalLayout = useRotated && layoutRotated ? layoutRotated : layoutStandard;

  // Ajustement de l'échelle pour l'affichage SVG
  const scale = 0.2;

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Optimisation de l'agencement</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Largeur de l'écran (mm) :&nbsp;
          <input
            type="number"
            value={screenWidth}
            onChange={(e) => setScreenWidth(parseFloat(e.target.value) || 0)}
          />
        </label>
        &nbsp;&nbsp;
        <label>
          Hauteur de l'écran (mm) :&nbsp;
          <input
            type="number"
            value={screenHeight}
            onChange={(e) => setScreenHeight(parseFloat(e.target.value) || 0)}
          />
        </label>
        &nbsp;&nbsp;
        <label>
          Utiliser layout rotated ?
          <input
            type="checkbox"
            checked={useRotated}
            onChange={(e) => setUseRotated(e.target.checked)}
          />
        </label>
      </div>
      <p>
        Écran : {screenWidth} x {screenHeight} mm — {finalLayout.standardCases.length} caisson(s) standard et {finalLayout.customCases.length} caisson(s) custom.
      </p>
      <svg
        width={screenWidth * scale}ww
        height={screenHeight * scale}
        style={{ border: '1px solid #fff', background: '#333' }}
      >
        {/* Affichage des caissons standards (ou rotés) */}
        {finalLayout.standardCases.map((c, i) => (
          <g key={`std-${i}`}>
            <rect
              x={c.x * scale}
              y={c.y * scale}
              width={c.width * scale}
              height={c.height * scale}
              fill={c.type === 'rotated standard' ? 'orange' : 'green'}
              stroke="white"
              strokeWidth="2"
            />
            {/* Pour les caissons standard non rotés, on affiche les subdivisions LED */}
            {c.type === 'standard' &&
              Array.from({ length: 6 }).map((_, j) => {
                const xPos = c.x + (c.width * (j + 1)) / 7;
                return (
                  <line
                    key={`v-${i}-${j}`}
                    x1={xPos * scale}
                    y1={c.y * scale}
                    x2={xPos * scale}
                    y2={(c.y + c.height) * scale}
                    stroke="white"
                    strokeWidth="1"
                  />
                );
              })}
            {c.type === 'standard' && (
              <line
                x1={c.x * scale}
                y1={(c.y + c.height / 2) * scale}
                x2={(c.x + c.width) * scale}
                y2={(c.y + c.height / 2) * scale}
                stroke="white"
                strokeWidth="1"
              />
            )}
          </g>
        ))}
        {/* Affichage des caissons custom */}
        {finalLayout.customCases.map((c, i) => (
          <rect
            key={`cust-${i}`}
            x={c.x * scale}
            y={c.y * scale}
            width={(c.width || 0) * scale}
            height={(c.height || 0) * scale}
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
