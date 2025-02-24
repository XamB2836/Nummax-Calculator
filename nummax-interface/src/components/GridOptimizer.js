import React, { useState } from 'react';

// ----- Fixed Dimensions -----
// Standard (non-rotated) standard cell is fixed at 1120x640.
const STANDARD_WIDTH = 1120;
const STANDARD_HEIGHT = 640;

// Rotated standard cell is fixed at 640x1120.
const ROTATED_WIDTH = 640;
const ROTATED_HEIGHT = 1120;

// For standard layout, full rows are 640 mm tall.
const FULL_ROW_HEIGHT = 640;

// LED module sizes for subdividing cells:
// In standard layout, we want to “rotate” the LED modules so that a 1120×640 cell
// subdivides exactly into 7 columns and 2 rows; that is, use modules of 160×320.
// In rotated layout, we use modules of 320×160.
const LED_STANDARD = { width: 320, height: 160 }; // used in rotated layout
const LED_ROTATED = { width: 160, height: 320 };   // used in standard layout

// ----- Pre-made Custom Cases -----
// Add or update custom case sizes here.
const preMadeCustomCases = [
  { id: 'custom-1120x480', width: 1120, height: 480 },
  { id: 'custom-1440x480', width: 1440, height: 480 },
  { id: 'custom-1120x320', width: 1120, height: 320 },
  { id: 'custom-1280x640', width: 1280, height: 640 },
  { id: 'custom-1280x320', width: 1280, height: 320 },
  { id: 'custom-800x480',  width: 800,  height: 480 },
  { id: 'custom-1600x160', width: 1600, height: 160 },
  { id: 'custom-1280x160', width: 1280, height: 160 },
];

// ----- Allowed Custom Sizes -----
// For standard layout full rows, we use a fixed desired height of 640.
const allowedCustomWidthsStandard = [1120, 1280];
// For bottom rows in standard layout, instead of a fixed height (like 320),
// we now allow ANY remainder that appears in our custom case list.
// (We’ll derive allowed widths dynamically for the actual remainder.)
//
// For rotated layout, bottom row height must be one of the custom case heights available.
// (E.g. if you have cases with height 480, 160, etc., the algorithm will accept a remainder equal to one of those.)
function getAllowedWidthsForHeight(desiredHeight) {
  const widths = new Set();
  preMadeCustomCases.forEach(c => {
    if (c.height === desiredHeight) {
      widths.add(c.width);
    }
  });
  return Array.from(widths).sort((a, b) => a - b);
}

// ----- Partitioning Function -----
// Recursively find one partition (array of numbers) that sums exactly to target,
// using only numbers from allowedSet.
function partitionColumns(target, allowedSet) {
  function helper(remaining, current) {
    if (remaining === 0) return current;
    for (let w of allowedSet) {
      if (w <= remaining) {
        const result = helper(remaining - w, current.concat(w));
        if (result !== null) return result;
      }
    }
    return null;
  }
  return helper(target, []);
}

// ----- Helper Functions -----
// Find a pre-made custom case that exactly matches the given dimensions.
function findMatchingCustomCase(zoneWidth, zoneHeight) {
  return preMadeCustomCases.find(
    (c) => c.width === zoneWidth && c.height === zoneHeight
  );
}

// Generate a summary of cases used, grouped by their dimensions.
function generateCaseSummary(cases) {
  const summary = {};
  cases.forEach(c => {
    const key = `${c.width}x${c.height}`;
    summary[key] = (summary[key] || 0) + 1;
  });
  return summary;
}

