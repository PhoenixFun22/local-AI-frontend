import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const STORAGE_DIR = path.join(process.cwd(), 'user_storage');

app.use(express.json({ limit: '50mb' }));

// In-memory session store
const sessions = new Map<string, { username: string; role: string; firstName: string; lastName: string }>();

// Ensure storage dir exists
async function initStorage() {
  if (!existsSync(STORAGE_DIR)) {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
  const configPath = path.join(STORAGE_DIR, 'global_config.json');
  if (!existsSync(configPath)) {
    await fs.writeFile(configPath, JSON.stringify({ disableSignups: false }, null, 2));
  }
}

// Helper to check if any user folder exists
async function checkHasAdmin(): Promise<boolean> {
  try {
    const entries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Double check if profile exists and role is admin
        const profilePath = path.join(STORAGE_DIR, entry.name, 'profile.txt');
        if (existsSync(profilePath)) {
          const content = await fs.readFile(profilePath, 'utf-8');
          if (content.includes('Role: admin')) {
            return true;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking admin presence:', e);
  }
  return false;
}

// Middleware to authenticate session
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No authorization token provided' });
    return;
  }

  const session = sessions.get(token);
  if (!session) {
    res.status(403).json({ error: 'Invalid or expired session' });
    return;
  }

  (req as any).user = session;
  (req as any).token = token;
  next();
}

// 1. Get auth status (whether admin signup is needed)
app.get('/api/auth/status', async (req, res) => {
  try {
    const hasAdmin = await checkHasAdmin();
    const configPath = path.join(STORAGE_DIR, 'global_config.json');
    let disableSignups = false;
    if (existsSync(configPath)) {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      disableSignups = !!config.disableSignups;
    }
    res.json({ hasAdmin, disableSignups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, firstName, lastName, role, authFile, encryptedChats, encryptedCanvases, encryptedSettings } = req.body;

    if (!username || !firstName || !lastName || !role || !authFile) {
      res.status(400).json({ error: 'Missing required signup fields' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const userDir = path.join(STORAGE_DIR, cleanUsername);

    if (existsSync(userDir)) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    const hasAdmin = await checkHasAdmin();
    let assignedRole = role;

    // First user is forced to be admin
    if (!hasAdmin) {
      assignedRole = 'admin';
    } else {
      // Check if signups are disabled
      const configPath = path.join(STORAGE_DIR, 'global_config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        if (config.disableSignups && role !== 'admin') {
          res.status(403).json({ error: 'New registrations are currently disabled by the administrator' });
          return;
        }
      }
    }

    // Create user folder
    await fs.mkdir(userDir, { recursive: true });

    // Write profile.txt (Unencrypted basic user details)
    const profileContent = `First Name: ${firstName.trim()}\nLast Name: ${lastName.trim()}\nRole: ${assignedRole}\n`;
    await fs.writeFile(path.join(userDir, 'profile.txt'), profileContent, 'utf-8');

    // Write encrypted account/auth & user data files
    await fs.writeFile(path.join(userDir, 'auth.enc'), authFile, 'utf-8');
    await fs.writeFile(path.join(userDir, 'chats.enc'), encryptedChats || '', 'utf-8');
    await fs.writeFile(path.join(userDir, 'canvases.enc'), encryptedCanvases || '', 'utf-8');
    await fs.writeFile(path.join(userDir, 'settings.enc'), encryptedSettings || '', 'utf-8');

    // Create a new session
    const sessionToken = crypto.randomUUID();
    sessions.set(sessionToken, {
      username: cleanUsername,
      role: assignedRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    res.json({
      success: true,
      sessionToken,
      role: assignedRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: cleanUsername
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get user profile (for key derivation on login)
app.post('/api/auth/get-profile', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const userDir = path.join(STORAGE_DIR, cleanUsername);

    if (!existsSync(userDir)) {
      res.status(404).json({ error: 'User does not exist' });
      return;
    }

    const profileContent = await fs.readFile(path.join(userDir, 'profile.txt'), 'utf-8');
    const authFile = await fs.readFile(path.join(userDir, 'auth.enc'), 'utf-8');

    // Parse profile.txt fields
    const lines = profileContent.split('\n');
    let firstName = '';
    let lastName = '';
    let role = 'user';

    for (const line of lines) {
      if (line.startsWith('First Name:')) firstName = line.replace('First Name:', '').trim();
      if (line.startsWith('Last Name:')) lastName = line.replace('Last Name:', '').trim();
      if (line.startsWith('Role:')) role = line.replace('Role:', '').trim();
    }

    res.json({
      username: cleanUsername,
      firstName,
      lastName,
      role,
      authFile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Complete login session establishment (proof of correct decryption)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, verifiedSignature } = req.body;
    if (!username || !verifiedSignature) {
      res.status(400).json({ error: 'Missing login parameters' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const userDir = path.join(STORAGE_DIR, cleanUsername);

    if (!existsSync(userDir)) {
      res.status(404).json({ error: 'User does not exist' });
      return;
    }

    // Read details
    const profileContent = await fs.readFile(path.join(userDir, 'profile.txt'), 'utf-8');
    const lines = profileContent.split('\n');
    let firstName = '';
    let lastName = '';
    let role = 'user';

    for (const line of lines) {
      if (line.startsWith('First Name:')) firstName = line.replace('First Name:', '').trim();
      if (line.startsWith('Last Name:')) lastName = line.replace('Last Name:', '').trim();
      if (line.startsWith('Role:')) role = line.replace('Role:', '').trim();
    }

    // Verify proof
    if (verifiedSignature.username !== cleanUsername || verifiedSignature.status !== 'verified') {
      res.status(400).json({ error: 'Failed signature proof authentication' });
      return;
    }

    // Login successful - establish session
    const sessionToken = crypto.randomUUID();
    sessions.set(sessionToken, {
      username: cleanUsername,
      role,
      firstName,
      lastName,
    });

    res.json({
      success: true,
      sessionToken,
      role,
      firstName,
      lastName,
      username: cleanUsername
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Retrieve encrypted files
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userDir = path.join(STORAGE_DIR, user.username);

    let encryptedChats = '';
    let encryptedCanvases = '';
    let encryptedSettings = '';

    const chatsPath = path.join(userDir, 'chats.enc');
    const canvasesPath = path.join(userDir, 'canvases.enc');
    const settingsPath = path.join(userDir, 'settings.enc');

    if (existsSync(chatsPath)) encryptedChats = await fs.readFile(chatsPath, 'utf-8');
    if (existsSync(canvasesPath)) encryptedCanvases = await fs.readFile(canvasesPath, 'utf-8');
    if (existsSync(settingsPath)) encryptedSettings = await fs.readFile(settingsPath, 'utf-8');

    res.json({
      encryptedChats,
      encryptedCanvases,
      encryptedSettings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Save encrypted files
app.post('/api/user/save', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userDir = path.join(STORAGE_DIR, user.username);
    const { encryptedChats, encryptedCanvases, encryptedSettings } = req.body;

    if (!existsSync(userDir)) {
      await fs.mkdir(userDir, { recursive: true });
    }

    if (encryptedChats !== undefined) {
      await fs.writeFile(path.join(userDir, 'chats.enc'), encryptedChats, 'utf-8');
    }
    if (encryptedCanvases !== undefined) {
      await fs.writeFile(path.join(userDir, 'canvases.enc'), encryptedCanvases, 'utf-8');
    }
    if (encryptedSettings !== undefined) {
      await fs.writeFile(path.join(userDir, 'settings.enc'), encryptedSettings, 'utf-8');
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get user list (Admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Permission denied: Administrator privilege required' });
      return;
    }

    const userList: any[] = [];
    const entries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const profilePath = path.join(STORAGE_DIR, entry.name, 'profile.txt');
        if (existsSync(profilePath)) {
          const profileContent = await fs.readFile(profilePath, 'utf-8');
          const lines = profileContent.split('\n');
          let firstName = '';
          let lastName = '';
          let role = 'user';

          for (const line of lines) {
            if (line.startsWith('First Name:')) firstName = line.replace('First Name:', '').trim();
            if (line.startsWith('Last Name:')) lastName = line.replace('Last Name:', '').trim();
            if (line.startsWith('Role:')) role = line.replace('Role:', '').trim();
          }

          userList.push({
            username: entry.name,
            firstName,
            lastName,
            role
          });
        }
      }
    }

    res.json({ users: userList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete user folder (Admin only)
app.post('/api/admin/delete-user', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Permission denied: Administrator privilege required' });
      return;
    }

    const { targetUsername } = req.body;
    if (!targetUsername) {
      res.status(400).json({ error: 'Target username is required' });
      return;
    }

    const cleanTarget = targetUsername.trim().toLowerCase();

    // Prevent deleting self
    if (cleanTarget === user.username) {
      res.status(400).json({ error: 'You cannot delete your own administrative account' });
      return;
    }

    const targetDir = path.join(STORAGE_DIR, cleanTarget);
    if (existsSync(targetDir)) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    // Clean up active sessions of deleted user
    for (const [token, session] of sessions.entries()) {
      if (session.username === cleanTarget) {
        sessions.delete(token);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Toggle registration settings (Admin only)
app.post('/api/admin/toggle-signups', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Permission denied: Administrator privilege required' });
      return;
    }

    const { disableSignups } = req.body;
    if (disableSignups === undefined) {
      res.status(400).json({ error: 'disableSignups parameter is required' });
      return;
    }

    const configPath = path.join(STORAGE_DIR, 'global_config.json');
    await fs.writeFile(configPath, JSON.stringify({ disableSignups: !!disableSignups }, null, 2));

    res.json({ success: true, disableSignups: !!disableSignups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Boot the full stack server
async function startServer() {
  await initStorage();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
