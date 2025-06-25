# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Takenlijst App" - a local task management application with link preview functionality. The app runs locally as a Node.js/Express server serving a categorized task list with drag-and-drop functionality, automatic URL metadata extraction, and data persistence.

## Architecture

### Core Components
- **server.js**: Express server handling REST API and metadata extraction
- **public/script.js**: Frontend TakenlijstApp class managing UI interactions
- **public/index.html**: Single-page HTML interface
- **public/style.css**: CSS with dark/light theme support
- **data/tasks.json**: JSON data store for tasks and categories

### Key Features
- **Categorized Tasks**: Default "algemeen" category plus custom categories with colors
- **Link Previews**: Automatic OpenGraph/Twitter metadata extraction from URLs in task text
- **Drag & Drop**: Task reordering within/between categories using sortOrder system
- **Data Persistence**: File-based JSON storage in data/ directory
- **Theme Support**: Dark/light mode with localStorage persistence

## Development Commands

### Starting the Application
- `npm start` - Start production server on port 3000
- `npm run dev` - Start development server with nodemon
- `./start-takenlijst.sh` - Comprehensive startup script with PM2 support

### Installation
- `npm install` - Install dependencies (Express, Cheerio, Axios, CORS, compression)
- Optional: `npm install -g pm2` - For production process management

### Server Management (with PM2)
- `pm2 list` - Show running processes  
- `pm2 stop takenlijst` - Stop the app
- `pm2 logs takenlijst` - View logs
- `pm2 restart takenlijst` - Restart app

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks and categories
- `POST /api/tasks` - Create new task (auto-extracts link metadata)
- `PUT /api/tasks/:id` - Update task text, category, completion status
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/move-before` - Move task before another task (drag-and-drop)
- `PUT /api/tasks/:id/move-after` - Move task after another task (drag-and-drop)
- `PUT /api/tasks/:id/move` - Move task up/down using sortOrder (legacy arrow buttons)
- `PUT /api/tasks/:id/favorite` - Toggle favorite status

### Categories  
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category name/color
- `DELETE /api/categories/:id` - Delete category (moves tasks to "algemeen")

### Data Management
- `POST /api/import` - Import data with automatic backup creation

## Data Structure

### Tasks
- `id`: Unique identifier (timestamp string)
- `text`: Task content (may contain URLs for link extraction)
- `completed`: Boolean completion status
- `category`: Category identifier (defaults to "algemeen")
- `createdAt`: ISO timestamp of creation
- `lastModified`: Timestamp for drag-and-drop ordering (newer = higher position)
- `sortOrder`: Numeric order for legacy arrow-button movement
- `favorite`: Boolean favorite status (favorites appear first in category)
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

### Data Integrity & Backup
- **ALWAYS backup before major changes**: `cp public/script.js public/script_backup.js` 
- **Restore on issues**: `cp public/script_backup.js public/script.js` if tasks disappear
- **File Storage**: Tasks persist to data/tasks.json with atomic writes - data loss is critical to avoid

### Drag-and-Drop System Architecture  
- **Two Movement APIs**: `/api/tasks/:id/move-before` and `/api/tasks/:id/move-after` for drag-and-drop positioning
- **Legacy Arrow Buttons**: `/api/tasks/:id/move` with `direction: up/down` for manual reordering
- **Task Ordering**: Uses `lastModified` timestamps for drag-and-drop, `sortOrder` for arrows
- **Drop Indicators**: "Drop hier" visual feedback managed by `showDropIndicator()` and `hideDropIndicator()`

### Edit Functionality Implementation
- **Inline Editing**: Double-click tasks opens textarea editor in-place
- **Text Selection**: Must preserve native text selection - avoid `stopPropagation()` on mousedown/click
- **Save Methods**: Ctrl+Enter to save, Escape to cancel, blur to auto-save after 150ms delay
- **Critical**: Never disable `draggable` attribute during editing - causes task disappearance

### Frontend State Management
- **Task Rendering**: `renderTasks()` rebuilds entire task list - expensive but ensures consistency
- **Category Filtering**: `activeCategory` determines visible tasks, null shows all
- **Search Integration**: Search overrides category filtering when active
- **Selection System**: Multi-select with Ctrl+click, visual feedback via CSS classes

## Technical Implementation Details

- **Port**: Application runs on port 3000
- **Fallback Images**: Data URI fallbacks when link previews fail to load images  
- **Compression**: Gzip enabled for performance
- **CORS**: Enabled for development flexibility
- **Link Detection**: Automatic URL regex matching with metadata extraction via Cheerio
- **Backup System**: Import creates timestamped backups in data/ directory