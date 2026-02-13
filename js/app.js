// API Configuration
const API_URL = 'https://task-manager-backend-m7my.onrender.com/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentTaskId = null;
let allTasks = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        showApp();
        loadDashboard();
        loadTasks();
    } else {
        showAuth();
    }
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Auth
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms('register');
    });
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms('login');
    });
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(el.dataset.page);
        });
    });
    
    // Tasks
    document.getElementById('addTaskBtn')?.addEventListener('click', () => openTaskModal());
    document.getElementById('quickAddTask')?.addEventListener('click', () => openTaskModal());
    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);
    
    // Filters
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterTasks();
        });
    });
    document.getElementById('filterPriority')?.addEventListener('change', filterTasks);
    document.getElementById('sortTasks')?.addEventListener('change', filterTasks);
    
    // Modal close
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            closeTaskModal();
            closeTaskDetailsModal();
        });
    });
    
    // Forms
    document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('preferencesForm')?.addEventListener('submit', handlePreferencesUpdate);
    document.getElementById('addCommentForm')?.addEventListener('submit', handleAddComment);
}

// Auth Functions
function toggleAuthForms(form) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(form === 'register' ? 'registerForm' : 'loginForm').classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Welcome back! 👋', 'success');
            showApp();
            loadDashboard();
            loadTasks();
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Account created! 🎉', 'success');
            showApp();
            loadDashboard();
            loadTasks();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    showAuth();
}

function showAuth() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('appSection').style.display = 'none';
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
}

// Navigation
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`${pageName}Page`)?.classList.add('active');
    document.querySelectorAll(`[data-page="${pageName}"]`).forEach(el => el.classList.add('active'));
    
    if (pageName === 'tasks') loadTasks();
    if (pageName === 'settings') loadSettings();
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStats(data.dashboard);
            displayUpcomingTasks(data.dashboard.upcomingTasks);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStats(dashboard) {
    document.getElementById('statTotal').textContent = dashboard.summary.totalTasks;
    document.getElementById('statCompleted').textContent = dashboard.summary.completedTasks;
    document.getElementById('statPending').textContent = dashboard.summary.pendingTasks;
    document.getElementById('statOverdue').textContent = dashboard.summary.overdueTasks;
    document.getElementById('tasksBadge').textContent = dashboard.summary.pendingTasks;
}

