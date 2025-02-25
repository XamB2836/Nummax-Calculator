import React, { useState } from 'react';

// ----- Fixed Dimensions -----
const STANDARD_WIDTH = 1120;
const STANDARD_HEIGHT = 640;
const ROTATED_WIDTH = 640;
const ROTATED_HEIGHT = 1120;
const FULL_ROW_HEIGHT = 640;

// ----- LED Module Sizes -----
// For standard layout, we use LED modules rotated (160×320)
// For rotated layout, we use LED modules in normal orientation (320×160)
const LED_STANDARD = { width: 320, height: 160 };
const LED_ROTATED = { width: 160, height: 320 };

// ----- Pre-made Custom Cases -----
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

// ----- Allowed Custom Sizes for Tiling -----
function getAllowedWidthsForHeight(desiredHeight) {
  const widths = new Set();
  preMadeCustomCases.forEach(c => {
    if (c.height === desiredHeight) widths.add(c.width);
  });
  return Array.from(widths).sort((a, b) => a - b);
}

// For full rows, allow the standard width and any custom case with height 640.
const allowedCustomWidthsStandard = Array.from(new Set([STANDARD_WIDTH, ...getAllowedWidthsForHeight(FULL_ROW_HEIGHT)]));
// For rotated layout bottom row, we expect a custom case height (e.g., 480)
const allowedCustomHeightsRotated = [480];

