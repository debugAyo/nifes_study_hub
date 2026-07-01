const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const extractRoutes = require('./routes/extract');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', extractRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`NIFES Study Hub server running on http://localhost:${PORT}`);
});
