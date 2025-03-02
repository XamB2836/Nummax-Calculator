// src/components/GridOptimizer.js
import React, { useState } from 'react';

// ----- Fixed Dimensions (mm) -----
const STANDARD_CASE_WIDTH = 1120;  // standard case width
const STANDARD_CASE_HEIGHT = 640;  // standard case height
const FULL_ROW_HEIGHT = STANDARD_CASE_HEIGHT; // 640 mm

// ----- LED Module Sizes -----
// Dans le layout de base (portrait), on utilise des modules LED en orientation pivotée (160×320)
// de sorte qu’un boîtier standard est de 1120×640 (7 modules sur la largeur, 2 modules sur la hauteur).
// Dans le layout pivoté, on transforme les cellules calculées pour obtenir des cellules en 640×1120.
const LED_ROTATED  = { width: 160, height: 320 };  // pour le layout portrait
const LED_STANDARD = { width: 320, height: 160 };   // pour le layout pivoté

// ----- Pre-made Custom Cases -----
const preMadeCustomCases = [
  

  // On peut ajouter ici les définitions de boîtiers sur mesure préfabriqués.
];

// ----- LED Panel Options (pour le calcul de consommation) -----
const ledPanels = [
  { id: 'panel1', name: '2.5 GOB', wattPerM2: 550 },
  { id: 'panel2', name: '1.25 Flex', wattPerM2: 290 },
  { id: 'panel3', name: 'LED Panel C', wattPerM2: 200 },
];

// ----- Utility: Allowed Custom Sizes for a Given Height -----
function getAllowedWidthsForHeight(desiredHeight, moduleWidth) {
  const widths = new Set();
  preMadeCustomCases.forEach(c => {
    if (c.height === desiredHeight && c.width % moduleWidth === 0) {
      widths.add(c.width);
    }
  });
  return Array.from(widths);
}

// ----- Partitioning Functions -----
function partitionColumnsExact(target, allowedSet) {
  const sorted = allowedSet.slice().sort((a, b) => b - a);
  function helper(remaining, current) {
    if (remaining === 0) return current;
    for (let w of sorted) {
      if (w <= remaining) {
        const result = helper(remaining - w, current.concat(w));
        if (result !== null) return result;
      }
    }
    return null;
  }
  return helper(target, []);
}

function partitionColumnsWithMissing(target, allowedSet, moduleWidth) {
  const filteredAllowed = allowedSet.filter(w => w % moduleWidth === 0);
  const exact = partitionColumnsExact(target, filteredAllowed);
  if (exact !== null) return { partition: exact, missing: 0 };
  else {
    const sorted = filteredAllowed.slice().sort((a, b) => b - a);
    let partition = [];
    let remaining = target;
    for (let w of sorted) {
      while (remaining >= w) {
        partition.push(w);
        remaining -= w;
      }
    }
    // --- Modification : Tolérance pour réduire la zone manquante ---
    const tolerance = moduleWidth * 0.1; // 10% de la largeur du module
    if (remaining > 0 && remaining < tolerance && partition.length > 0) {
      // On ajoute le reste à la dernière partition afin d'éviter une zone trop fine.
      partition[partition.length - 1] += remaining;
      remaining = 0;
    }
    return { partition, missing: remaining };
  }
}

function splitMissing(missing, moduleWidth) {
  const parts = [];
  while (missing >= moduleWidth) {
    parts.push(moduleWidth);
    missing -= moduleWidth;
  }
  if (missing > 0) parts.push(missing);
  return parts;
}