function displayUpcomingTasks(tasks) {
    const container = document.getElementById('upcomingTasksList');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming tasks</p></div>';
        return;
    }
    
    container.innerHTML = tasks.slice(0, 5).map(task => `
        <div class="task-card" onclick="viewTaskDetails('${task._id}')" style="margin-bottom: 10px;">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <span class="task-badge badge-${task.status}">${task.status}</span>
            </div>
            <div class="task-meta">
                <span><i class="fas fa-flag"></i> ${task.priority}</span>
                ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// Tasks
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allTasks = data.tasks;
            filterTasks();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function filterTasks() {
    const activeTab = document.querySelector('.tab.active');
    const statusFilter = activeTab ? activeTab.dataset.filter : 'all';
    const priorityFilter = document.getElementById('filterPriority')?.value || '';
    const sortBy = document.getElementById('sortTasks')?.value || 'createdAt';
    
    let filtered = [...allTasks];
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (priorityFilter) {
        filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    // Sort
    if (sortBy === 'dueDate') {
        filtered.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    } else if (sortBy === 'priority') {
        const order = { urgent: 1, high: 2, medium: 3, low: 4 };
        filtered.sort((a, b) => order[a.priority] - order[b.priority]);
    } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    displayTasks(filtered);
}

function displayTasks(tasks) {
    const container = document.getElementById('tasksList');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><h3>No tasks found</h3><p>Create your first task!</p></div>';
        return;
    }
    
    const priorityEmojis = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority}" onclick="viewTaskDetails('${task._id}')">
            <div class="task-header">
                <div class="task-title">${priorityEmojis[task.priority]} ${task.title}</div>
                <span class="task-badge badge-${task.status}">${task.status}</span>
            </div>
            ${task.description ? `<p style="margin: 10px 0; color: var(--gray); font-size: 14px;">${task.description.substring(0, 100)}...</p>` : ''}
            <div class="task-meta">
                ${task.category ? `<span><i class="fas fa-folder"></i> ${task.category}</span>` : ''}
                ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary" onclick="event.stopPropagation(); editTask('${task._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" style="background: var(--danger); color: white;" onclick="event.stopPropagation(); deleteTask('${task._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Task Modal
function openTaskModal(taskId = null) {
    currentTaskId = taskId;
    const modal = document.getElementById('taskModal');
    
    if (taskId) {
        document.getElementById('modalTitle').textContent = 'Edit Task';
        const task = allTasks.find(t => t._id === taskId);
        if (task) {
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
            document.getElementById('taskCategory').value = task.category || '';
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Task';
        document.getElementById('taskForm').reset();
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    currentTaskId = null;
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value || null,
        category: document.getElementById('taskCategory').value
    };
    
    try {
        const url = currentTaskId ? `${API_URL}/tasks/${currentTaskId}` : `${API_URL}/tasks`;
        const method = currentTaskId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentTaskId ? 'Task updated! ✅' : 'Task created! 🎉', 'success');
            closeTaskModal();
            loadTasks();
            loadDashboard();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        showToast('Error saving task', 'error');
    }
}

function editTask(taskId) {
    openTaskModal(taskId);
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task deleted! 🗑️', 'success');
            loadTasks();
            loadDashboard();
        }
    } catch (error) {
        showToast('Error deleting task', 'error');
    }
}

// Task Details
function viewTaskDetails(taskId) {
    const task = allTasks.find(t => t._id === taskId);
    if (!task) return;
    
    currentTaskId = taskId;
    document.getElementById('detailsTaskTitle').textContent = task.title;
    
    const priorityEmojis = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    
    document.getElementById('taskDetailsContent').innerHTML = `
        <div style="background: var(--light); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                    <div style="font-size: 12px; color: var(--gray); margin-bottom: 5px;">Status</div>
                    <span class="task-badge badge-${task.status}">${task.status}</span>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--gray); margin-bottom: 5px;">Priority</div>
                    <div>${priorityEmojis[task.priority]} ${task.priority}</div>
                </div>
            </div>
        </div>
        ${task.description ? `<div style="margin-bottom: 20px;"><strong>Description:</strong><p style="color: var(--gray); margin-top: 10px;">${task.description}</p></div>` : ''}
        ${task.category ? `<div style="margin-bottom: 20px;"><strong>Category:</strong> ${task.category}</div>` : ''}
        ${task.dueDate ? `<div style="margin-bottom: 20px;"><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</div>` : ''}
    `;
    
    loadComments(taskId);
    document.getElementById('taskDetailsModal').classList.add('active');
}

function closeTaskDetailsModal() {
    document.getElementById('taskDetailsModal').classList.remove('active');
    currentTaskId = null;
}

// Comments
async function loadComments(taskId) {
    try {
        const response = await fetch(`${API_URL}/comments/${taskId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('commentsList');
            
            if (!data.comments || data.comments.length === 0) {
                container.innerHTML = '<p style="color: var(--gray); text-align: center;">No comments yet</p>';
                return;
            }
            
            container.innerHTML = data.comments.map(c => `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${c.userId.username}</span>
                        <span class="comment-date">${new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div>${c.content}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

async function handleAddComment(e) {
    e.preventDefault();
    
    const content = document.getElementById('commentInput').value;
    if (!content.trim()) return;
    
    try {
        const response = await fetch(`${API_URL}/comments/${currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('commentInput').value = '';
            loadComments(currentTaskId);
            showToast('Comment added! 💬', 'success');
        }
    } catch (error) {
        showToast('Error adding comment', 'error');
    }
}

// Settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('profileUsername').value = data.user.username;
            document.getElementById('profileEmail').value = data.user.email;
            document.getElementById('emailNotifications').checked = data.user.preferences.notifications.email;
            document.getElementById('taskReminders').checked = data.user.preferences.notifications.taskReminders;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                username: document.getElementById('profileUsername').value,
                email: document.getElementById('profileEmail').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('userName').textContent = currentUser.username;
            showToast('Profile updated! ✅', 'success');
        } else {
            showToast(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        showToast('Error updating profile', 'error');
    }
}

async function handlePreferencesUpdate(e) {
    e.preventDefault();
    
    try {
        const response = await fetch(`${API_URL}/users/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                notifications: {
                    email: document.getElementById('emailNotifications').checked,
                    taskReminders: document.getElementById('taskReminders').checked
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Preferences saved! ✅', 'success');
        } else {
            showToast(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        showToast('Error updating preferences', 'error');
    }
}

// Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global functions
window.viewTaskDetails = viewTaskDetails;
window.editTask = editTask;
window.deleteTask = deleteTask;
