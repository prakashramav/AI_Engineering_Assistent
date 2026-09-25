import express from 'express';
import { authenticateToken } from './auth/middleware.js';
import { DataService } from './services/dataService.js';

const app = express();
const port = process.env.PORT || 3000;
const dataService = new DataService("https://api.internal.service");

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const data = await dataService.fetchRecords(req.query.search || "");
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