// ----- Subdivide Missing Cells -----
// Modification : ajout d'une tolérance pour "rounder" les dimensions proches d'un multiple exact
function subdivideMissingCells(cells, moduleWidth, moduleHeight) {
  const subdivided = [];
  const toleranceW = moduleWidth * 0.1;  // 10% de la largeur du module
  const toleranceH = moduleHeight * 0.1; // 10% de la hauteur du module
  for (const cell of cells) {
    // Calcul des restes par rapport aux dimensions d'un module
    const remainderW = cell.width % moduleWidth;
    const remainderH = cell.height % moduleHeight;
    let adjustedWidth = cell.width;
    let adjustedHeight = cell.height;
    // Si le reste est faible (inférieur à la tolérance), on arrondit à un multiple de moduleWidth/height.
    if (remainderW > 0 && remainderW < toleranceW) {
      adjustedWidth = Math.round(cell.width / moduleWidth) * moduleWidth;
    }
    if (remainderH > 0 && remainderH < toleranceH) {
      adjustedHeight = Math.round(cell.height / moduleHeight) * moduleHeight;
    }
    // Si après ajustement, les dimensions ne sont pas un multiple exact, on laisse la cellule telle quelle.
    if (adjustedWidth % moduleWidth !== 0 || adjustedHeight % moduleHeight !== 0) {
      subdivided.push(cell);
    } else {
      const cols = adjustedWidth / moduleWidth;
      const rows = adjustedHeight / moduleHeight;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          subdivided.push({
            x: cell.x + c * moduleWidth,
            y: cell.y + r * moduleHeight,
            width: moduleWidth,
            height: moduleHeight,
            type: cell.type
          });
        }
      }
    }
  }
  return subdivided;
}

// ----- Custom Case Finder & Summary -----
function findMatchingCustomCase(zoneWidth, zoneHeight) {
  return preMadeCustomCases.find(c => c.width === zoneWidth && c.height === zoneHeight);
}

function generateCaseSummary(cases) {
  const summary = {};
  cases.forEach(c => {
    const key = `${c.width}x${c.height}`;
    summary[key] = (summary[key] || 0) + 1;
  });
  return summary;
}

// ----- Screen Fillability Check -----
function isScreenFillable(screenWidth, screenHeight) {
  if (screenWidth % LED_ROTATED.width === 0 && screenHeight % LED_ROTATED.height === 0) return true;
  if (screenWidth % LED_STANDARD.width === 0 && screenHeight % LED_STANDARD.height === 0) return true;
  return false;
}

// ----- Layout Computation: Portrait Layout -----
// Calcule le layout pour un écran en mode portrait utilisant les modules LED en orientation pivotée (LED_ROTATED).
// Les lignes complètes ont une hauteur de 640 mm ; la ligne du bas (si présente) doit être un multiple de 320.
function computeStandardLayout(screenWidth, screenHeight) {
  const rowHeight = STANDARD_CASE_HEIGHT; // 640 mm
  const fullRows = Math.floor(screenHeight / rowHeight);
  const bottomHeight = screenHeight % rowHeight;
  const layout = { standardCases: [], customCases: [], missingCases: [], valid: true };
  if (bottomHeight > 0 && (bottomHeight % LED_ROTATED.height !== 0)) {
    layout.valid = false;
    layout.warning = "Pour le layout standard, la hauteur de la dernière ligne doit être un multiple de 320 mm.";
    return layout;
  }
  for (let r = 0; r < fullRows; r++) {
    const y = r * rowHeight;
    let xOffset = 0;
    const allowed =
      (screenWidth % STANDARD_CASE_WIDTH === 0)
        ? [STANDARD_CASE_WIDTH]
        : [STANDARD_CASE_WIDTH, ...getAllowedWidthsForHeight(rowHeight, LED_ROTATED.width)
            .filter(w => w < STANDARD_CASE_WIDTH)].sort((a, b) => b - a);
    const { partition, missing } = partitionColumnsWithMissing(screenWidth, allowed, LED_ROTATED.width);
    partition.forEach(seg => {
      if (seg === STANDARD_CASE_WIDTH) {
        layout.standardCases.push({ x: xOffset, y, width: seg, height: rowHeight, type: 'standard' });
      } else {
        const match = findMatchingCustomCase(seg, rowHeight);
        if (match) layout.customCases.push({ x: xOffset, y, width: seg, height: rowHeight, type: 'custom (pre-made)' });
        else layout.missingCases.push({ x: xOffset, y, width: seg, height: rowHeight, type: 'missing' });
      }
      xOffset += seg;
    });
    if (missing > 0) {
      const parts = splitMissing(missing, LED_ROTATED.width);
      parts.forEach(part => {
        layout.missingCases.push({ x: xOffset, y, width: part, height: rowHeight, type: 'missing' });
        xOffset += part;
      });
    }
    if (xOffset !== screenWidth) layout.valid = false;
  }
  if (bottomHeight > 0) {
    const y = fullRows * rowHeight;
    let xOffset = 0;
    const allowed = getAllowedWidthsForHeight(bottomHeight, LED_ROTATED.width).length > 0
      ? getAllowedWidthsForHeight(bottomHeight, LED_ROTATED.width)
      : [LED_ROTATED.width];
    allowed.sort((a, b) => b - a);
    const { partition, missing } = partitionColumnsWithMissing(screenWidth, allowed, LED_ROTATED.width);
    partition.forEach(seg => {
      const match = findMatchingCustomCase(seg, bottomHeight);
      if (match) layout.customCases.push({ x: xOffset, y, width: seg, height: bottomHeight, type: 'custom (pre-made)' });
      else layout.missingCases.push({ x: xOffset, y, width: seg, height: bottomHeight, type: 'missing' });
      xOffset += seg;
    });
    if (missing > 0) {
      const parts = splitMissing(missing, LED_ROTATED.width);
      parts.forEach(part => {
        layout.missingCases.push({ x: xOffset, y, width: part, height: bottomHeight, type: 'missing' });
        xOffset += part;
      });
    }
    if (xOffset !== screenWidth) layout.valid = false;
  }
  return layout;
}

