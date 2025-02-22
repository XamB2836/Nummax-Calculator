// server/index.js
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Exemple d'API pour calculer la disposition
app.post('/api/compute-layout', (req, res) => {
  const { nombreBoitiers, rotationAutorisee } = req.body;
  // Ici, vous appelez votre module d’optimisation
  const layout = {
    boitiers: [
      { x: 0, y: 0, width: 1120, height: 640, rotation: 0, custom: false }
    ],
    screen: { width: 1120, height: 640 }
  };
  res.json(layout);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
