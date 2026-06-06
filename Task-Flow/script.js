 // ============================================
        // TaskFlow Pro - Premium Task Manager
        // ============================================

        // DOM Elements
        const $ = id => document.getElementById(id);
        const $$ = sel => document.querySelectorAll(sel);

        // Main Elements
        const taskInput = $('taskInput');
        const dueDateInput = $('dueDateInput');
        const dueTimeInput = $('dueTimeInput');
        const addBtn = $('addBtn');
        const taskList = $('taskList');
        const themeToggle = $('themeToggle');
        const soundToggle = $('soundToggle');
        const filterTabs = $$('.filter-tab');
        const progressBar = $('progressBar');
        const progressValue = $('progressValue');

        // Edit Modal Elements
        const editModal = $('editModal');
        const editTaskText = $('editTaskText');
        const editDueDate = $('editDueDate');
        const editDueTime = $('editDueTime');
        const saveEditBtn = $('saveEdit');
        const cancelEditBtn = $('cancelEdit');
        const closeEditModalBtn = $('closeEditModal');

        // Notification Elements
        const notificationOverlay = $('notificationOverlay');
        const notificationTaskName = $('notificationTaskName');
        const stopAlarmBtn = $('stopAlarm');
        const completeFromAlarmBtn = $('completeFromAlarm');
        const alarmSound = $('alarmSound');
        const screenFlash = $('screenFlash');

        // Stats Elements
        const totalTasksEl = $('totalTasks');
        const completedTasksEl = $('completedTasks');
        const pendingTasksEl = $('pendingTasks');
        const overdueTasksEl = $('overdueTasks');
        const allCountEl = $('allCount');
        const completedCountEl = $('completedCount');
        const pendingCountEl = $('pendingCount');
        const overdueCountEl = $('overdueCount');

        // App State
        let tasks = [];
        let currentFilter = 'all';
        let soundEnabled = true;
        let notifiedTasks = new Set();
        let editingTaskId = null;
        let currentAlarmTaskId = null;

        // ============================================
        // Initialize App
        // ============================================
        function init() {
            loadTasks();
            loadTheme();
            loadSoundPreference();
            loadNotifiedTasks();
            renderTasks();
            updateStats();
            setupEventListeners();
            setMinDate();
            startCountdownUpdater();
            startReminderChecker();
            requestNotificationPermission();
        }

        // ============================================
        // Event Listeners Setup
        // ============================================
        function setupEventListeners() {
            // Add Task
            addBtn.addEventListener('click', handleAddTask);
            taskInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') handleAddTask();
            });

            // Theme & Sound
            themeToggle.addEventListener('click', toggleTheme);
            soundToggle.addEventListener('click', toggleSound);

            // Filters
            filterTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    filterTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentFilter = tab.dataset.filter;
                    renderTasks();
                });
            });

            // Edit Modal
            closeEditModalBtn.addEventListener('click', closeEditModal);
            cancelEditBtn.addEventListener('click', closeEditModal);
            saveEditBtn.addEventListener('click', saveTaskEdit);
            editModal.addEventListener('click', e => {
                if (e.target === editModal) closeEditModal();
            });

            // Notification Modal
            stopAlarmBtn.addEventListener('click', hideNotification);
            completeFromAlarmBtn.addEventListener('click', completeFromNotification);
        }

        // ============================================
        // Notification Permission
        // ============================================
        function requestNotificationPermission() {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        // ============================================
        // Set Minimum Date
        // ============================================
        function setMinDate() {
            const today = new Date().toISOString().split('T')[0];
            dueDateInput.min = today;
            editDueDate.min = today;
        }

        // ============================================
        // Task CRUD Operations
        // ============================================
        function handleAddTask() {
            const text = taskInput.value.trim();
            
            if (!text) {
                taskInput.classList.add('shake');
                setTimeout(() => taskInput.classList.remove('shake'), 400);
                taskInput.focus();
                return;
            }

            let dueDate = null;
            if (dueDateInput.value) {
                const time = dueTimeInput.value || '23:59';
                dueDate = new Date(`${dueDateInput.value}T${time}`).toISOString();
            }

            const task = {
                id: Date.now(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString(),
                dueDate: dueDate
            };

            tasks.unshift(task);
            saveTasks();
            renderTasks();
            updateStats();
            
            // Clear inputs
            taskInput.value = '';
            dueDateInput.value = '';
            dueTimeInput.value = '';
            taskInput.focus();
        }

        function toggleTask(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
                updateStats();
            }
        }

        function deleteTask(id) {
            const taskCard = document.querySelector(`[data-id="${id}"]`);
            if (taskCard) {
                taskCard.classList.add('removing');
                setTimeout(() => {
                    tasks = tasks.filter(t => t.id !== id);
                    notifiedTasks.delete(id);
                    saveTasks();
                    saveNotifiedTasks();
                    renderTasks();
                    updateStats();
                }, 400);
            }
        }

        function openEditModal(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            editingTaskId = id;
            editTaskText.value = task.text;

            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                editDueDate.value = dueDate.toISOString().split('T')[0];
                editDueTime.value = dueDate.toTimeString().slice(0, 5);
            } else {
                editDueDate.value = '';
                editDueTime.value = '';
            }

            editModal.classList.add('active');
            editTaskText.focus();
        }

        function closeEditModal() {
            editModal.classList.remove('active');
            editingTaskId = null;
        }

        function saveTaskEdit() {
            if (!editingTaskId) return;

            const task = tasks.find(t => t.id === editingTaskId);
            if (!task) return;

            const newText = editTaskText.value.trim();
            if (!newText) {
                editTaskText.classList.add('shake');
                setTimeout(() => editTaskText.classList.remove('shake'), 400);
                return;
            }

            task.text = newText;

            if (editDueDate.value) {
                const time = editDueTime.value || '23:59';
                task.dueDate = new Date(`${editDueDate.value}T${time}`).toISOString();
                // Reset notification for this task
                notifiedTasks.delete(task.id);
                saveNotifiedTasks();
            } else {
                task.dueDate = null;
            }

            saveTasks();
            renderTasks();
            updateStats();
            closeEditModal();
        }

        // ============================================
        // Countdown Timer System
        // ============================================
        function startCountdownUpdater() {
            setInterval(updateAllCountdowns, 1000);
            updateAllCountdowns();
        }

        function updateAllCountdowns() {
            const countdownEls = $$('.countdown-timer[data-due]');
            countdownEls.forEach(el => {
                const dueDate = new Date(el.dataset.due);
                const taskId = parseInt(el.dataset.taskId);
                const task = tasks.find(t => t.id === taskId);
                const taskCard = el.closest('.task-card');
                
                if (task && task.completed) {
                    el.innerHTML = `
                        <div class="countdown-text">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:var(--success)">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Task Completed
                        </div>
                    `;
                    taskCard.classList.remove('overdue', 'due-soon');
                    taskCard.classList.add('completed');
                    return;
                }

                const now = new Date();
                const diff = dueDate - now;

                if (diff <= 0) {
                    // Overdue
                    const overdueDiff = Math.abs(diff);
                    const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
                    const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    el.innerHTML = `
                        <div class="countdown-text">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:var(--danger)">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            Overdue by ${hours}h ${minutes}m
                        </div>
                    `;
                    taskCard.classList.remove('due-soon', 'completed');
                    taskCard.classList.add('overdue');
                } else {
                    // Calculate time remaining
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    let html = '<div class="countdown-display">';
                    
                    if (days > 0) {
                        html += `
                            <div class="countdown-segment">
                                <div class="countdown-value">${days}</div>
                                <div class="countdown-unit">Days</div>
                            </div>
                            <span class="countdown-separator">:</span>
                            <div class="countdown-segment">
                                <div class="countdown-value">${String(hours).padStart(2, '0')}</div>
                                <div class="countdown-unit">Hrs</div>
                            </div>
                            <span class="countdown-separator">:</span>
                            <div class="countdown-segment">
                                <div class="countdown-value">${String(minutes).padStart(2, '0')}</div>
                                <div class="countdown-unit">Min</div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="countdown-segment">
                                <div class="countdown-value">${String(hours).padStart(2, '0')}</div>
                                <div class="countdown-unit">Hrs</div>
                            </div>
                            <span class="countdown-separator">:</span>
                            <div class="countdown-segment">
                                <div class="countdown-value">${String(minutes).padStart(2, '0')}</div>
                                <div class="countdown-unit">Min</div>
                            </div>
                            <span class="countdown-separator">:</span>
                            <div class="countdown-segment">
                                <div class="countdown-value">${String(seconds).padStart(2, '0')}</div>
                                <div class="countdown-unit">Sec</div>
                            </div>
                        `;
                    }
                    
                    html += '</div>';
                    el.innerHTML = html;

                    // Update status classes
                    taskCard.classList.remove('overdue', 'completed');
                    if (hours === 0 && days === 0 && minutes <= 59) {
                        taskCard.classList.add('due-soon');
                    } else {
                        taskCard.classList.remove('due-soon');
                    }
                }
            });
        }

        // ============================================
        // Reminder & Notification System
        // ============================================
        function startReminderChecker() {
            setInterval(checkDueTasks, 5000);
            checkDueTasks();
        }

        function checkDueTasks() {
            const now = new Date();
            
            tasks.forEach(task => {
                if (task.completed || !task.dueDate || notifiedTasks.has(task.id)) return;

                const dueDateTime = new Date(task.dueDate);
                const timeDiff = dueDateTime - now;

                // Trigger when within 30 seconds of due time
                if (timeDiff <= 30000 && timeDiff > -60000) {
                    showNotification(task);
                    notifiedTasks.add(task.id);
                    saveNotifiedTasks();
                }
            });
        }

        function showNotification(task) {
            currentAlarmTaskId = task.id;
            notificationTaskName.textContent = task.text;
            
            notificationOverlay.classList.add('active');
            screenFlash.classList.remove('hidden');
            
            // Play alarm sound
            if (soundEnabled) {
                alarmSound.volume = 1.0;
                alarmSound.currentTime = 0;
                alarmSound.play().catch(e => console.log('Audio error:', e));
            }
            
            // Vibrate on mobile
            if (navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
            }
            
            // Browser notification
            showBrowserNotification(task);
        }

        function showBrowserNotification(task) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⏰ TaskFlow Pro - Task Due!', {
                    body: task.text,
                    icon: '📋',
                    requireInteraction: true,
                    tag: 'taskflow-alarm'
                });
            }
        }

        function hideNotification() {
            notificationOverlay.classList.remove('active');
            screenFlash.classList.add('hidden');
            alarmSound.pause();
            alarmSound.currentTime = 0;
            currentAlarmTaskId = null;
            
            if (navigator.vibrate) navigator.vibrate(0);
        }

        function completeFromNotification() {
            if (currentAlarmTaskId) {
                toggleTask(currentAlarmTaskId);
                hideNotification();
            }
        }

        // ============================================
        // Render Functions
        // ============================================
        function renderTasks() {
            let filteredTasks = tasks;
            const now = new Date();

            if (currentFilter === 'completed') {
                filteredTasks = tasks.filter(t => t.completed);
            } else if (currentFilter === 'pending') {
                filteredTasks = tasks.filter(t => !t.completed);
            } else if (currentFilter === 'overdue') {
                filteredTasks = tasks.filter(t => {
                    if (t.completed || !t.dueDate) return false;
                    return new Date(t.dueDate) < now;
                });
            }

            if (filteredTasks.length === 0) {
                taskList.innerHTML = getEmptyState();
                return;
            }

            taskList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');

            // Attach event listeners
            $$('.task-checkbox input').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    toggleTask(parseInt(checkbox.closest('.task-card').dataset.id));
                });
            });

            $$('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openEditModal(parseInt(btn.closest('.task-card').dataset.id));
                });
            });

            $$('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteTask(parseInt(btn.closest('.task-card').dataset.id));
                });
            });

            updateAllCountdowns();
        }

        function getTaskStatus(task) {
            if (!task.dueDate) return null;
            
            const now = new Date();
            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate - now;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (task.completed) {
                return { class: 'completed', text: 'Completed', icon: 'check' };
            } else if (timeDiff < 0) {
                return { class: 'overdue', text: 'Overdue', icon: 'warning' };
            } else if (hoursDiff <= 1) {
                return { class: 'due-soon', text: 'Due Soon', icon: 'clock' };
            } else {
                return { class: 'upcoming', text: 'Upcoming', icon: 'calendar' };
            }
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        }

        function formatTime(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit'
            });
        }

        function createTaskHTML(task) {
            const createdDate = new Date(task.createdAt);
            const formattedCreated = createdDate.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const status = getTaskStatus(task);
            let cardClass = task.completed ? 'completed' : '';
            let countdownHTML = '';
            let statusBadgeHTML = '';
            let dueDateHTML = '';
            let dueTimeHTML = '';

            if (task.dueDate) {
                if (status) {
                    if (status.class === 'overdue' && !task.completed) cardClass = 'overdue';
                    else if (status.class === 'due-soon' && !task.completed) cardClass = 'due-soon';

                    const statusIcons = {
                        completed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
                        overdue: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
                        'due-soon': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
                        upcoming: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>'
                    };

                    statusBadgeHTML = `
                        <div class="task-status-badge ${status.class}">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${statusIcons[status.class]}</svg>
                            ${status.text}
                        </div>
                    `;
                }

                countdownHTML = `
                    <div class="countdown-timer" data-due="${task.dueDate}" data-task-id="${task.id}">
                        <div class="countdown-text">Loading...</div>
                    </div>
                `;

                dueDateHTML = `
                    <div class="task-meta-item due-date">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        ${formatDate(task.dueDate)}
                    </div>
                `;

                dueTimeHTML = `
                    <div class="task-meta-item due-time">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${formatTime(task.dueDate)}
                    </div>
                `;
            }

            const countdownIcon = task.completed 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';

            return `
                <div class="task-card ${cardClass}" data-id="${task.id}">
                    ${task.dueDate ? `
                    <div class="task-card-header">
                        <div class="countdown-wrapper">
                            <div class="countdown-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${countdownIcon}</svg>
                            </div>
                            ${countdownHTML}
                        </div>
                        ${statusBadgeHTML}
                    </div>
                    ` : ''}
                    <div class="task-card-body">
                        <label class="task-checkbox">
                            <input type="checkbox" ${task.completed ? 'checked' : ''}>
                            <span class="checkbox-custom">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </span>
                        </label>
                        <div class="task-content">
                            <p class="task-text">${escapeHTML(task.text)}</p>
                            <div class="task-meta-row">
                                <div class="task-meta-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    Created ${formattedCreated}
                                </div>
                                ${dueDateHTML}
                                ${dueTimeHTML}
                            </div>
                        </div>
                    </div>
                    <div class="task-card-footer">
                        <button class="action-btn edit-btn">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Edit
                        </button>
                        <button class="action-btn delete-btn">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }

        function getEmptyState() {
            const messages = {
                all: { title: 'No tasks yet', text: 'Create your first task to get started!' },
                pending: { title: 'All caught up!', text: 'No pending tasks. Great job!' },
                completed: { title: 'No completed tasks', text: 'Complete some tasks to see them here.' },
                overdue: { title: 'No overdue tasks', text: "You're on track! Keep up the good work." }
            };

            const msg = messages[currentFilter];

            return `
                <div class="empty-state">
                    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <h3>${msg.title}</h3>
                    <p>${msg.text}</p>
                </div>
            `;
        }

        // ============================================
        // Stats & Progress
        // ============================================
        function updateStats() {
            const now = new Date();
            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const pending = tasks.filter(t => !t.completed).length;
            const overdue = tasks.filter(t => {
                if (t.completed || !t.dueDate) return false;
                return new Date(t.dueDate) < now;
            }).length;

            animateNumber(totalTasksEl, total);
            animateNumber(completedTasksEl, completed);
            animateNumber(pendingTasksEl, pending);
            animateNumber(overdueTasksEl, overdue);

            allCountEl.textContent = total;
            completedCountEl.textContent = completed;
            pendingCountEl.textContent = pending;
            overdueCountEl.textContent = overdue;

            // Update progress bar
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            progressBar.style.width = `${progress}%`;
            progressValue.textContent = `${progress}%`;
        }

        function animateNumber(element, newValue) {
            const current = parseInt(element.textContent) || 0;
            if (current === newValue) return;

            element.style.transform = 'scale(1.2)';
            element.style.color = 'var(--accent-primary)';
            element.textContent = newValue;
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 300);
        }

        // ============================================
        // Theme & Sound Toggle
        // ============================================
        function toggleTheme() {
            const html = document.documentElement;
            const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('taskflow-theme', newTheme);
        }

        function loadTheme() {
            const savedTheme = localStorage.getItem('taskflow-theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (prefersDark ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            soundToggle.classList.toggle('muted', !soundEnabled);
            
            soundToggle.innerHTML = soundEnabled ? `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                </svg>
            ` : `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
                </svg>
            `;
            
            localStorage.setItem('taskflow-sound', soundEnabled);
        }

        function loadSoundPreference() {
            const saved = localStorage.getItem('taskflow-sound');
            if (saved !== null) {
                soundEnabled = saved === 'true';
                if (!soundEnabled) toggleSound();
            }
        }

        // ============================================
        // Storage Functions
        // ============================================
        function saveTasks() {
            localStorage.setItem('taskflow-tasks', JSON.stringify(tasks));
        }

        function loadTasks() {
            const saved = localStorage.getItem('taskflow-tasks');
            tasks = saved ? JSON.parse(saved) : [];
        }

        function saveNotifiedTasks() {
            localStorage.setItem('taskflow-notified', JSON.stringify([...notifiedTasks]));
        }

        function loadNotifiedTasks() {
            const saved = localStorage.getItem('taskflow-notified');
            notifiedTasks = saved ? new Set(JSON.parse(saved)) : new Set();
        }

        // ============================================
        // Utilities
        // ============================================
        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // ============================================
        // Initialize App
        // ============================================
        document.addEventListener('DOMContentLoaded', init);