// ----- Transform Layout for 90° Clockwise Rotation -----
// Transforme un layout portrait (calculé pour [w, h]) en layout paysage.
// Pour chaque cellule : newX = cell.y, newY = containerWidth - cell.x - cell.width,
// newWidth = cell.height, newHeight = cell.width.
function transformLayout(layout, containerWidth) {
  const transformed = { standardCases: [], customCases: [], missingCases: [], valid: layout.valid, warning: layout.warning };
  function transformCell(cell) {
    return {
      x: cell.y,
      y: containerWidth - cell.x - cell.width,
      width: cell.height,
      height: cell.width,
      type: cell.type
    };
  }
  transformed.standardCases = layout.standardCases.map(transformCell);
  transformed.customCases = layout.customCases.map(transformCell);
  transformed.missingCases = layout.missingCases.map(transformCell);
  return transformed;
}

// ----- Candidate Selection -----
// Calcule à la fois un layout portrait et un layout pivoté, et choisit le meilleur
// en comparant la validité et la surface totale manquante.
function chooseLayout(w, h) {
  const numericWidth = Number(w);
  const numericHeight = Number(h);
  const portrait = computeStandardLayout(numericWidth, numericHeight);
  const rotated = transformLayout(computeStandardLayout(numericHeight, numericWidth), numericHeight);
  // Helper : calcul de la surface manquante
  const missingArea = (layout) =>
    layout.missingCases.reduce((sum, cell) => sum + cell.width * cell.height, 0);
  if (portrait.valid && rotated.valid) {
    return missingArea(portrait) <= missingArea(rotated)
      ? { layout: portrait, mode: 'standard' }
      : { layout: rotated, mode: 'rotated' };
  }
  if (portrait.valid) return { layout: portrait, mode: 'standard' };
  if (rotated.valid) return { layout: rotated, mode: 'rotated' };
  // Fallback : choisir celui avec le moins de surface manquante.
  return missingArea(portrait) <= missingArea(rotated)
    ? { layout: portrait, mode: 'standard' }
    : { layout: rotated, mode: 'rotated' };
}

// ----- Global LED Module Grid Rendering -----
function renderGlobalSubdivisions(c, scale, moduleWidth, moduleHeight, screenWidth, screenHeight) {
  const lines = [];
  for (let x = 0; x <= screenWidth; x += moduleWidth) {
    if (x > c.x && x < c.x + c.width) {
      lines.push(
        <line
          key={`gv-${x}-${c.x}`}
          x1={x * scale}
          y1={c.y * scale}
          x2={x * scale}
          y2={(c.y + c.height) * scale}
          stroke="white"
          strokeWidth="1"
        />
      );
    }
  }
  for (let y = 0; y <= screenHeight; y += moduleHeight) {
    if (y > c.y && y < c.y + c.height) {
      lines.push(
        <line
          key={`gh-${y}-${c.y}`}
          x1={c.x * scale}
          y1={y * scale}
          x2={(c.x + c.width) * scale}
          y2={y * scale}
          stroke="white"
          strokeWidth="1"
        />
      );
    }
  }
  return lines;
}

