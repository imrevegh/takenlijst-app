# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Takenlijst App" - a task management application with link preview functionality. The app runs as a Node.js/Express server on Render.com serving a categorized task list with drag-and-drop functionality, automatic URL metadata extraction, and memory-based data persistence.

## Architecture

### Core Components
- **server.js**: Express server with session-based authentication, REST API, and URL metadata extraction
- **public/script.js**: Frontend TakenlijstApp class managing UI interactions with SortableJS
- **public/index.html**: Main application interface
- **public/login.html**: Authentication interface
- **public/style.css**: CSS with comprehensive styling and visual feedback
- **data/tasks.json**: Legacy file structure (not used on Render)

### Key Features
- **Session Authentication**: Basic auth with session management and automatic logout
- **Categorized Tasks**: Default categories plus custom categories with color coding
- **Link Previews**: Automatic OpenGraph/Twitter metadata extraction from URLs in task text
- **Advanced Drag & Drop**: SortableJS-based task reordering within/between categories
- **Star System**: Favorites boost tasks to top position, unfavoriting preserves position
- **Memory-Based Persistence**: All data stored in server memory (Render deployment)

## Deployment

### Render.com Deployment
- **Production Platform**: Render.com (automatic deployment on git push)
- **Dependencies**: `npm install` installs Express, Cheerio, Axios, CORS, compression, express-session
- **Start Command**: `npm start` runs `node server.js`
- **Data Storage**: Memory-only storage (`memoryTasks` variable)
- **File System**: Ephemeral - all files reset on deployment

### Authentication
- **Credentials**: Set via `AUTH_USER` and `AUTH_PASS` environment variables
- **Default**: username: "admin", password: "password" (change in production)
- **Session Management**: Express-session with configurable session secret

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks and categories
- `POST /api/tasks` - Create new task (auto-extracts link metadata)
- `PUT /api/tasks/:id` - Update task text, category, completion status
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/move-before` - Move task before another task (drag-and-drop)
- `PUT /api/tasks/:id/move-after` - Move task after another task (drag-and-drop)
- `PUT /api/tasks/:id/move` - Move task up/down using sortOrder (legacy)
- `PUT /api/tasks/:id/favorite` - Toggle favorite status

### Categories  
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category name/color
- `DELETE /api/categories/:id` - Delete category (moves tasks to "algemeen")

### Authentication & Data Management
- `POST /auth/login` - Authenticate with username/password
- `POST /auth/logout` - End session and clear authentication
- `POST /api/import` - Import data with automatic backup creation

## Data Structure

### Tasks
- `id`: Unique identifier (timestamp string)
- `text`: Task content (may contain URLs for link extraction)
- `completed`: Boolean completion status
- `category`: Category identifier (defaults to "algemeen")
- `createdAt`: ISO timestamp of creation
- `lastModified`: Timestamp for optimistic updates and conflict resolution
- `sortOrder`: Numeric order for positioning (lower = higher in list)
- `favorite`: Boolean favorite status (star system for boosting to top)
- `links[]`: Array of extracted link metadata objects

### Categories
- `name`: Display name
- `color`: Hex color code for visual identification

### Links (auto-extracted from URLs in task text)
- `title`: Page title from OpenGraph/Twitter meta or `<title>` tag
- `description`: Meta description
- `image`: Preview image URL (with data URI fallbacks)
- `url`: Original URL

## Critical Development Notes

### Render.com Deployment Architecture
- **CRITICAL**: App runs exclusively on Render.com with ephemeral file system
- **Data Persistence**: Uses ONLY memory storage (`memoryTasks` variable)
- **File System**: Completely ephemeral - no file persistence available
- **Environment**: `IS_RENDER = true` (always memory-only)
- **Data Loss**: Memory resets on each deployment (git push)

### Data Persistence Implementation
- **saveTasks() Function**: Memory-only storage with comprehensive logging
- **loadTasks() Function**: Reads from memory (`memoryTasks`) with fallback to defaults
- **Cache Management**: 30-second cache (`tasksCache`) for performance optimization
- **NEVER rely on file system** - all data exists only in server memory

### Star/Favorite System Implementation
- **Star ON**: Task jumps to `sortOrder = 1`, other tasks shift down (+1)
- **Star OFF**: Task stays in current position (`sortOrder` unchanged)
- **Client Sorting**: Only by `sortOrder`, no favorite-first logic
- **Behavior**: "Boost to top" rather than "always on top"

### Drag-and-Drop System Architecture  
- **SortableJS Integration**: Modern drag-and-drop with `onMove` and `onEnd` callbacks
- **Cross-Category Drops**: Uses `document.elementFromPoint()` for accurate drop detection
- **Movement APIs**: `/api/tasks/:id/move-before` and `/api/tasks/:id/move-after`
- **Visual Feedback**: `.category-drop-target` highlighting during drag operations
- **Important**: Uses SortableJS events, not conflicting mouse events

### Frontend State Management & Optimistic Updates
- **Optimistic Updates**: UI changes immediately, server sync in background
- **Error Handling**: Reverts optimistic changes on server errors
- **Task Rendering**: `renderTasks()` rebuilds entire list for consistency
- **Inline Editing**: Double-click with textarea replacement, preserves text selection
- **Authentication**: Automatic redirect to `/login.html` on 401 responses

## Technical Implementation Details

### Server Configuration
- **Port**: Application runs on port 3000 (or `process.env.PORT` on Render)
- **Session Security**: Configurable session secret via `SESSION_SECRET` environment variable
- **Request Timeouts**: 30-second timeouts for better performance after inactivity
- **Compression**: Gzip enabled for performance optimization
- **CORS**: Enabled for development flexibility

### Link Preview System
- **URL Detection**: Automatic regex matching in task text
- **Metadata Extraction**: Uses Cheerio for OpenGraph/Twitter card parsing
- **Fallback Images**: Data URI fallbacks when external images fail to load
- **Performance**: Async extraction without blocking task creation

### Logging & Debugging
- **Environment Logging**: Always shows "RENDER (memory-only storage)"
- **Save Operations**: Comprehensive logging with 💾 emoji prefix
- **Authentication**: Session state and redirect logging
- **Error Handling**: Detailed error logs for troubleshooting
- **Memory Operations**: Clear logging of memory storage operations

### Important Git Workflow
- **Auto-Deploy**: Every `git push` triggers automatic Render deployment
- **Memory Reset**: Each deployment clears in-memory data on Render
- **Critical**: Always commit and push changes immediately after implementation