// ----- Layout Computation -----
//
// Standard Layout:
// - Full rows: each full row has height 640. We assume standard cells are 1120×640.
//   For each full row, we tile the row by first placing as many standard cells as possible (each 1120 wide),
//   then the residual width (if any) is partitioned using allowed widths for height 640.
// - Bottom row: let bottomRemainder = screenHeight mod 640. If bottomRemainder > 0,
//   then if there exist any custom cases with height equal to bottomRemainder (derived dynamically),
//   we partition the entire row using those allowed widths; otherwise, the layout is invalid.
function computeStandardLayout(screenWidth, screenHeight) {
  const layout = { standardCases: [], customCases: [], valid: true };
  const fullRows = Math.floor(screenHeight / FULL_ROW_HEIGHT);
  const bottomRemainder = screenHeight % FULL_ROW_HEIGHT;
  
  // For full rows:
  const partitionFull = partitionColumns(screenWidth, allowedCustomWidthsStandard);
  if (!partitionFull) {
    layout.valid = false;
    return layout;
  }
  for (let row = 0; row < fullRows; row++) {
    let xOffset = 0;
    partitionFull.forEach(w => {
      if (w === STANDARD_WIDTH) {
        layout.standardCases.push({
          x: xOffset,
          y: row * FULL_ROW_HEIGHT,
          width: w,
          height: FULL_ROW_HEIGHT,
          type: 'standard'
        });
      } else {
        const match = findMatchingCustomCase(w, FULL_ROW_HEIGHT);
        layout.customCases.push({
          x: xOffset,
          y: row * FULL_ROW_HEIGHT,
          width: w,
          height: FULL_ROW_HEIGHT,
          type: match ? 'custom (pre-made)' : 'custom'
        });
      }
      xOffset += w;
    });
  }
  // For bottom row:
  if (bottomRemainder > 0) {
    // Get allowed widths for the actual bottom row height.
    const allowedBottom = getAllowedWidthsForHeight(bottomRemainder);
    if (allowedBottom.length === 0) {
      layout.valid = false;
    } else {
      const partitionBottom = partitionColumns(screenWidth, allowedBottom);
      if (partitionBottom) {
        let xOffset = 0;
        partitionBottom.forEach(w => {
          const match = findMatchingCustomCase(w, bottomRemainder);
          layout.customCases.push({
            x: xOffset,
            y: fullRows * FULL_ROW_HEIGHT,
            width: w,
            height: bottomRemainder,
            type: match ? 'custom (pre-made)' : 'custom'
          });
          xOffset += w;
        });
      } else {
        layout.valid = false;
      }
    }
  }
  return layout;
}

// Rotated Layout:
// - Top row: fill with rotated standard cells (each 640×1120). We require that screenWidth is divisible by 640.
// - Bottom row: let bottomHeight = screenHeight - 1120. If there exist custom cases with that bottom height,
//   partition the entire screen width using the allowed widths for that bottom height.
function computeRotatedLayout(screenWidth, screenHeight) {
  const layout = { standardCases: [], customCases: [], valid: true };
  if (screenWidth % ROTATED_WIDTH !== 0) {
    layout.valid = false;
    return layout;
  }
  const numRotated = screenWidth / ROTATED_WIDTH;
  for (let col = 0; col < numRotated; col++) {
    layout.standardCases.push({
      x: col * ROTATED_WIDTH,
      y: 0,
      width: ROTATED_WIDTH,
      height: ROTATED_HEIGHT,
      type: 'rotated standard'
    });
  }
  const bottomHeight = screenHeight - ROTATED_HEIGHT;
  const allowedRotated = getAllowedWidthsForHeight(bottomHeight);
  if (allowedRotated.length === 0) {
    layout.valid = false;
    return layout;
  }
  const partition = partitionColumns(screenWidth, allowedRotated);
  if (partition) {
    let xOffset = 0;
    partition.forEach(w => {
      const match = findMatchingCustomCase(w, bottomHeight);
      layout.customCases.push({
        x: xOffset,
        y: ROTATED_HEIGHT,
        width: w,
        height: bottomHeight,
        type: match ? 'custom (pre-made)' : 'custom'
      });
      xOffset += w;
    });
  } else {
    layout.valid = false;
  }
  return layout;
}

// ----- LED Module Subdivisions -----
// Draw LED module grid lines inside a cell using given LED module dimensions.
function renderSubdivisions(c, scale, moduleWidth, moduleHeight) {
  const lines = [];
  const startX = Math.ceil(c.x / moduleWidth) * moduleWidth;
  for (let x = startX; x < c.x + c.width; x += moduleWidth) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x * scale}
        y1={c.y * scale}
        x2={x * scale}
        y2={(c.y + c.height) * scale}
        stroke="white"
        strokeWidth="1"
      />
    );
  }
  const startY = Math.ceil(c.y / moduleHeight) * moduleHeight;
  for (let y = startY; y < c.y + c.height; y += moduleHeight) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={c.x * scale}
        y1={y * scale}
        x2={(c.x + c.width) * scale}
        y2={y * scale}
        stroke="white"
        strokeWidth="1"
      />
    );
  }
  return lines;
}

// Compute the number of LED modules in a cell.
function computeModuleCount(c, moduleWidth, moduleHeight) {
  return (c.width / moduleWidth) * (c.height / moduleHeight);
}

