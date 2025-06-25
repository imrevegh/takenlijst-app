const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const compression = require('compression');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

app.use(compression()); // Enable gzip compression
app.use(express.json());

// Basic Authentication (before CORS)
app.use(basicAuth({
  users: { [process.env.AUTH_USER || 'admin']: process.env.AUTH_PASS || 'password' },
  challenge: true,
  realm: 'Takenlijst App'
}));

// CORS after authentication
app.use(cors());

// Serve static files with appropriate caching
app.use(express.static('public', {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0', // No cache in dev, 1h in production
  etag: true,
  setHeaders: (res, path) => {
    // For CSS and JS files, use shorter cache for easier development
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache');
    }
  }
}));

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Load tasks from JSON file
async function loadTasks() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Ensure all tasks have favorite field for backward compatibility
    if (parsed.tasks) {
      parsed.tasks = parsed.tasks.map(task => ({
        ...task,
        favorite: task.favorite || false
      }));
      
      // Assign sortOrder to tasks that don't have it
      let needsSorting = false;
      parsed.tasks.forEach(task => {
        if (task.sortOrder === undefined || task.sortOrder === null) {
          needsSorting = true;
        }
      });
      
      if (needsSorting) {
        // Group by category and assign sortOrder
        const categories = {};
        parsed.tasks.forEach(task => {
          if (!categories[task.category]) {
            categories[task.category] = [];
          }
          categories[task.category].push(task);
        });
        
        // Sort each category and assign sortOrder
        Object.values(categories).forEach(categoryTasks => {
          categoryTasks
            .sort((a, b) => {
              // Sort by existing lastModified or createdAt
              const aTime = a.lastModified || new Date(a.createdAt).getTime() || 0;
              const bTime = b.lastModified || new Date(b.createdAt).getTime() || 0;
              return bTime - aTime; // Newest first
            })
            .forEach((task, index) => {
              task.sortOrder = index + 1;
            });
        });
        
        // Save the updated data
        await saveTasks(parsed);
      }
    }
    
    return parsed;
  } catch (error) {
    return { categories: { 'algemeen': { name: 'Algemeen', color: '#3498db', tasks: [] } }, tasks: [] };
  }
}

// Save tasks to JSON file
async function saveTasks(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Get fallback image based on URL type (using data URIs for offline support)
function getFallbackImage(url) {
  const fallbackImages = [
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjNjM2NmYxIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMTUiIHI9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+Cjwvc3ZnPgo=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjOGI1Y2Y2Ii8+Cjxwb2x5Z29uIHBvaW50cz0iMjAsMTAgMzAsMjUgMTAsMjUiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPgo=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMTBiOTgxIi8+CjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4K',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZjU5ZTBiIi8+CjxjaXJjbGUgY3g9IjE1IiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4zIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTgiIHI9IjYiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+Cjwvc3ZnPgo=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZWY0NDQ0Ii8+CjxwYXRoIGQ9Ik0xMCAxMEwyMCAyMEwzMCAxMCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz4KPC9zdmc+Cg=='
  ];
  
  // Choose fallback based on URL hash for consistency
  const hash = url.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
  return fallbackImages[Math.abs(hash) % fallbackImages.length];
}

// Extract metadata from URL
async function getUrlMetadata(url) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    let image = $('meta[property="og:image"]').attr('content') || 
                $('meta[name="twitter:image"]').attr('content') || 
                '';
    
    // If no image found, use fallback
    if (!image) {
      image = getFallbackImage(url);
    }
    
    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || 
             $('meta[name="twitter:title"]').attr('content') || 
             $('title').text() || 
             url,
      description: $('meta[property="og:description"]').attr('content') || 
                  $('meta[name="twitter:description"]').attr('content') || 
                  $('meta[name="description"]').attr('content') || 
                  '',
      image: image,
      url: url
    };
    
    return metadata;
  } catch (error) {
    console.error('Error fetching metadata for', url, ':', error.message);
    return {
      title: url,
      description: '',
      image: getFallbackImage(url),
      url: url
    };
  }
}

// API Routes
app.get('/api/tasks', async (req, res) => {
  const data = await loadTasks();
  
  // Sort tasks: incomplete first, then by category, then by sortOrder
  data.tasks.sort((a, b) => {
    // Incomplete tasks first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then by category
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    
    // Within same category: by sortOrder (lower = higher in list)
    const aOrder = a.sortOrder || 0;
    const bOrder = b.sortOrder || 0;
    return aOrder - bOrder;
  });
  
  res.json(data);
});

