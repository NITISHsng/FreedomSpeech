require('dotenv').config();

console.log('--- Backend Initialization ---');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Defined' : '❌ UNDEFINED');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Defined' : '❌ UNDEFINED');

const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('--- Backend Initialization ---');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Defined' : '❌ UNDEFINED');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✅ Defined' : '❌ UNDEFINED');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ CRITICAL ERROR: Supabase environment variables are missing (SUPABASE_URL or SUPABASE_KEY)');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Set up server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// --- REST API ENDPOINTS ---

// Root endpoint
app.get('/', (req, res) => {
  res.send('FreedomSpeech API Backend is running!');
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is fully operational' });
});

// Upload media
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const userId = req.body.userId || 'anonymous';
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    res.json({ publicUrl });
  } catch (err) {
    console.error('Upload API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch all groups
app.get('/api/groups', async (req, res) => {
  const { data, error } = await supabase.from('groups').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Fetch single group details
app.get('/api/groups/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create a new group
app.post('/api/groups', async (req, res) => {
  const { name, slug, description } = req.body;
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, slug, description })
    .select()
    .maybeSingle();
  
  if (error) return res.status(400).json({ error: error.message });
  
  io.emit('groups_changed');
  res.json(data);
});

// Fetch posts for a specific group
app.get('/api/posts', async (req, res) => {
  const { groupId, userId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'groupId is required' });

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles (username),
      reply_to:reply_to_id (
        content,
        profiles (username)
      ),
      reactions (
        emoji,
        user_id
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });

  // Process reactions
  const processedPosts = data.map((post) => {
    const reactionsMap = {};
    post.reactions?.forEach((r) => {
      reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
    });
    const userReaction = post.reactions?.find((r) => r.user_id === userId)?.emoji || null;
    return { ...post, reactions: reactionsMap, user_reaction: userReaction };
  });

  res.json(processedPosts);
});

// Create a new post
app.post('/api/posts', async (req, res) => {
  const { group_id, user_id, content, media_urls, reply_to_id } = req.body;
  
  const insertData = { group_id, user_id, content, media_urls, reply_to_id };
  const { data: postData, error } = await supabase.from('posts').insert(insertData).select().maybeSingle();
  
  if (error) return res.status(400).json({ error: error.message });

  // Log to history
  await supabase.from('history').insert({ 
    user_id, 
    action_type: 'post_created', 
    action_id: postData.id, 
    metadata: { group_id } 
  });

  io.to(group_id).emit('refresh_posts');
  res.json(postData);
});

// Toggle reaction
app.post('/api/reactions', async (req, res) => {
  const { post_id, user_id, emoji, group_id } = req.body;

  const { data: existing } = await supabase
    .from('reactions')
    .select('*')
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing) {
    if (existing.emoji === emoji) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
    }
  } else {
    await supabase.from('reactions').insert({ post_id, user_id, emoji });
    await supabase.from('history').insert({ 
      user_id, 
      action_type: 'reacted_to_post', 
      action_id: post_id, 
      metadata: { emoji } 
    });
  }

  io.to(group_id).emit('refresh_posts');
  res.json({ success: true });
});

// Fetch user profile
app.get('/api/profiles/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, password')
    .eq('id', req.params.id)
    .maybeSingle();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update or Create profile
app.post('/api/profiles', async (req, res) => {
  const { id, username, password } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, username, password })
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Reclaim Ghost ID
app.post('/api/profiles/reclaim', async (req, res) => {
  const { id, password } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, password, username')
    .eq('id', id.trim())
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Ghost ID not found" });

  if (data.password && data.password !== password?.trim()) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.json(data);
});

// Fetch user history
app.get('/api/history', async (req, res) => {
  const { userId } = req.query;
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

// --- SOCKET HANDLERS ---
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on('join_room', (groupId) => {
    socket.join(groupId);
    console.log(`👤 Client ${socket.id} joined room: ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Decoupled Backend running on port ${PORT}`);
});