// ----- Candidate Selection -----
// Choose between standard and rotated layouts based on validity and exact area coverage.
function chooseLayout(screenWidth, screenHeight) {
  const standard = computeStandardLayout(screenWidth, screenHeight);
  const rotated = computeRotatedLayout(screenWidth, screenHeight);
  const screenArea = screenWidth * screenHeight;
  const areaStandard =
    standard.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    standard.customCases.reduce((sum, c) => sum + c.width * c.height, 0);
  const areaRotated =
    rotated && rotated.valid
      ? rotated.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
        rotated.customCases.reduce((sum, c) => sum + c.width * c.height, 0)
      : -1;
  if (rotated && rotated.valid && areaRotated === screenArea) {
    return { layout: rotated, mode: 'rotated' };
  } else if (standard.valid && areaStandard === screenArea) {
    return { layout: standard, mode: 'standard' };
  }
  if (rotated && rotated.valid && Math.abs(screenArea - areaRotated) < Math.abs(screenArea - areaStandard)) {
    return { layout: rotated, mode: 'rotated' };
  }
  return { layout: standard, mode: 'standard' };
}

// ----- Main Component -----
function GridOptimizer() {
  // Test screen sizes – adjust these to test various cases.
  const [screenWidth, setScreenWidth] = useState(2240);
  const [screenHeight, setScreenHeight] = useState(3200);
  
  const candidate = chooseLayout(screenWidth, screenHeight);
  const finalLayout = candidate.layout;
  const mode = candidate.mode;
  
  // Set LED module dimensions based on layout mode.
  // For standard layout, we want LED modules rotated (160x320) to perfectly subdivide a 1120x640 cell.
  // For rotated layout, we use LED modules in normal orientation (320x160).
  const ledModule = mode === 'rotated' ? LED_STANDARD : LED_ROTATED;
  
  const screenArea = screenWidth * screenHeight;
  const computedArea =
    finalLayout.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    finalLayout.customCases.reduce((sum, c) => sum + c.width * c.height, 0);
  const areaWarning = computedArea !== screenArea ? "WARNING: The computed cells do not completely fill the screen!" : "";
  
  const totalModules =
    finalLayout.standardCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0) +
    finalLayout.customCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0);
  
  const summaryStandard = generateCaseSummary(finalLayout.standardCases);
  const summaryCustom = generateCaseSummary(finalLayout.customCases);
  
  const scale = 0.2;
  
  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Grid Optimizer</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Screen Width (mm):&nbsp;
          <input type="number" value={screenWidth} onChange={(e) => setScreenWidth(parseInt(e.target.value) || 0)} />
        </label>
        <label style={{ marginLeft: '10px' }}>
          Screen Height (mm):&nbsp;
          <input type="number" value={screenHeight} onChange={(e) => setScreenHeight(parseInt(e.target.value) || 0)} />
        </label>
      </div>
      <p>Screen: {screenWidth} x {screenHeight} mm</p>
      <p>Layout mode: {mode} {finalLayout.valid ? "(Valid)" : "(Invalid tiling!)"}</p>
      {areaWarning && <p style={{ color: 'red', fontWeight: 'bold' }}>{areaWarning}</p>}
      <p>Total LED modules used: {totalModules.toFixed(1)}</p>
      <svg width={screenWidth * scale} height={screenHeight * scale} style={{ border: '1px solid #fff', background: '#333' }}>
        {finalLayout.standardCases.map((c, i) => (
          <g key={`std-${i}`}>
            <rect x={c.x * scale} y={c.y * scale} width={c.width * scale} height={c.height * scale} fill="green" stroke="white" strokeWidth="2" />
            {renderSubdivisions(c, scale, ledModule.width, ledModule.height)}
            <text x={(c.x + c.width/2) * scale} y={(c.y + c.height/2) * scale} fill="white" fontSize="16" textAnchor="middle">
              {c.width}x{c.height}
            </text>
          </g>
        ))}
        {finalLayout.customCases.map((c, i) => (
          <g key={`cust-${i}`}>
            <rect x={c.x * scale} y={c.y * scale} width={(c.width || 0) * scale} height={(c.height || 0) * scale} fill="orange" stroke="white" strokeWidth="2" />
            {renderSubdivisions(c, scale, ledModule.width, ledModule.height)}
            <text x={(c.x + c.width/2) * scale} y={(c.y + c.height/2) * scale} fill="white" fontSize="16" textAnchor="middle">
              {c.width}x{c.height}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ marginTop: '10px' }}>
        <h3>Case Summary</h3>
        <div>
          <strong>Standard:</strong>
          <ul>
            {Object.entries(summaryStandard).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Custom:</strong>
          <ul>
            {Object.entries(summaryCustom).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GridOptimizer;