app.post('/api/tasks', async (req, res) => {
  const data = await loadTasks();
  
  // New tasks get added to top of category
  const targetCategory = req.body.category || 'algemeen';
  const now = Date.now();
  
  // Get all tasks in target category and shift them down
  const categoryTasks = data.tasks.filter(t => t.category === targetCategory);
  categoryTasks.forEach(task => {
    task.sortOrder = (task.sortOrder || 0) + 1;
  });
  
  const newTask = {
    id: now.toString(),
    text: req.body.text,
    completed: false,
    favorite: false,
    category: targetCategory,
    createdAt: new Date().toISOString(),
    sortOrder: 1,
    links: []
  };
  
  // Extract links from task text and get metadata
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = newTask.text.match(urlRegex) || [];
  
  for (const url of urls) {
    const metadata = await getUrlMetadata(url);
    newTask.links.push(metadata);
  }
  
  data.tasks.push(newTask);
  await saveTasks(data);
  res.json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
  const data = await loadTasks();
  const taskIndex = data.tasks.findIndex(task => task.id === req.params.id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const oldTask = data.tasks[taskIndex];
  data.tasks[taskIndex] = { ...oldTask, ...req.body };
  
  // If category changed, move to top of new category
  if (req.body.category && req.body.category !== oldTask.category) {
    // Update lastModified to make it appear at top of new category
    data.tasks[taskIndex].lastModified = Date.now() + 3;
    // Remove sortOrder to rely on lastModified
    delete data.tasks[taskIndex].sortOrder;
  }
  
  // Re-extract links if text changed
  if (req.body.text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = req.body.text.match(urlRegex) || [];
    data.tasks[taskIndex].links = [];
    
    for (const url of urls) {
      const metadata = await getUrlMetadata(url);
      data.tasks[taskIndex].links.push(metadata);
    }
  }
  
  await saveTasks(data);
  res.json(data.tasks[taskIndex]);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const data = await loadTasks();
  data.tasks = data.tasks.filter(task => task.id !== req.params.id);
  await saveTasks(data);
  res.json({ success: true });
});

app.get('/api/categories', async (req, res) => {
  const data = await loadTasks();
  res.json(data.categories);
});

app.post('/api/categories', async (req, res) => {
  const data = await loadTasks();
  const categoryId = req.body.name.toLowerCase().replace(/\s+/g, '_');
  data.categories[categoryId] = {
    name: req.body.name,
    color: req.body.color || '#3498db'
  };
  await saveTasks(data);
  res.json(data.categories[categoryId]);
});

app.put('/api/categories/:id', async (req, res) => {
  const data = await loadTasks();
  const categoryId = req.params.id;
  
  if (!data.categories[categoryId]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  // Update category name and/or color
  if (req.body.name) {
    data.categories[categoryId].name = req.body.name;
  }
  if (req.body.color) {
    data.categories[categoryId].color = req.body.color;
  }
  
  await saveTasks(data);
  res.json(data.categories[categoryId]);
});

app.delete('/api/categories/:id', async (req, res) => {
  const data = await loadTasks();
  
  // Move tasks from deleted category to 'algemeen'
  data.tasks.forEach(task => {
    if (task.category === req.params.id) {
      task.category = 'algemeen';
    }
  });
  
  delete data.categories[req.params.id];
  await saveTasks(data);
  res.json({ success: true });
});

// Move task before another task using sortOrder
app.put('/api/tasks/:id/move-before', async (req, res) => {
  try {
    const data = await loadTasks();
    const { targetTaskId } = req.body;
    const taskId = req.params.id;
    
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const targetTask = data.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) {
      return res.status(404).json({ error: 'Target task not found' });
    }
    
    // Move to target's category
    task.category = targetTask.category;
    
    // Get all tasks in target category sorted by sortOrder
    const categoryTasks = data.tasks
      .filter(t => t.category === targetTask.category && t.id !== taskId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Find target task position and reassign sortOrder values
    const targetIndex = categoryTasks.findIndex(t => t.id === targetTaskId);
    
    // Insert task before target
    categoryTasks.splice(targetIndex, 0, task);
    
    // Reassign sortOrder values
    categoryTasks.forEach((t, index) => {
      t.sortOrder = index + 1;
    });
    
    await saveTasks(data);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move task after another task using sortOrder
app.put('/api/tasks/:id/move-after', async (req, res) => {
  try {
    const data = await loadTasks();
    const { targetTaskId } = req.body;
    const taskId = req.params.id;
    
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const targetTask = data.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) {
      return res.status(404).json({ error: 'Target task not found' });
    }
    
    // Move to target's category
    task.category = targetTask.category;
    
    // Get all tasks in target category sorted by sortOrder
    const categoryTasks = data.tasks
      .filter(t => t.category === targetTask.category && t.id !== taskId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Find target task position and reassign sortOrder values
    const targetIndex = categoryTasks.findIndex(t => t.id === targetTaskId);
    
    // Insert task after target
    categoryTasks.splice(targetIndex + 1, 0, task);
    
    // Reassign sortOrder values
    categoryTasks.forEach((t, index) => {
      t.sortOrder = index + 1;
    });
    
    await saveTasks(data);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle favorite status of a task
app.put('/api/tasks/:id/favorite', async (req, res) => {
  try {
    const data = await loadTasks();
    const taskId = req.params.id;
    
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Toggle favorite status
    task.favorite = !task.favorite;
    
    // If setting as favorite, move to position #1 in category
    if (task.favorite) {
      // Get all tasks in same category, excluding the current task
      const categoryTasks = data.tasks.filter(t => 
        t.category === task.category && t.id !== taskId
      );
      
      // Set this task to sortOrder 1
      task.sortOrder = 1;
      
      // Shift all other tasks in same category down by 1
      categoryTasks.forEach(t => {
        t.sortOrder = (t.sortOrder || 0) + 1;
      });
    }
    // If unfavoriting, keep current sortOrder (task stays in same position)
    
    await saveTasks(data);
    res.json({ success: true, favorite: task.favorite });
    
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import data endpoint
app.post('/api/import', async (req, res) => {
  try {
    const importData = req.body;
    
    // Basic validation
    if (!importData.categories || !importData.tasks) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    // Ensure data directory exists
    await ensureDataDir();
    
    // Create backup of current data
    const currentData = await loadTasks();
    const backupFilename = `tasks-backup-${Date.now()}.json`;
    const backupPath = path.join(__dirname, 'data', backupFilename);
    
    try {
      await fs.writeFile(backupPath, JSON.stringify(currentData, null, 2));
    } catch (backupError) {
      console.warn('Could not create backup:', backupError);
    }
    
    // Prepare data for import
    const newData = {
      categories: importData.categories,
      tasks: importData.tasks
    };
    
    // Ensure 'algemeen' category exists
    if (!newData.categories.algemeen) {
      newData.categories.algemeen = {
        name: 'Algemeen',
        color: '#3498db'
      };
    }
    
    // Validate task data and fix any issues
    newData.tasks = newData.tasks.map(task => ({
      ...task,
      id: task.id || Date.now().toString() + Math.random().toString(36).substr(2),
      category: task.category || 'algemeen',
      completed: Boolean(task.completed),
      favorite: Boolean(task.favorite),
      createdAt: task.createdAt || new Date().toISOString(),
      sortOrder: task.sortOrder || 0,
      links: task.links || []
    }));
    
    // Save imported data
    await saveTasks(newData);
    
    res.json({ 
      success: true, 
      imported: {
        categories: Object.keys(newData.categories).length,
        tasks: newData.tasks.length
      }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed: ' + error.message });
  }
});

// Move task up/down using sortOrder system (keep for arrow buttons)
app.put('/api/tasks/:id/move', async (req, res) => {
  try {
    const data = await loadTasks();
    const { direction } = req.body;
    const taskId = req.params.id;
    
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get all tasks in the same category, sorted by sortOrder
    const categoryTasks = data.tasks
      .filter(t => t.category === task.category)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    const currentIndex = categoryTasks.findIndex(t => t.id === taskId);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap sortOrder with previous task
      const prevTask = categoryTasks[currentIndex - 1];
      const tempOrder = task.sortOrder;
      task.sortOrder = prevTask.sortOrder;
      prevTask.sortOrder = tempOrder;
    } else if (direction === 'down' && currentIndex < categoryTasks.length - 1) {
      // Swap sortOrder with next task
      const nextTask = categoryTasks[currentIndex + 1];
      const tempOrder = task.sortOrder;
      task.sortOrder = nextTask.sortOrder;
      nextTask.sortOrder = tempOrder;
    } else {
      return res.json({ success: false, message: 'Cannot move in that direction' });
    }
    
    await saveTasks(data);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fix sortOrder for all tasks
app.post('/api/fix-sortorder', async (req, res) => {
  try {
    const data = await loadTasks();
    
    // Group by category and assign sortOrder
    const categories = {};
    data.tasks.forEach(task => {
      if (!categories[task.category]) {
        categories[task.category] = [];
      }
      categories[task.category].push(task);
    });
    
    // Sort each category and assign sortOrder
    Object.values(categories).forEach(categoryTasks => {
      categoryTasks
        .sort((a, b) => {
          // Sort by existing lastModified or createdAt
          const aTime = a.lastModified || new Date(a.createdAt).getTime() || 0;
          const bTime = b.lastModified || new Date(b.createdAt).getTime() || 0;
          return bTime - aTime; // Newest first
        })
        .forEach((task, index) => {
          task.sortOrder = index + 1;
        });
    });
    
    await saveTasks(data);
    res.json({ success: true, message: 'sortOrder assigned to all tasks' });
  } catch (error) {
    console.error('Error fixing sortOrder:', error);
    res.status(500).json({ error: 'Failed to fix sortOrder' });
  }
});

// Endpoint to start server (for auto-startup from frontend)
app.post('/start-server', async (req, res) => {
  // This endpoint exists mainly for the frontend to call when server isn't running
  // Since this endpoint is being called, the server is already running
  res.json({ success: true, message: 'Server is already running' });
});

// Start server
async function startServer() {
  console.log('🚀 Takenlijst server wordt opgestart...');
  
  try {
    await ensureDataDir();
    console.log('✅ Data directory gereed');
    
    // Verify we can load tasks
    await loadTasks();
    console.log('✅ Tasks geladen');
    
    app.listen(PORT, () => {
      console.log(`🌐 Takenlijst app draait op http://localhost:${PORT}`);
      console.log('✅ Server is volledig operationeel!');
      console.log('Druk op Ctrl+C om te stoppen');
    });
    
  } catch (error) {
    console.error('❌ Fout bij opstarten:', error);
    process.exit(1);
  }
}

startServer();