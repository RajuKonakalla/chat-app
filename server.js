const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

const rooms = new Map(); // roomName -> Set of clients
const users = new Map(); // username -> client

function broadcast(roomName, message, exceptClient = null) {
    const clients = rooms.get(roomName);
    if (!clients) return;
    for (const client of clients) {
        if (client !== exceptClient && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
}

wss.on('connection', (ws, request) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        switch (msg.type) {
            case 'login':
                {
                    const { username } = msg;
                    if (!username || typeof username !== 'string' || username.trim() === '') {
                        ws.send(JSON.stringify({ type: 'login', success: false, message: 'Invalid username' }));
                        return;
                    }
                    if (users.has(username)) {
                        ws.send(JSON.stringify({ type: 'login', success: false, message: 'Username already taken' }));
                        return;
                    }
                    ws.username = username;
                    users.set(username, ws);
                    ws.send(JSON.stringify({ type: 'login', success: true, username }));
                    // Send current room list
                    ws.send(JSON.stringify({ type: 'room_list', rooms: Array.from(rooms.keys()) }));
                }
                break;

            case 'create_room':
                {
                    const { roomName } = msg;
                    if (!roomName || typeof roomName !== 'string' || roomName.trim() === '') {
                        ws.send(JSON.stringify({ type: 'create_room', success: false, message: 'Invalid room name' }));
                        return;
                    }
                    if (rooms.has(roomName)) {
                        ws.send(JSON.stringify({ type: 'create_room', success: false, message: 'Room already exists' }));
                        return;
                    }
                    rooms.set(roomName, new Set());
                    ws.send(JSON.stringify({ type: 'create_room', success: true, roomName }));
                    // Broadcast updated room list to all users
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'room_list', rooms: Array.from(rooms.keys()) }));
                        }
                    });
                }
                break;

            case 'join_room':
                {
                    const { roomName } = msg;
                    if (!roomName || !rooms.has(roomName)) {
                        ws.send(JSON.stringify({ type: 'join_room', success: false, message: 'Room does not exist' }));
                        return;
                    }
                    // Remove from previous room if any
                    if (ws.currentRoom) {
                        const oldRoomClients = rooms.get(ws.currentRoom);
                        if (oldRoomClients) {
                            oldRoomClients.delete(ws);
                            broadcast(ws.currentRoom, { type: 'user_left', username: ws.username });
                        }
                    }
                    ws.currentRoom = roomName;
                    rooms.get(roomName).add(ws);
                    ws.send(JSON.stringify({ type: 'join_room', success: true, roomName }));
                    broadcast(roomName, { type: 'user_joined', username: ws.username }, ws);
                }
                break;

            case 'leave_room':
                {
                    const { roomName } = msg;
                    if (roomName && rooms.has(roomName)) {
                        const clients = rooms.get(roomName);
                        clients.delete(ws);
                        broadcast(roomName, { type: 'user_left', username: ws.username });
                        if (ws.currentRoom === roomName) {
                            ws.currentRoom = null;
                        }
                        ws.send(JSON.stringify({ type: 'leave_room', success: true }));
                    } else {
                        ws.send(JSON.stringify({ type: 'leave_room', success: false, message: 'Room does not exist' }));
                    }
                }
                break;

            case 'message':
                {
                    const { text } = msg;
                    if (!ws.currentRoom) {
                        ws.send(JSON.stringify({ type: 'error', message: 'You are not in a room' }));
                        return;
                    }
                    if (!text || typeof text !== 'string' || text.trim() === '') {
                        ws.send(JSON.stringify({ type: 'error', message: 'Empty message' }));
                        return;
                    }
                    const messageData = {
                        type: 'message',
                        username: ws.username,
                        text: text.trim(),
                        timestamp: new Date().toISOString(),
                    };
                    broadcast(ws.currentRoom, messageData);
                }
                break;

            default:
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
    });

    ws.on('close', () => {
        if (ws.username) {
            users.delete(ws.username);
        }
        if (ws.currentRoom) {
            const clients = rooms.get(ws.currentRoom);
            if (clients) {
                clients.delete(ws);
                broadcast(ws.currentRoom, { type: 'user_left', username: ws.username });
            }
        }
    });
});

// Ping clients to detect dead connections
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
