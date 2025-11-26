document.addEventListener('DOMContentLoaded', () => {
    // --- Supabase & State Initialization ---
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error("Supabase URL and Anon Key are required. Make sure they are injected into the HTML template.");
        alert("Application is not configured. Please check server logs.");
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let timerInterval = null;
    let lastActionCounter = -1;
    let shuffleInterval = null;

    // --- DOM Elements ---
    const timerDisplay = document.getElementById('timer-display');
    const progressRing = document.getElementById('timer-progress-ring');
    const teamList = document.getElementById('team-list');
    const eventNote = document.getElementById('event-note');
    const alertSound = document.getElementById('alert-sound');

    // Layout containers
    const timerContainer = document.getElementById('timer-container');
    const teamsContainer = document.getElementById('teams-container');
    const noteContainer = document.getElementById('note-container');

    // --- Main Data Fetching and Real-time Subscriptions ---

    // Fetch initial data for teams and config
    async function fetchInitialData() {
        try {
            const { data: teams, error: teamsError } = await supabase.from('teams').select('*').order('order_index');
            if (teamsError) throw teamsError;
            renderTeams(teams);

            const { data: config, error: configError } = await supabase.from('event_config').select('*').eq('id', 1).single();
            if (configError) throw configError;
            handleConfigUpdate(config);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    }

    // Subscribe to real-time updates
    supabase
        .channel('public:teams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, payload => {
            console.log('Team change received!', payload);
            fetchInitialData(); // Re-fetch all teams to handle adds/deletes/reorders simply
        })
        .subscribe();

    supabase
        .channel('public:event_config')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_config' }, payload => {
            console.log('Config change received!', payload);
            handleConfigUpdate(payload.new);
        })
        .subscribe();

    // --- UI Rendering and Logic ---

    function renderTeams(teams) {
        teamList.innerHTML = '';
        if (!teams || teams.length === 0) {
            teamList.innerHTML = '<p class="text-gray-400">No teams yet.</p>';
            return;
        }
        teams.forEach(team => {
            if (team.visible) {
                const teamElement = document.createElement('div');
                teamElement.className = 'bg-gray-800 p-3 rounded-md text-xl';
                teamElement.textContent = team.name;
                teamList.appendChild(teamElement);
            }
        });
    }

    function handleConfigUpdate(config) {
        // Update Timer
        updateTimer(config);

        // Update Event Note
        eventNote.textContent = config.note || '';

        // Update Layout
        if (config.layout) {
            updateLayout(config.layout);
        }

        // Handle one-time actions (sound/TTS)
        if (config.action_counter > lastActionCounter) {
            lastActionCounter = config.action_counter;
            handleAction(config.last_action_payload);
        }

        // Handle shuffle mode
        handleShuffle(config.shuffle_enabled, config.shuffle_interval_seconds);
    }

    function updateLayout(layout) {
        if (layout.timer) {
            Object.assign(timerContainer.style, layout.timer.position, layout.timer.size);
        }
        if (layout.teams) {
            Object.assign(teamsContainer.style, layout.teams.position, layout.teams.size);
        }
        if (layout.note) {
            Object.assign(noteContainer.style, layout.note.position, layout.note.size);
        }
    }

    function handleAction(action) {
        if (!action) return;

        // Request user interaction to enable audio if needed
        const playPromise = alertSound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Audio playback failed. User interaction might be required.", error);
                // We might show a small "click to enable audio" button here
            });
        }

        if (action.type === 'sound' && action.payload.url) {
            alertSound.src = action.payload.url;
            alertSound.play();
        } else if (action.type === 'tts' && action.payload.text) {
            const utterance = new SpeechSynthesisUtterance(action.payload.text);
            speechSynthesis.speak(utterance);
        }
    }

    function handleShuffle(enabled, interval) {
        if (shuffleInterval) clearInterval(shuffleInterval);
        if (enabled) {
            shuffleInterval = setInterval(() => {
                const teams = Array.from(teamList.children);
                teams.sort(() => Math.random() - 0.5);
                teams.forEach(team => teamList.appendChild(team));
            }, (interval || 300) * 1000);
        }
    }

    // --- Timer Logic ---
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

    function updateTimer(config) {
        clearInterval(timerInterval);

        const { timer_state, timer_ends_at, timer_remaining, timer_duration_seconds } = config;

        const duration = timer_duration_seconds || 1; // Avoid division by zero

        if (timer_state === 'running') {
            const endTime = new Date(timer_ends_at).getTime();
            timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const timeLeft = Math.max(0, Math.round((endTime - now) / 1000));

                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;

                timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                const progress = timeLeft / duration;
                const offset = circumference - progress * circumference;
                progressRing.style.strokeDashoffset = offset;

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerDisplay.textContent = "00:00";
                    progressRing.style.strokeDashoffset = circumference;
                    // Play sound when timer ends, could be a specific sound
                    alertSound.play().catch(e => console.log("Playback failed:", e));
                }
            }, 1000);
        } else if (timer_state === 'paused' || timer_state === 'stopped') {
            const timeLeft = timer_remaining || (timer_state === 'stopped' ? duration : 0);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            const progress = timeLeft / duration;
            const offset = circumference - progress * circumference;
            progressRing.style.strokeDashoffset = offset;
        }
    }

    // --- Three.js Background ---
    function initThreeJS() {
        const container = document.getElementById('three-bg');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCnt = 5000;
        const posArray = new Float32Array(particlesCnt * 3);

        for (let i = 0; i < particlesCnt * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 5;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.005,
            color: 0xffffff,
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        camera.position.z = 1.5;

        const animate = () => {
            requestAnimationFrame(animate);
            particlesMesh.rotation.y += 0.0002;
            renderer.render(scene, camera);
        };
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- Initial Load ---
    fetchInitialData();
    initThreeJS();
});
