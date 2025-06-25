/**
 * Takenlijst App - A modern task management application
 * Features: drag & drop, categories, favorites, inline editing, search
 * 
 * @class TakenlijstApp
 */
class TakenlijstApp {
    constructor() {
        this.tasks = [];
        this.categories = {};
        this.activeCategory = null;
        this.showCompleted = false;
        this.searchTerm = '';
        this.selectedTasks = new Set();
        this.sortableInstance = null;
        this.draggedTask = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.setupEventListeners();
        this.loadDarkMode();
        this.initDragAndDrop();
        await this.loadData();
        this.setActiveCategory('algemeen');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Task management
        this.getElementById('add-task-btn').addEventListener('click', () => this.addTask());
        this.getElementById('task-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTask();
            }
        });

        // Category management
        this.getElementById('add-category-btn').addEventListener('click', () => this.addCategory());
        this.getElementById('new-category-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCategory();
            }
        });

        // Controls
        this.getElementById('sync-btn').addEventListener('click', () => this.syncData());
        this.getElementById('toggle-completed').addEventListener('click', () => this.toggleCompleted());
        this.getElementById('dark-mode-toggle').addEventListener('click', () => this.toggleDarkMode());
        this.getElementById('search-input').addEventListener('input', (e) => this.filterTasks(e.target.value));
        
        // Import/Export
        this.getElementById('export-btn').addEventListener('click', () => this.exportData());
        this.getElementById('import-btn').addEventListener('click', () => this.getElementById('import-file').click());
        this.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * Helper method for getting elements by ID
     * @param {string} id - Element ID
     * @returns {HTMLElement} The element
     */
    getElementById(id) {
        return document.getElementById(id);
    }

    /**
     * Load tasks and categories from the server
     */
    async loadData() {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            this.tasks = data.tasks || [];
            this.categories = data.categories || {};
            this.renderCategories();
            this.renderTasks();
        } catch (error) {
            console.error('Server not running, attempting to start...', error);
            await this.startServerAndRetry();
        }
    }

    /**
     * Retry loading data when server is not running
     */
    async startServerAndRetry() {
        alert('Server is niet bereikbaar. Start de server handmatig met: ./start-takenlijst.sh');
    }

    /**
     * Add a new task
     */
    async addTask() {
        const taskInput = this.getElementById('task-input');
        const categorySelect = this.getElementById('task-category');
        const text = taskInput.value.trim();
        
        if (!text) return;

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    category: categorySelect.value
                })
            });

            if (response.ok) {
                await this.loadData();
                taskInput.value = '';
                this.showMessage('Taak toegevoegd!', 'success');
            }
        } catch (error) {
            console.error('Error adding task:', error);
            this.showMessage('Fout bij toevoegen taak', 'error');
        }
    }

    /**
     * Toggle task completion status
     * @param {string} taskId - Task ID
     */
    async toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !task.completed })
            });

            if (response.ok) {
                await this.loadData();
            }
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    }

    /**
     * Delete a task
     * @param {string} taskId - Task ID
     */
    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !confirm(`Weet je zeker dat je "${task.text}" wilt verwijderen?`)) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (response.ok) {
                await this.loadData();
                this.showMessage('Taak verwijderd', 'success');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    /**
     * Toggle favorite status of a task
     * @param {string} taskId - Task ID
     */
    async toggleFavorite(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}/favorite`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Task "${task.text}" favorite status toggled to: ${result.favorite}`);
                await this.loadData();
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    /**
     * Edit task inline
     * @param {string} taskId - Task ID
     */
    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const taskTextElement = taskElement.querySelector('.task-text');
        
        // Create inline editor
        const originalText = task.text;
        const textarea = document.createElement('textarea');
        textarea.value = originalText;
        textarea.className = 'inline-editor';
        textarea.style.cssText = `
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border: 2px solid var(--accent-color);
            border-radius: var(--radius);
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 16px;
            line-height: 1.5;
            resize: vertical;
            outline: none;
        `;
        
        // Replace text with textarea
        taskTextElement.style.display = 'none';
        taskTextElement.parentNode.insertBefore(textarea, taskTextElement);
        
        // Focus and select text with proper timing
        textarea.focus();
        setTimeout(() => {
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
        }, 0);
        
        const saveEdit = async () => {
            const newText = textarea.value.trim();
            if (newText === originalText || !newText) {
                cancelEdit();
                return;
            }

            try {
                const response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newText })
                });

                if (response.ok) {
                    const updatedTask = await response.json();
                    const index = this.tasks.findIndex(t => t.id === taskId);
                    this.tasks[index] = updatedTask;
                    
                    // Update only the task text instead of re-rendering everything
                    taskTextElement.textContent = updatedTask.text;
                    taskTextElement.style.display = 'block';
                    textarea.remove();
                    this.showMessage('Taak bijgewerkt', 'success');
                }
            } catch (error) {
                console.error('Error updating task:', error);
                cancelEdit();
            }
        };
        
        const cancelEdit = () => {
            textarea.remove();
            taskTextElement.style.display = 'block';
        };
        
        // Save on Enter, cancel on Escape
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    /**
     * Add a new category
     */
    async addCategory() {
        const nameInput = this.getElementById('new-category-input');
        const colorInput = this.getElementById('category-color');
        const name = nameInput.value.trim();
        
        if (!name) return;

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    color: colorInput.value
                })
            });

            if (response.ok) {
                nameInput.value = '';
                colorInput.value = '#0078d4';
                await this.loadData();
                this.showMessage('Categorie toegevoegd!', 'success');
            }
        } catch (error) {
            console.error('Error adding category:', error);
        }
    }

    /**
     * Delete a category
     * @param {string} categoryId - Category ID
     */
    async deleteCategory(categoryId) {
        if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen? Taken worden verplaatst naar "Algemeen".')) return;

        try {
            const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
            if (response.ok) {
                await this.loadData();
                this.showMessage('Categorie verwijderd', 'success');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    }

    /**
     * Toggle display of completed tasks
     */
    toggleCompleted() {
        this.showCompleted = !this.showCompleted;
        const button = this.getElementById('toggle-completed');
        button.textContent = this.showCompleted ? 'Verberg afgevinkte taken' : 'Toon afgevinkte taken';
        this.renderTasks();
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        const isDark = document.documentElement.dataset.theme === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.dataset.theme = newTheme;
        localStorage.setItem('darkMode', newTheme === 'dark');
        
        const button = this.getElementById('dark-mode-toggle');
        button.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }

    /**
     * Load dark mode preference
     */
    loadDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        const button = this.getElementById('dark-mode-toggle');
        button.textContent = isDark ? '☀️' : '🌙';
    }

    /**
     * Filter tasks by search term
     * @param {string} searchTerm - Search term
     */
    filterTasks(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.renderTasks();
    }

    /**
     * Set active category
     * @param {string} categoryId - Category ID
     */
    setActiveCategory(categoryId) {
        this.activeCategory = categoryId;
        this.updateBackgroundColor();
        this.renderCategories();
        this.renderTasks();
    }

    /**
     * Update background color based on active category
     */
    updateBackgroundColor() {
        const body = document.body;
        if (this.activeCategory && this.categories[this.activeCategory]) {
            const categoryColor = this.categories[this.activeCategory].color;
            body.style.backgroundColor = categoryColor;
        } else {
            body.style.backgroundColor = '';
        }
    }

    /**
     * Render categories in sidebar
     */
    renderCategories() {
        const container = this.getElementById('categories-list');
        const categorySelect = this.getElementById('task-category');
        
        container.innerHTML = '';
        categorySelect.innerHTML = '';

        Object.entries(this.categories).forEach(([id, category]) => {
            const incompleteCount = this.tasks.filter(task => task.category === id && !task.completed).length;
            const isEmpty = incompleteCount === 0;

            // Sidebar category
            const categoryElement = document.createElement('div');
            categoryElement.className = `category-item ${this.activeCategory === id ? 'active' : ''}`;
            
            // Create category content
            const categoryContent = document.createElement('div');
            categoryContent.style.cssText = 'display: flex; align-items: center; flex: 1;';
            
            // Color indicator
            const colorDiv = document.createElement('div');
            colorDiv.className = 'category-color';
            colorDiv.style.backgroundColor = category.color;
            
            // Category name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-name';
            nameSpan.textContent = category.name;
            nameSpan.setAttribute('data-category-id', id);
            
            // Trash button for empty categories (not 'algemeen')
            let trashButton = null;
            if (id !== 'algemeen' && isEmpty) {
                trashButton = document.createElement('button');
                trashButton.className = 'btn-danger category-trash';
                trashButton.innerHTML = '🗑️';
                trashButton.title = 'Verwijder lege categorie';
                trashButton.style.cssText = 'margin-left: 8px; padding: 2px 6px; font-size: 0.8em; opacity: 1;';
                
                trashButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.deleteCategory(id);
                });
            }
            
            // Category count
            const countSpan = document.createElement('span');
            countSpan.className = 'category-count';
            countSpan.textContent = `${incompleteCount}`;
            
            // Assemble category content
            categoryContent.appendChild(colorDiv);
            categoryContent.appendChild(nameSpan);
            if (trashButton) {
                categoryContent.appendChild(trashButton);
            }
            
            categoryElement.appendChild(categoryContent);
            categoryElement.appendChild(countSpan);
            
            // Add event listeners
            this.setupCategoryEventListeners(categoryElement, id, nameSpan);
            
            container.appendChild(categoryElement);

            // Category select option
            const option = document.createElement('option');
            option.value = id;
            option.textContent = category.name;
            option.style.color = category.color;
            if (id === this.activeCategory) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
    }

    /**
     * Setup event listeners for category elements
     * @param {HTMLElement} categoryElement - Category element
     * @param {string} categoryId - Category ID
     * @param {HTMLElement} nameElement - Name element
     */
    setupCategoryEventListeners(categoryElement, id, nameElement) {
        let isDoubleClick = false;
        
        // Double-click to edit (except 'algemeen')
        if (id !== 'algemeen') {
            categoryElement.addEventListener('dblclick', (e) => {
                if (e.target.closest('.category-trash')) return;
                isDoubleClick = true;
                e.preventDefault();
                e.stopPropagation();
                this.editCategoryName(id, nameElement);
                
                setTimeout(() => { isDoubleClick = false; }, 100);
            });
        }
        
        // Single click handler
        categoryElement.addEventListener('click', (e) => {
            if (e.target.closest('.category-trash')) return;
            if (isDoubleClick) return;
            
            setTimeout(() => {
                if (!isDoubleClick) {
                    this.setActiveCategory(id);
                }
            }, 10);
        });
        
        // Mouse events for drag & drop
        categoryElement.addEventListener('mouseenter', this.handleCategoryMouseEnter);
        categoryElement.addEventListener('mouseleave', this.handleCategoryMouseLeave);
        categoryElement.addEventListener('mouseup', this.handleCategoryMouseUp);
    }

    /**
     * Render tasks list
     */
    renderTasks() {
        const container = this.getElementById('tasks-list');
        container.innerHTML = '';

        // Filter tasks
        let filteredTasks = this.tasks;
        
        if (this.searchTerm && this.searchTerm.trim()) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(this.searchTerm)
            );
        }
        
        if (this.activeCategory && (!this.searchTerm || !this.searchTerm.trim())) {
            filteredTasks = filteredTasks.filter(task => task.category === this.activeCategory);
        }
        
        if (!this.showCompleted) {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        // Sort tasks
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            const aOrder = a.sortOrder || 0;
            const bOrder = b.sortOrder || 0;
            return aOrder - bOrder;
        });

        // Render each task
        filteredTasks.forEach((task, index) => {
            const category = this.categories[task.category] || { name: 'Unknown', color: '#666' };
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${this.selectedTasks.has(task.id) ? 'selected' : ''}`;
            taskElement.dataset.taskId = task.id;
            taskElement.draggable = true;
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <div class="drag-handle" title="Sleep om te verplaatsen">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <circle cx="3" cy="3" r="1"/>
                            <circle cx="9" cy="3" r="1"/>
                            <circle cx="3" cy="6" r="1"/>
                            <circle cx="9" cy="6" r="1"/>
                            <circle cx="3" cy="9" r="1"/>
                            <circle cx="9" cy="9" r="1"/>
                        </svg>
                    </div>
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="app.toggleTask('${task.id}')">
                    <div class="task-content">
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        ${task.links && task.links.length > 0 ? this.renderLinkPreviews(task.links) : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-favorite-always ${task.favorite ? 'favorite-active' : ''}" 
                            onclick="app.toggleFavorite('${task.id}')" 
                            title="${task.favorite ? 'Favoriet uitzetten' : 'Als favoriet markeren'}">
                        ${task.favorite ? '★' : '☆'}
                    </button>
                    <button class="btn-danger" onclick="app.deleteTask('${task.id}')" 
                            style="font-size: 0.7em; padding: 2px 4px;">🗑️</button>
                </div>
            `;
            
            // Set border color based on category
            taskElement.style.borderLeftColor = category.color;
            taskElement.style.borderLeftWidth = '4px';
            
            // Add event listeners for editing and selection
            this.setupTaskEventListeners(taskElement, task);
            
            container.appendChild(taskElement);
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Geen taken gevonden</div>';
        }

        // Reinitialize sortable after rendering
        this.initSortable();
    }

    /**
     * Setup event listeners for task elements
     * @param {HTMLElement} taskElement - Task element
     * @param {Object} task - Task object
     */
    setupTaskEventListeners(taskElement, task) {
        let isDoubleClick = false;
        
        taskElement.addEventListener('dblclick', (e) => {
            // Don't trigger if clicking on controls or inline editor
            if (e.target.closest('.task-actions') || 
                e.target.closest('.task-checkbox') || 
                e.target.closest('.link-preview') || 
                e.target.closest('.drag-handle') || 
                e.target.closest('.btn-favorite-always') || 
                e.target.closest('.inline-editor')) {
                return;
            }
            isDoubleClick = true;
            e.preventDefault();
            e.stopPropagation();
            this.editTask(task.id);
            
            setTimeout(() => { isDoubleClick = false; }, 100);
        });
        
        taskElement.addEventListener('click', (e) => {
            // Don't trigger if clicking on controls or inline editor
            if (e.target.closest('.task-actions') || 
                e.target.closest('.task-checkbox') || 
                e.target.closest('.link-preview') || 
                e.target.closest('.drag-handle') || 
                e.target.closest('.btn-favorite-always') || 
                e.target.closest('.inline-editor')) {
                return;
            }
            
            if (isDoubleClick) return;
            
            setTimeout(() => {
                if (!isDoubleClick) {
                    this.toggleTaskSelection(task.id, e.ctrlKey || e.metaKey);
                }
            }, 10);
        });
    }

    /**
     * Initialize drag and drop functionality
     */
    initDragAndDrop() {
        this.sortableInstance = null;
    }

    /**
     * Initialize SortableJS for drag and drop
     */
    initSortable() {
        const container = this.getElementById('tasks-list');
        
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
        
        this.sortableInstance = Sortable.create(container, {
            group: { name: 'tasks', pull: true, put: true },
            animation: 150,
            ghostClass: 'task-ghost',
            chosenClass: 'task-chosen',
            dragClass: 'task-drag',
            handle: '.drag-handle',
            
            onStart: (evt) => {
                const taskId = evt.item.dataset.taskId;
                this.draggedTask = this.tasks.find(t => t.id === taskId);
                this.setupCategoryDropTargets();
            },
            
            onEnd: async (evt) => {
                this.removeCategoryDropTargets();
                this.draggedTask = null;
                
                if (evt.oldIndex === evt.newIndex) return;
                
                await this.handleSortableMove(evt);
            }
        });
    }

    /**
     * Handle sortable move events
     * @param {Object} evt - SortableJS event
     */
    async handleSortableMove(evt) {
        const draggedTaskId = evt.item.dataset.taskId;
        const draggedTask = this.tasks.find(t => t.id === draggedTaskId);
        
        const container = this.getElementById('tasks-list');
        const allTaskElements = Array.from(container.children).filter(el => el.classList.contains('task-item'));
        
        const draggedElement = evt.item;
        const draggedIndex = allTaskElements.indexOf(draggedElement);
        
        let targetTask = null;
        let moveType = 'after';
        
        if (allTaskElements.length <= 1) return;
        
        if (draggedIndex === 0) {
            const secondElement = allTaskElements[1];
            const secondTaskId = secondElement.dataset.taskId;
            targetTask = this.tasks.find(t => t.id === secondTaskId);
            moveType = 'before';
        } else if (draggedIndex === allTaskElements.length - 1) {
            const prevElement = allTaskElements[draggedIndex - 1];
            const prevTaskId = prevElement.dataset.taskId;
            targetTask = this.tasks.find(t => t.id === prevTaskId);
            moveType = 'after';
        } else {
            const prevElement = allTaskElements[draggedIndex - 1];
            const prevTaskId = prevElement.dataset.taskId;
            targetTask = this.tasks.find(t => t.id === prevTaskId);
            moveType = 'after';
        }
        
        if (!targetTask) return;
        
        try {
            const endpoint = moveType === 'before' ? 'move-before' : 'move-after';
            const response = await fetch(`/api/tasks/${draggedTaskId}/${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetTaskId: targetTask.id })
            });
            
            if (response.ok) {
                await this.loadData();
            } else {
                await this.loadData();
            }
        } catch (error) {
            console.error('Error moving task:', error);
            await this.loadData();
        }
    }

    /**
     * Setup category drop targets for drag and drop
     */
    setupCategoryDropTargets() {
        const categories = document.querySelectorAll('.category-item');
        categories.forEach(categoryEl => {
            categoryEl.addEventListener('mouseenter', this.handleCategoryMouseEnter);
            categoryEl.addEventListener('mouseleave', this.handleCategoryMouseLeave);
            categoryEl.addEventListener('mouseup', this.handleCategoryMouseUp);
        });
    }

    /**
     * Remove category drop targets
     */
    removeCategoryDropTargets() {
        const categories = document.querySelectorAll('.category-item');
        categories.forEach(categoryEl => {
            categoryEl.removeEventListener('mouseenter', this.handleCategoryMouseEnter);
            categoryEl.removeEventListener('mouseleave', this.handleCategoryMouseLeave);
            categoryEl.removeEventListener('mouseup', this.handleCategoryMouseUp);
            categoryEl.classList.remove('category-drop-target');
        });
    }

    handleCategoryMouseEnter = (e) => {
        if (this.draggedTask) {
            e.currentTarget.classList.add('category-drop-target');
        }
    }

    handleCategoryMouseLeave = (e) => {
        e.currentTarget.classList.remove('category-drop-target');
    }

    handleCategoryMouseUp = async (e) => {
        if (!this.draggedTask) return;
        
        const categoryElement = e.currentTarget;
        categoryElement.classList.remove('category-drop-target');
        
        const categoryNameElement = categoryElement.querySelector('.category-name');
        const targetCategoryId = categoryNameElement.getAttribute('data-category-id');
        
        if (this.draggedTask && this.draggedTask.category !== targetCategoryId) {
            try {
                const response = await fetch(`/api/tasks/${this.draggedTask.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: targetCategoryId })
                });
                
                if (response.ok) {
                    await this.loadData();
                }
            } catch (error) {
                console.error('Error moving task to category:', error);
            }
        }
    }

    /**
     * Toggle task selection
     * @param {string} taskId - Task ID
     * @param {boolean} multiSelect - Whether to use multi-select
     */
    toggleTaskSelection(taskId, multiSelect = false) {
        if (!multiSelect) {
            if (this.selectedTasks.has(taskId) && this.selectedTasks.size === 1) {
                this.selectedTasks.clear();
            } else {
                this.selectedTasks.clear();
                this.selectedTasks.add(taskId);
            }
        } else {
            if (this.selectedTasks.has(taskId)) {
                this.selectedTasks.delete(taskId);
            } else {
                this.selectedTasks.add(taskId);
            }
        }
        
        this.renderTasks();
    }

    /**
     * Edit category name inline
     * @param {string} categoryId - Category ID
     * @param {HTMLElement} nameElement - Name element
     */
    async editCategoryName(categoryId, nameElement) {
        const originalName = this.categories[categoryId].name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.className = 'inline-category-editor';
        input.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--accent-color);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 14px;
            font-weight: 400;
            padding: 2px 6px;
            width: 100%;
        `;
        
        nameElement.style.display = 'none';
        nameElement.parentNode.insertBefore(input, nameElement);
        input.focus();
        input.select();
        
        const saveEdit = async () => {
            const newName = input.value.trim();
            if (newName && newName !== originalName) {
                try {
                    await fetch(`/api/categories/${categoryId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName })
                    });
                    
                    await this.loadData();
                } catch (error) {
                    console.error('Error updating category:', error);
                    cancelEdit();
                }
            } else {
                cancelEdit();
            }
        };
        
        const cancelEdit = () => {
            input.remove();
            nameElement.style.display = 'block';
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
        
        input.addEventListener('blur', saveEdit);
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeydown(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    this.getElementById('task-input').focus();
                    break;
                case 'f':
                    e.preventDefault();
                    this.getElementById('search-input').focus();
                    break;
            }
        }
    }

    /**
     * Export data to JSON file
     */
    exportData() {
        const data = {
            categories: this.categories,
            tasks: this.tasks,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `takenlijst-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showMessage('Data geëxporteerd!', 'success');
    }

    /**
     * Import data from JSON file
     * @param {Event} event - File input change event
     */
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                await this.loadData();
                this.showMessage('Data geïmporteerd!', 'success');
            } else {
                throw new Error('Import failed');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.showMessage('Fout bij importeren', 'error');
        }
        
        event.target.value = '';
    }

    /**
     * Render link previews
     * @param {Array} links - Array of link objects
     * @returns {string} HTML for link previews
     */
    renderLinkPreviews(links) {
        return `
            <div class="link-previews">
                ${links.map(link => `
                    <a href="${link.url}" target="_blank" class="link-preview">
                        <img src="${link.image}" alt="" class="link-preview-image" 
                             onerror="this.style.display='none'">
                        <div class="link-preview-content">
                            <div class="link-preview-title">${this.escapeHtml(link.title)}</div>
                            ${link.description ? `<div class="link-preview-description">${this.escapeHtml(link.description)}</div>` : ''}
                            <div class="link-preview-url">${this.escapeHtml(link.url)}</div>
                        </div>
                    </a>
                `).join('')}
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show notification message
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, info)
     */
    showMessage(message, type = 'info') {
        // Remove existing messages
        document.querySelectorAll('.notification-message').forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            background: ${type === 'success' ? '#107c10' : type === 'error' ? '#d13438' : '#0078d4'};
        `;
        
        document.body.appendChild(messageDiv);
        
        // Animate in
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-20px)';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }

    /**
     * Sync data with server
     */
    async syncData() {
        const syncBtn = this.getElementById('sync-btn');
        const originalText = syncBtn.textContent;
        
        try {
            // Show loading state
            syncBtn.textContent = '🔄 Syncing...';
            syncBtn.disabled = true;
            
            // Reload data from server
            await this.loadData();
            this.renderTasks();
            this.renderCategories();
            
            // Show success message
            this.showMessage('Data gesynchroniseerd!', 'success');
            
            // Briefly show success state
            syncBtn.textContent = '✅ Synced';
            setTimeout(() => {
                syncBtn.textContent = originalText;
            }, 1500);
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.showMessage('Synchronisatie mislukt', 'error');
            syncBtn.textContent = originalText;
        } finally {
            syncBtn.disabled = false;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TakenlijstApp();
});