// ----- Partitioning Functions -----
// Recursive function to get an exact partition using allowedSet.
function partitionColumnsExact(target, allowedSet) {
  // Try larger cells first.
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

// Partition columns, and if the leftover gap is less than minAllowed,
// merge it with the last partition (if available) so that no missing case is smaller than an LED module.
function partitionColumnsWithMissing(target, allowedSet, minAllowed) {
  const exact = partitionColumnsExact(target, allowedSet);
  if (exact !== null) {
    return { partition: exact, missing: 0 };
  } else {
    const sorted = allowedSet.slice().sort((a, b) => b - a);
    let partition = [];
    let remaining = target;
    for (let w of sorted) {
      while (remaining >= w) {
        partition.push(w);
        remaining -= w;
      }
    }
    // If the leftover gap is too small (smaller than an LED module) merge it with the last partition.
    if (remaining > 0 && remaining < minAllowed && partition.length > 0) {
      partition[partition.length - 1] += remaining;
      remaining = 0;
    }
    return { partition, missing: remaining };
  }
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

// ----- Layout Computation Functions -----

// Standard Layout: partition full rows and bottom row; add missing cells if needed.
function computeStandardLayout(screenWidth, screenHeight) {
  const layout = { standardCases: [], customCases: [], missingCases: [], valid: true };
  const fullRows = Math.floor(screenHeight / FULL_ROW_HEIGHT);
  const bottomHeight = screenHeight % FULL_ROW_HEIGHT;

  // Allowed widths for full rows: standard width and any custom case with height 640.
  const allowedFull = Array.from(new Set([STANDARD_WIDTH, ...getAllowedWidthsForHeight(FULL_ROW_HEIGHT)]));
  
  for (let row = 0; row < fullRows; row++) {
    let xOffset = 0;
    // For standard layout, use LED_ROTATED so minimum allowed width is 160.
    const { partition: partitionFull, missing: missingFull } = partitionColumnsWithMissing(screenWidth, allowedFull, LED_ROTATED.width);
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
    if (missingFull > 0) {
      layout.missingCases.push({
        x: xOffset,
        y: row * FULL_ROW_HEIGHT,
        width: missingFull,
        height: FULL_ROW_HEIGHT,
        type: 'missing'
      });
      xOffset += missingFull;
    }
    if (xOffset !== screenWidth) {
      layout.valid = false;
    }
  }
  
  // Process bottom row if there is a remainder.
  if (bottomHeight > 0) {
    const allowedBottom = getAllowedWidthsForHeight(bottomHeight);
    if (allowedBottom.length === 0) {
      layout.valid = false;
    } else {
      let xOffset = 0;
      const { partition: partitionBottom, missing: missingBottom } = partitionColumnsWithMissing(screenWidth, allowedBottom, LED_ROTATED.width);
      partitionBottom.forEach(w => {
        const match = findMatchingCustomCase(w, bottomHeight);
        layout.customCases.push({
          x: xOffset,
          y: fullRows * FULL_ROW_HEIGHT,
          width: w,
          height: bottomHeight,
          type: match ? 'custom (pre-made)' : 'custom'
        });
        xOffset += w;
      });
      if (missingBottom > 0) {
        layout.missingCases.push({
          x: xOffset,
          y: fullRows * FULL_ROW_HEIGHT,
          width: missingBottom,
          height: bottomHeight,
          type: 'missing'
        });
        xOffset += missingBottom;
      }
      if (xOffset !== screenWidth) {
        layout.valid = false;
      }
    }
  }
  return layout;
}

// Rotated Layout: fill the top row with rotated standard cells and partition the bottom row similarly.
function computeRotatedLayout(screenWidth, screenHeight) {
  const layout = { standardCases: [], customCases: [], missingCases: [], valid: true };
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
  if (bottomHeight < 0) {
    layout.valid = false;
    return layout;
  }
  if (bottomHeight === 0) return layout;
  
  const allowedRotated = getAllowedWidthsForHeight(bottomHeight);
  if (allowedRotated.length === 0) {
    layout.valid = false;
    return layout;
  }
  let xOffset = 0;
  // For rotated layout, bottom row uses LED_STANDARD so the minimum allowed width is 320.
  const { partition: partitionBottom, missing: missingBottom } = partitionColumnsWithMissing(screenWidth, allowedRotated, LED_STANDARD.width);
  partitionBottom.forEach(w => {
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
  if (missingBottom > 0) {
    layout.missingCases.push({
      x: xOffset,
      y: ROTATED_HEIGHT,
      width: missingBottom,
      height: bottomHeight,
      type: 'missing'
    });
    xOffset += missingBottom;
  }
  if (xOffset !== screenWidth) {
    layout.valid = false;
  }
  return layout;
}

// ----- LED Module Subdivisions -----
// Render grid lines within a case. A global grid alignment is used to help minimize overlapping LED modules.
// (TODO: Further optimize overlapping modules across case boundaries if needed.)
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

function computeModuleCount(c, moduleWidth, moduleHeight) {
  return (c.width / moduleWidth) * (c.height / moduleHeight);
}

// ----- Candidate Selection -----
// Choose between standard and rotated layouts based on validity and area coverage.
function chooseLayout(screenWidth, screenHeight) {
  const standard = computeStandardLayout(screenWidth, screenHeight);
  const rotated = computeRotatedLayout(screenWidth, screenHeight);
  const screenArea = screenWidth * screenHeight;
  const areaStandard =
    standard.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    standard.customCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    standard.missingCases.reduce((sum, c) => sum + c.width * c.height, 0);
  const areaRotated =
    rotated && rotated.valid
      ? rotated.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
        rotated.customCases.reduce((sum, c) => sum + c.width * c.height, 0) +
        rotated.missingCases.reduce((sum, c) => sum + c.width * c.height, 0)
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
  // Define some style objects for a cleaner UI.
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
  const infoStyle = {
    margin: '8px 0',
    fontSize: '16px'
  };
  const inputStyle = {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#fff'
  };
  const listStyle = {
    listStyleType: 'none',
    padding: '0'
  };
  const subHeadingStyle = {
    marginTop: '15px',
    textDecoration: 'underline'
  };

  const [screenWidth, setScreenWidth] = useState(1120);
  const [screenHeight, setScreenHeight] = useState(640);
  
  const candidate = chooseLayout(screenWidth, screenHeight);
  const finalLayout = candidate.layout;
  const mode = candidate.mode;
  
  // Choose LED module orientation based on layout mode.
  const ledModule = mode === 'rotated' ? LED_STANDARD : LED_ROTATED;
  
  const screenArea = screenWidth * screenHeight;
  const computedArea =
    finalLayout.standardCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    finalLayout.customCases.reduce((sum, c) => sum + c.width * c.height, 0) +
    finalLayout.missingCases.reduce((sum, c) => sum + c.width * c.height, 0);
  const areaWarning = computedArea !== screenArea ? "WARNING: The computed cells do not completely fill the screen!" : "";
  
  const totalModules =
    finalLayout.standardCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0) +
    finalLayout.customCases.reduce((sum, c) => sum + computeModuleCount(c, ledModule.width, ledModule.height), 0);
    // Missing cells are not used for LED modules.
  
  const summaryStandard = generateCaseSummary(finalLayout.standardCases);
  const summaryCustom = generateCaseSummary(finalLayout.customCases);
  const summaryMissing = generateCaseSummary(finalLayout.missingCases);
  
  const scale = 0.2;
  
  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Grid Optimizer</h2>
      <div style={{ marginBottom: '15px' }}>
        <label style={infoStyle}>
          Screen Width (mm):&nbsp;
          <input
            type="number"
            style={inputStyle}
            value={screenWidth}
            onChange={(e) => setScreenWidth(parseInt(e.target.value) || 0)}
          />
        </label>
        <label style={{ ...infoStyle, marginLeft: '15px' }}>
          Screen Height (mm):&nbsp;
          <input
            type="number"
            style={inputStyle}
            value={screenHeight}
            onChange={(e) => setScreenHeight(parseInt(e.target.value) || 0)}
          />
        </label>
      </div>
      <p style={infoStyle}>Screen: {screenWidth} x {screenHeight} mm</p>
      <p style={infoStyle}>Layout mode: {mode} {finalLayout.valid ? "(Valid)" : "(Invalid tiling!)"}</p>
      {areaWarning && <p style={{ ...infoStyle, color: '#ff4d4d', fontWeight: 'bold' }}>{areaWarning}</p>}
      <p style={infoStyle}>Total LED modules used: {totalModules.toFixed(1)}</p>
      <svg
        width={screenWidth * scale}
        height={screenHeight * scale}
        style={{ border: '1px solid #fff', background: '#333', display: 'block', margin: '20px auto' }}
      >
        {finalLayout.standardCases.map((c, i) => (
          <g key={`std-${i}`}>
            <rect x={c.x * scale} y={c.y * scale} width={c.width * scale} height={c.height * scale} fill="green" stroke="white" strokeWidth="2" />
            {renderSubdivisions(c, scale, ledModule.width, ledModule.height)}
            <text x={(c.x + c.width/2) * scale} y={(c.y + c.height/2) * scale} fill="#fff" fontSize="16" textAnchor="middle" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
              {c.width}x{c.height}
            </text>
          </g>
        ))}
        {finalLayout.customCases.map((c, i) => (
          <g key={`cust-${i}`}>
            <rect x={c.x * scale} y={c.y * scale} width={c.width * scale} height={c.height * scale} fill="orange" stroke="white" strokeWidth="2" />
            {renderSubdivisions(c, scale, ledModule.width, ledModule.height)}
            <text x={(c.x + c.width/2) * scale} y={(c.y + c.height/2) * scale} fill="#fff" fontSize="16" textAnchor="middle" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
              {c.width}x{c.height}
            </text>
          </g>
        ))}
        {finalLayout.missingCases.map((c, i) => (
          <g key={`miss-${i}`}>
            <rect x={c.x * scale} y={c.y * scale} width={c.width * scale} height={c.height * scale} fill="red" stroke="white" strokeWidth="2" />
            <text x={(c.x + c.width/2) * scale} y={(c.y + c.height/2) * scale} fill="#fff" fontSize="16" textAnchor="middle" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
              {c.width}x{c.height}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ marginTop: '20px' }}>
        <h3 style={subHeadingStyle}>Case Summary</h3>
        <div style={infoStyle}>
          <strong>Standard:</strong>
          <ul style={listStyle}>
            {Object.entries(summaryStandard).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
        <div style={infoStyle}>
          <strong>Custom:</strong>
          <ul style={listStyle}>
            {Object.entries(summaryCustom).map(([size, count]) => (
              <li key={size}>{size}: {count}</li>
            ))}
          </ul>
        </div>
        {Object.keys(summaryMissing).length > 0 && (
          <div style={infoStyle}>
            <strong>Missing:</strong>
            <ul style={listStyle}>
              {Object.entries(summaryMissing).map(([size, count]) => (
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
