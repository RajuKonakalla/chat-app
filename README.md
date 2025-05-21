# Royal Chat - Real-Time Chat Application

## Description
Royal Chat is a modern, real-time chat application built with HTML, CSS, and JavaScript. It features user authentication, chat room creation and joining, real-time messaging using WebSockets, and a royal gold and black themed user interface.

## Features
- User authentication with unique usernames
- Create and join multiple chat rooms
- Real-time messaging with message timestamps and sender info
- Basic text formatting in messages (bold, italics, links)
- Responsive and attractive UI with royal gold and black theme
- Notifications for users joining and leaving rooms

## Requirements
- Node.js (version 12 or higher recommended)

## Installation and Running

1. Clone or download the project files.

2. Open a terminal in the project directory.

3. Install dependencies:
   ```
   npm install ws
   ```

4. Start the WebSocket server:
   ```
   node server.js
   ```

5. Open `index.html` in a modern web browser (Chrome, Firefox, Edge).

6. Enter a unique username to join the chat.

7. Create or join chat rooms and start chatting in real-time!

## Notes
- The server listens on port 3000 by default.
- The client connects to the WebSocket server at `ws://localhost:3000/ws`.
- Ensure the server is running before opening the client.
- The application supports basic text formatting:
  - **bold** with `**text**`
  - *italics* with `*text*`
  - Links are automatically detected and clickable.

## Security Considerations
- Usernames must be unique; duplicate usernames are rejected.
- Basic validation is performed on usernames, room names, and messages.
- The application does not currently use HTTPS or authentication tokens; for production use, consider adding secure authentication and encryption.

## License
This project is provided as-is for educational purposes.