function computeModuleCount(c, moduleWidth, moduleHeight) {
  return (c.width / moduleWidth) * (c.height / moduleHeight);
}

// ----- Main Component -----
function GridOptimizer() {
  // Entrées par défaut, modifiables selon vos besoins.
  const [screenWidth, setScreenWidth] = useState(1120);
  const [screenHeight, setScreenHeight] = useState(640);
  const [selectedPanel, setSelectedPanel] = useState(ledPanels[0].id);

  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    color: '#fff',
    backgroundColor: '#222',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '900px',
    margin: '20px auto'
  };
  const headingStyle = {
    marginBottom: '15px',
    borderBottom: '2px solid #555',
    paddingBottom: '5px'
  };
  const infoStyle = { margin: '8px 0', fontSize: '16px' };
  const inputStyle = {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#fff'
  };
  const listStyle = { listStyleType: 'none', padding: '0' };
  const subHeadingStyle = { marginTop: '15px', textDecoration: 'underline' };

  const candidate = chooseLayout(screenWidth, screenHeight);
  const finalLayout = candidate.layout;
  const mode = candidate.mode;
  // Selon le mode choisi, on définit l'orientation des modules LED :
  // Pour un mode 'standard' (boîtier 1120×640), on utilise LED_ROTATED (160×320) car 1120/160 = 7 et 640/320 = 2.
  // Pour un mode 'rotated' (boîtier 640×1120), on utilise LED_STANDARD (320×160).
  const ledModule = mode === 'standard' ? LED_ROTATED : LED_STANDARD;
  

  // Post-traitement des cellules manquantes.
  if (finalLayout.missingCases.length > 0) {
    const subdivided = subdivideMissingCells(finalLayout.missingCases, ledModule.width, ledModule.height);
    const invalidRed = subdivided.some(cell => cell.width !== ledModule.width || cell.height !== ledModule.height);
    if (invalidRed) {
      finalLayout.valid = false;
      finalLayout.warning = "Certaines zones rouges ne se subdivisent pas correctement en modules LED complets.";
    }
    finalLayout.missingCases = subdivided;
  }

  const screenArea = screenWidth * screenHeight;
  const computedArea =
    finalLayout.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    finalLayout.customCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    finalLayout.missingCases.reduce((sum, c) => sum + c.width * c.height, 0);
  const areaWarning =
    finalLayout.warning ||
    (computedArea !== screenArea ? "WARNING: Les cellules calculées ne couvrent pas entièrement l'écran!" : "");

  const totalModules =
    finalLayout.standardCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0) +
    finalLayout.customCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0);

  // Calcul de la consommation
  const selectedPanelObj = ledPanels.find(panel => panel.id === selectedPanel);
  const areaInM2 = (screenWidth * 0.001) * (screenHeight * 0.001);
  const consumption = selectedPanelObj ? areaInM2 * selectedPanelObj.wattPerM2 : 0;

  const scale = 0.2;

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Grid Optimizer & Consumption Calculator</h2>
      <div style={{ marginBottom: '15px' }}>
        <label style={infoStyle}>
          Width (mm):&nbsp;
          <input
            type="number"
            style={inputStyle}
            value={screenWidth}
            onChange={(e) => setScreenWidth(Number(e.target.value))}
          />
        </label>
        <label style={{ ...infoStyle, marginLeft: '15px' }}>
          Height (mm):&nbsp;
          <input
            type="number"
            style={inputStyle}
            value={screenHeight}
            onChange={(e) => setScreenHeight(Number(e.target.value))}
          />
        </label>
        <label style={{ ...infoStyle, marginLeft: '15px' }}>
          LED Panel:&nbsp;
          <select value={selectedPanel} onChange={(e) => setSelectedPanel(e.target.value)} style={inputStyle}>
            {ledPanels.map(panel => (
              <option key={panel.id} value={panel.id}>
                {panel.name} ({panel.wattPerM2} W/m²)
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={infoStyle}>Screen: {screenWidth} x {screenHeight} mm</p>
      <p style={infoStyle}>Layout mode: {mode} ({finalLayout.valid ? "Valid" : "Invalid tiling!"})</p>
      {areaWarning && (
        <p style={{ ...infoStyle, color: '#ff4d4d', fontWeight: 'bold' }}>
          {areaWarning}
        </p>
      )}
      <p style={infoStyle}>Total LED Modules Used: {totalModules.toFixed(1)}</p>
      <svg
        width={screenWidth * scale}
        height={screenHeight * scale}
        style={{ border: '1px solid #555', background: '#333', display: 'block', margin: '20px auto' }}
      >
        {finalLayout.standardCases.map((c, i) => (
          <g key={`std-${i}`}>
            <rect
              x={c.x * scale}
              y={c.y * scale}
              width={c.width * scale}
              height={c.height * scale}
              fill="green"
              stroke="white"
              strokeWidth="2"
            />
            {renderGlobalSubdivisions(c, scale, ledModule.width, ledModule.height, screenWidth, screenHeight)}
            <text
              x={(c.x + c.width / 2) * scale}
              y={(c.y + c.height / 2) * scale}
              fill="white"
              fontSize="16"
              textAnchor="middle"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
            >
              {c.width}x{c.height}
            </text>
          </g>
        ))}
        {finalLayout.customCases.map((c, i) => (
          <g key={`cust-${i}`}>
            <rect
              x={c.x * scale}
              y={c.y * scale}
              width={c.width * scale}
              height={c.height * scale}
              fill="orange"
              stroke="white"
              strokeWidth="2"
            />
            {renderGlobalSubdivisions(c, scale, ledModule.width, ledModule.height, screenWidth, screenHeight)}
            <text
              x={(c.x + c.width / 2) * scale}
              y={(c.y + c.height / 2) * scale}
              fill="white"
              fontSize="16"
              textAnchor="middle"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
            >
              {c.width}x{c.height}
            </text>
          </g>
        ))}
        {finalLayout.missingCases.map((c, i) => (
          <g key={`miss-${i}`}>
            <rect
              x={c.x * scale}
              y={c.y * scale}
              width={c.width * scale}
              height={c.height * scale}
              fill="red"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={(c.x + c.width / 2) * scale}
              y={(c.y + c.height / 2) * scale}
              fill="white"
              fontSize="16"
              textAnchor="middle"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
            >
              {c.width}x{c.height}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#333', borderRadius: '6px' }}>
        <h3 style={{ color: '#fff' }}>Estimated Consumption</h3>
        <p style={infoStyle}>Screen Area: {areaInM2.toFixed(2)} m²</p>
        <p style={infoStyle}>
          {selectedPanelObj ? `${selectedPanelObj.name} (${selectedPanelObj.wattPerM2} W/m²)` : ''}
        </p>
        <p style={{ ...infoStyle, fontWeight: 'bold' }}>
          Total Consumption: {consumption.toFixed(2)} W
        </p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3 style={subHeadingStyle}>Cell Summary</h3>
        <div style={infoStyle}>
          <strong>Standard:</strong>
          <ul style={listStyle}>
            {Object.entries(generateCaseSummary(finalLayout.standardCases)).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
        <div style={infoStyle}>
          <strong>Custom:</strong>
          <ul style={listStyle}>
            {Object.entries(generateCaseSummary(finalLayout.customCases)).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
        {Object.keys(generateCaseSummary(finalLayout.missingCases)).length > 0 && (
          <div style={infoStyle}>
            <strong>Missing:</strong>
            <ul style={listStyle}>
              {Object.entries(generateCaseSummary(finalLayout.missingCases)).map(([size, count]) => (
                <li key={size}>{size}: {count}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default GridOptimizer;
