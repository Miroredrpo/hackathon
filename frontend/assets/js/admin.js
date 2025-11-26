document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');

    // --- API Client ---
    // A simple wrapper for jQuery AJAX calls
    const apiClient = {
        login: (email, password) => $.post('/admin/api/auth/login', JSON.stringify({ email, password }), null, 'json'),
        logout: () => $.post('/admin/api/auth/logout'),
        getStatus: () => $.get('/admin/api/auth/status'),

        getConfig: () => $.get('/admin/api/config'),
        updateConfig: (data) => $.ajax({
            url: '/admin/api/config',
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json'
        }),

        getTeams: () => $.get('/admin/api/teams'),
        updateTeams: (teams) => $.ajax({
            url: '/admin/api/teams',
            type: 'POST',
            data: JSON.stringify({ teams }),
            contentType: 'application/json'
        }),
        addTeam: (name) => $.ajax({
            url: '/admin/api/teams',
            type: 'POST',
            data: JSON.stringify({ name }),
            contentType: 'application/json'
        }),
        deleteTeam: (id) => $.ajax({
            url: `/admin/api/teams/${id}`,
            type: 'DELETE'
        }),

        playAction: (action) => $.ajax({
            url: '/admin/api/action/play',
            type: 'POST',
            data: JSON.stringify(action),
            contentType: 'application/json'
        }),

        getAuditLogs: () => $.get('/admin/api/audit')
    };

    // --- Authentication Manager ---
    function initAuth() {
        apiClient.getStatus().done(res => {
            if (res.logged_in) {
                showDashboard(res.email);
            } else {
                showLoginForm();
            }
        }).fail(() => showLoginForm());
    }

    function showLoginForm() {
        authContainer.innerHTML = `
            <div class="max-w-md mx-auto bg-gray-700 p-8 rounded-lg">
                <h2 class="text-2xl font-bold mb-4">Admin Login</h2>
                <form id="login-form">
                    <div class="mb-4">
                        <label for="email" class="block mb-2">Email</label>
                        <input type="email" id="email" class="w-full bg-gray-800 border border-gray-600 rounded p-2" required>
                    </div>
                    <div class="mb-4">
                        <label for="password" class="block mb-2">Password</label>
                        <input type="password" id="password" class="w-full bg-gray-800 border border-gray-600 rounded p-2" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded">Login</button>
                    <p id="login-error" class="text-red-400 mt-2"></p>
                </form>
            </div>
        `;
        dashboardContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');

        $('#login-form').on('submit', e => {
            e.preventDefault();
            const email = $('#email').val();
            const password = $('#password').val();
            apiClient.login(email, password)
                .done(() => {
                    window.location.reload();
                })
                .fail(res => {
                    $('#login-error').text(res.responseJSON?.error || 'Login failed.');
                });
        });
    }

    function showDashboard(username) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        renderDashboard(username);
    }

    // --- Dashboard Rendering and Logic ---
    function renderDashboard(email) {
        dashboardContainer.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl">Admin Dashboard</h1>
                <div>
                    <span>Welcome, ${email}</span>
                    <button id="logout-btn" class="ml-4 bg-red-600 hover:bg-red-700 p-2 rounded">Logout</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Timer Controls -->
                <div class="bg-gray-700 p-4 rounded-lg col-span-1 md:col-span-2">
                    <h2 class="text-xl font-bold mb-4">Timer Controls</h2>
                    <div class="flex items-center space-x-2">
                        <input type="number" id="timer-duration" class="bg-gray-800 p-2 rounded w-32" placeholder="Seconds">
                        <button id="set-timer-btn" class="bg-blue-600 p-2 rounded">Set Duration</button>
                        <button id="start-timer-btn" class="bg-green-600 p-2 rounded">Start</button>
                        <button id="pause-timer-btn" class="bg-yellow-600 p-2 rounded">Pause</button>
                        <button id="reset-timer-btn" class="bg-gray-600 p-2 rounded">Reset</button>
                    </div>
                </div>

                <!-- Team Management -->
                <div class="bg-gray-700 p-4 rounded-lg row-span-2">
                    <h2 class="text-xl font-bold mb-4">Team Management</h2>
                    <div id="teams-list"></div>
                    <div class="flex items-center space-x-2 mt-4">
                        <input type="text" id="new-team-name" class="bg-gray-800 p-2 rounded w-full" placeholder="New Team Name">
                        <button id="add-team-btn" class="bg-blue-600 p-2 rounded">Add</button>
                    </div>
                </div>

                <!-- Event Note -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h2 class="text-xl font-bold mb-4">Event Note</h2>
                    <textarea id="event-note" class="w-full bg-gray-800 p-2 rounded" rows="3"></textarea>
                    <button id="update-note-btn" class="bg-blue-600 p-2 rounded mt-2">Update Note</button>
                </div>

                <!-- Actions -->
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h2 class="text-xl font-bold mb-4">Actions</h2>
                    <button id="play-sound-btn" class="bg-purple-600 p-2 rounded">Play Alert Sound</button>
                    <div class="flex items-center space-x-2 mt-2">
                         <input type="text" id="tts-message" class="bg-gray-800 p-2 rounded w-full" placeholder="Text-to-speech message">
                         <button id="send-tts-btn" class="bg-indigo-600 p-2 rounded">Send TTS</button>
                    </div>
                </div>

                <!-- Layout Editor -->
                <div class="bg-gray-700 p-4 rounded-lg col-span-1 md:col-span-3">
                    <h2 class="text-xl font-bold mb-4">Layout Editor</h2>
                    <div id="layout-preview" class="relative h-96 bg-gray-900 rounded overflow-hidden">
                         <div id="preview-timer" class="resize-drag draggable absolute bg-blue-500 bg-opacity-50 flex items-center justify-center">Timer</div>
                         <div id="preview-teams" class="resize-drag draggable absolute bg-green-500 bg-opacity-50 flex items-center justify-center">Teams</div>
                         <div id="preview-note" class="resize-drag draggable absolute bg-yellow-500 bg-opacity-50 flex items-center justify-center">Note</div>
                    </div>
                    <div class="mt-4">
                        <button id="save-layout-btn" class="bg-blue-600 p-2 rounded">Save Layout</button>
                         <select id="layout-preset" class="bg-gray-800 p-2 rounded ml-2">
                            <option value="">Select Preset</option>
                            <option value="default">Default</option>
                            <option value="timer-focus">Timer Focus</option>
                         </select>
                    </div>
                </div>

                 <!-- Audit Log -->
                <div class="bg-gray-700 p-4 rounded-lg col-span-1 md:col-span-3">
                    <h2 class="text-xl font-bold mb-4">Audit Log</h2>
                    <div id="audit-log" class="h-64 overflow-y-auto bg-gray-800 p-2 rounded font-mono text-sm"></div>
                </div>
            </div>
        `;

        loadInitialData();
        attachEventListeners();
        initLayoutEditor();
    }

    // --- Data Loading & State ---
    let currentConfig = {};
    let currentTeams = [];

    function loadInitialData() {
        apiClient.getConfig().done(config => {
            currentConfig = config;
            $('#event-note').val(config.note);
            $('#timer-duration').val(config.timer_duration_seconds);
            // ... update other controls based on config
        });

        apiClient.getTeams().done(teams => {
            currentTeams = teams;
            renderTeamsList(teams);
        });

        apiClient.getAuditLogs().done(logs => {
            renderAuditLogs(logs);
        });
    }

    function renderTeamsList(teams) {
        const list = $('#teams-list');
        list.empty();
        teams.forEach((team, index) => {
            list.append(`
                <div class="flex items-center justify-between bg-gray-800 p-2 rounded mb-2">
                    <span>${team.name}</span>
                    <button class="delete-team-btn text-red-500" data-id="${team.id}">X</button>
                </div>
            `);
        });
    }

    function renderAuditLogs(logs) {
        const logContainer = $('#audit-log');
        logContainer.empty();
        logs.forEach(log => {
            logContainer.append(`
                <div class="mb-1">
                    <span class="text-gray-400">${new Date(log.created_at).toLocaleString()}</span>
                    <span class="text-yellow-400">${log.admin_username}</span>:
                    <span>${log.action_type}</span>
                    <span class="text-gray-500">${JSON.stringify(log.details)}</span>
                </div>
            `);
        });
    }

    // --- Event Listeners ---
    function attachEventListeners() {
        $('#logout-btn').on('click', () => {
            apiClient.logout().done(() => window.location.reload());
        });

        // Timer
        const handleApiError = (res) => alert(`Error: ${res.responseJSON?.error || 'An unknown error occurred.'}`);

        $('#set-timer-btn').on('click', () => {
            const duration = parseInt($('#timer-duration').val());
            if (isNaN(duration) || duration < 0) {
                return alert('Please enter a valid duration in seconds.');
            }
            apiClient.updateConfig({ timer_duration_seconds: duration, timer_remaining: duration })
                .fail(handleApiError);
        });
        $('#start-timer-btn').on('click', () => {
            // Server will now calculate the end time
            apiClient.updateConfig({ timer_state: 'running' })
                .fail(handleApiError);
        });
        $('#pause-timer-btn').on('click', () => {
             apiClient.getConfig().done(config => {
                const endsAt = new Date(config.timer_ends_at).getTime();
                const remaining = Math.max(0, Math.round((endsAt - Date.now())/1000));
                apiClient.updateConfig({ timer_state: 'paused', timer_remaining: remaining })
                    .fail(handleApiError);
             }).fail(handleApiError);
        });
        $('#reset-timer-btn').on('click', () => {
            apiClient.getConfig().done(config => {
                apiClient.updateConfig({ timer_state: 'stopped', timer_remaining: config.timer_duration_seconds })
                    .fail(handleApiError);
            }).fail(handleApiError);
        });

        // Note
        $('#update-note-btn').on('click', () => {
            apiClient.updateConfig({ note: $('#event-note').val() })
                .fail(handleApiError);
        });

        // Teams
        $('#add-team-btn').on('click', () => {
            const name = $('#new-team-name').val();
            if (name) {
                apiClient.addTeam(name)
                    .done(loadInitialData)
                    .fail(handleApiError);
                $('#new-team-name').val('');
            }
        });
        $('body').on('click', '.delete-team-btn', function() {
            const teamId = $(this).data('id');
            if (confirm('Are you sure you want to delete this team?')) {
                apiClient.deleteTeam(teamId)
                    .done(loadInitialData)
                    .fail(handleApiError);
            }
        });

        // Actions
        $('#play-sound-btn').on('click', () => {
            apiClient.playAction({ type: 'sound', payload: { url: '/assets/sounds/alert.mp3' } })
                .fail(handleApiError);
        });
        $('#send-tts-btn').on('click', () => {
            const text = $('#tts-message').val();
            if (text) {
                apiClient.playAction({ type: 'tts', payload: { text } })
                    .fail(handleApiError);
                $('#tts-message').val('');
            }
        });
    }

    // --- Layout Editor (interact.js) ---
    function initLayoutEditor() {
        const layoutPresets = {
            'default': {
                timer: { position: { top: '5%', left: '5%' }, size: { width: '360px', height: '360px' } },
                teams: { position: { top: '5%', left: 'calc(100% - 320px)' }, size: { width: '300px', height: '80%' } },
                note: { position: { top: 'calc(100% - 100px)', left: '5%' }, size: { width: '400px', height: '80px' } }
            },
            'timer-focus': {
                timer: { position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, size: { width: '500px', height: '500px' } },
                teams: { position: { top: '10px', right: '10px' }, size: { width: '250px', height: 'calc(100% - 20px)' } },
                note: { position: { top: '10px', left: '10px' }, size: { width: '400px', height: '100px' } }
            }
        };

        function applyLayout(layout) {
            if (!layout) return;
            ['timer', 'teams', 'note'].forEach(key => {
                const el = $(`#preview-${key}`);
                if (layout[key]) {
                    // Clear previous inline styles related to position/size
                    el.css({ top: '', right: '', bottom: '', left: '', width: '', height: '', transform: '' });
                    // Apply new styles
                    el.css({ ...layout[key].position, ...layout[key].size });
                }
            });
        }

        interact('.resize-drag')
            .draggable({
                listeners: {
                    move(event) {
                        const target = event.target;
                        const top = (parseFloat(target.style.top) || target.offsetTop) + event.dy;
                        const left = (parseFloat(target.style.left) || target.offsetLeft) + event.dx;
                        // Reset other positioning properties to avoid conflicts
                        $(target).css({ right: '', bottom: '', transform: '' });
                        target.style.top = `${top}px`;
                        target.style.left = `${left}px`;
                    }
                },
                modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })]
            })
            .resizable({
                edges: { top: true, left: true, bottom: true, right: true },
                listeners: {
                    move(event) {
                        const target = event.target;
                        Object.assign(target.style, {
                            width: `${event.rect.width}px`,
                            height: `${event.rect.height}px`,
                        });
                    }
                },
                modifiers: [interact.modifiers.restrictSize({ min: { width: 100, height: 50 } })]
            });

        $('#save-layout-btn').on('click', () => {
            const preview = $('#layout-preview');
            const parentWidth = preview.width();
            const parentHeight = preview.height();

            const getResponsiveStyles = (id) => {
                const el = $(`#${id}`);
                const top = parseFloat(el.css('top')) / parentHeight * 100;
                const left = parseFloat(el.css('left')) / parentWidth * 100;
                const width = parseFloat(el.css('width')) / parentWidth * 100;
                const height = parseFloat(el.css('height')) / parentHeight * 100;

                return {
                    position: { top: `${top}%`, left: `${left}%` },
                    size: { width: `${width}%`, height: `${height}%` }
                };
            };

            const newLayout = {
                timer: getResponsiveStyles('preview-timer'),
                teams: getResponsiveStyles('preview-teams'),
                note: getResponsiveStyles('preview-note')
            };

            apiClient.updateConfig({ layout: newLayout })
                .done(() => alert('Layout saved successfully!'))
                .fail(handleApiError);
        });

        $('#layout-preset').on('change', function() {
            const presetName = $(this).val();
            if (presetName && layoutPresets[presetName]) {
                applyLayout(layoutPresets[presetName]);
            }
        });

        // Load initial layout from config, or use default
        const initialLayout = currentConfig.layout || layoutPresets['default'];
        applyLayout(initialLayout);
    }

    // --- Initial Load ---
    initAuth();
});
