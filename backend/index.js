const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.send('FreedomSpeech API Backend is actively running!');
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FreedomSpeech backend is running' });
});

// We can add future API routes here for decoupling Next.js from Supabase directly
// e.g., app.use('/api/posts', postsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
