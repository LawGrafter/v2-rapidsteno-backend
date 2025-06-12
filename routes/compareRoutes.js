const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

router.post('/', (req, res) => {
  const { original, user_input } = req.body;

  const scriptPath = path.join(__dirname, '../utils/compare.py');
const python = spawn('python', [scriptPath]);


  const input = JSON.stringify({ original, user_input });

  let data = '';
  python.stdout.on('data', (chunk) => {
    data += chunk.toString();
  });

  python.stderr.on('data', (err) => {
    console.error('Python Error:', err.toString());
  });

  python.on('close', () => {
    try {
      const result = JSON.parse(data);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse Python response' });
    }
  });

  python.stdin.write(input);
  python.stdin.end();
});

module.exports = router;
