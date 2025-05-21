(() => {
    const loginScreen = document.getElementById('login-screen');
    const roomSelectionScreen = document.getElementById('room-selection-screen');
    const chatRoomScreen = document.getElementById('chat-room-screen');

    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    const displayUsername = document.getElementById('display-username');
    const roomList = document.getElementById('room-list');
    const newRoomNameInput = document.getElementById('new-room-name');
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomError = document.getElementById('room-error');
    const logoutBtn = document.getElementById('logout-btn');

    const currentRoomName = document.getElementById('current-room-name');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const messagesContainer = document.getElementById('messages-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');

    let ws;
    let username = null;
    let currentRoom = null;

    function showScreen(screen) {
        loginScreen.classList.remove('active');
        roomSelectionScreen.classList.remove('active');
        chatRoomScreen.classList.remove('active');
        screen.classList.add('active');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatMessageText(text) {
        // Basic formatting: bold **text**, italics *text*, links http(s)://...
        let formatted = escapeHtml(text);

        // Bold **text**
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italics *text*
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Links
        formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        return formatted;
    }

    function addMessage(message) {
        const messageElem = document.createElement('div');
        messageElem.classList.add('message');

        const meta = document.createElement('div');
        meta.classList.add('meta');
        const time = new Date(message.timestamp);
        meta.textContent = `${message.username} • ${time.toLocaleTimeString()}`;

        const text = document.createElement('div');
        text.classList.add('text');
        text.innerHTML = formatMessageText(message.text);

        messageElem.appendChild(meta);
        messageElem.appendChild(text);

        messagesContainer.appendChild(messageElem);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addNotification(text) {
        const notifElem = document.createElement('div');
        notifElem.classList.add('message');
        notifElem.style.fontStyle = 'italic';
        notifElem.style.color = '#bfa94a';
        notifElem.textContent = text;
        messagesContainer.appendChild(notifElem);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function connectWebSocket() {
        ws = new WebSocket(`ws://${window.location.hostname}:3000/ws`);

        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'login', username }));
        });

        ws.addEventListener('message', (event) => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch {
                console.error('Invalid JSON from server');
                return;
            }

            switch (msg.type) {
                case 'login':
                    if (msg.success) {
                        displayUsername.textContent = username;
                        showScreen(roomSelectionScreen);
                    } else {
                        loginError.textContent = msg.message || 'Login failed';
                        ws.close();
                    }
                    break;

                case 'room_list':
                    updateRoomList(msg.rooms);
                    break;

                case 'create_room':
                    if (msg.success) {
                        roomError.textContent = '';
                        joinRoom(msg.roomName);
                    } else {
                        roomError.textContent = msg.message || 'Failed to create room';
                    }
                    break;

                case 'join_room':
                    if (msg.success) {
                        currentRoom = msg.roomName;
                        currentRoomName.textContent = currentRoom;
                        messagesContainer.innerHTML = '';
                        showScreen(chatRoomScreen);
                    } else {
                        alert(msg.message || 'Failed to join room');
                    }
                    break;

                case 'leave_room':
                    if (msg.success) {
                        currentRoom = null;
                        showScreen(roomSelectionScreen);
                    } else {
                        alert(msg.message || 'Failed to leave room');
                    }
                    break;

                case 'message':
                    addMessage(msg);
                    break;

                case 'user_joined':
                    addNotification(`${msg.username} joined the room.`);
                    break;

                case 'user_left':
                    addNotification(`${msg.username} left the room.`);
                    break;

                case 'error':
                    alert(msg.message);
                    break;

                default:
                    console.warn('Unknown message type:', msg.type);
            }
        });

        ws.addEventListener('close', () => {
            if (currentRoom) {
                addNotification('Disconnected from server.');
            }
        });

        ws.addEventListener('error', () => {
            alert('WebSocket error occurred.');
        });
    }

    function updateRoomList(rooms) {
        roomList.innerHTML = '';
        if (rooms.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No rooms available';
            li.style.fontStyle = 'italic';
            roomList.appendChild(li);
            return;
        }
        rooms.forEach(room => {
            const li = document.createElement('li');
            li.textContent = room;
            li.addEventListener('click', () => {
                joinRoom(room);
            });
            roomList.appendChild(li);
        });
    }

    function joinRoom(roomName) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'join_room', roomName }));
        }
    }

    loginBtn.addEventListener('click', () => {
        const enteredUsername = usernameInput.value.trim();
        if (!enteredUsername) {
            loginError.textContent = 'Please enter a username.';
            return;
        }
        username = enteredUsername;
        loginError.textContent = '';
        connectWebSocket();
    });

    createRoomBtn.addEventListener('click', () => {
        const roomName = newRoomNameInput.value.trim();
        if (!roomName) {
            roomError.textContent = 'Please enter a room name.';
            return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'create_room', roomName }));
        }
    });

    logoutBtn.addEventListener('click', () => {
        if (ws) {
            ws.close();
        }
        username = null;
        currentRoom = null;
        usernameInput.value = '';
        loginError.textContent = '';
        showScreen(loginScreen);
    });

    leaveRoomBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN && currentRoom) {
            ws.send(JSON.stringify({ type: 'leave_room', roomName: currentRoom }));
        }
    });

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', text }));
            messageInput.value = '';
        }
    });

    // Initialize UI
    showScreen(loginScreen);
})();
