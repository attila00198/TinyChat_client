# TerminalChat — Web Client

This repository is the frontend for the TerminalChat project. TerminalChat is split into two repositories: this client (a static browser-based UI) and a separately managed backend WebSocket server (the server repo hosts the terminal/chat server). They were split to keep frontend and backend concerns separate.

What this repo contains
- A minimal static web client (HTML/CSS/JS) that connects to a WebSocket server and provides a chat interface.
- No backend/server code is included here — run the matching server (separate repo) to provide the WebSocket endpoint.

Quick start

1) Confirm or change the WebSocket address

Open `static/js/script.js` and you'll find the connection config near the top of the file:

```javascript
const HOST = "localhost"
const PORT = 8765
```

By default the client attempts to connect to ws://localhost:8765. Change those values to point to your server. If your server expects wss (secure WebSocket), edit the `connect()` function in `static/js/script.js` to use `wss://` instead of `ws://` when appropriate.

2) Start a static server and open the UI

PowerShell (recommended for Windows):

```pwsh
# from inside the chat_client folder
# Python 3 built-in static server
python -m http.server 8000

# or, if you have Node.js installed
npx http-server . -p 8000
```

Then open http://localhost:8000 (or the port you chose) in your browser and sign in with a username.

Project structure

- `index.html` — main UI shell
- `static/css/style.css` — styles for the chat UI
- `static/js/script.js` — main client logic (WebSocket connection, DOM helpers)
- `static/js/domino.js` — included helper utilities
- `README.md` — this file

Client <-> Server protocol (what the client expects)

The client uses a lightweight JSON message protocol over WebSocket. Observed message types (from `static/js/script.js`) include:

- `join` — client sends to announce a new user. Example sent by client:

```json
{ "type": "join", "username": "alice", "content": "Csatlakozott", "timestamp": "12:34:56" }
```

- `message` — a public chat message. Example (client -> server and server -> clients):

```json
{ "type": "message", "username": "alice", "content": "Hello everyone", "timestamp": "12:35:00" }
```

- `private` — private message between users. Fields used by the client: `from`, `to`, and `content`.

Example:

```json
{ "type": "private", "from": "alice", "to": "bob", "content": "secret", "timestamp": "12:35:10" }
```

- `command` — used when a user sends a slash-command (e.g., `/whisper`, `/login`, `/to`). The client sends the command to the server to be interpreted.

- `user_list` — server -> clients: when the server sends a user list update the client expects a message where `data.type === 'user_list'` and `data.content` is an array of user objects. Each user object looks like:

```json
{ "username": "bob", "is_mod": false, "is_timed_out": false }
```

- `system` — informational messages displayed by the client (e.g., connection or error messages).

Integration notes
- The client stores a current user in a cookie named `current_user` for quick reconnects.
- The client expects user objects in the `user_list` message to include `username`, `is_mod` and `is_timed_out`. The `is_mod` flag changes the display badge and `is_timed_out` disables sending messages for that user.
- Command handling is partially implemented client-side (some commands produce client-side message objects); for production you should handle authoritative command execution server-side and send updated user lists and system messages back to clients.

Troubleshooting and common pitfalls

- WebSocket blocked on file://: browsing `index.html` directly from the file system can cause WebSocket issues in some browsers. Run a static server instead.
- ws vs wss: if you serve the page over HTTPS, use `wss://` for the WebSocket connection.
- Cross-origin: static assets don't have CORS, but your WebSocket server must accept connections from the client's origin.

Examples of running locally

- Start the backend server (from your server repo) on port 8765 (or change `PORT` in `script.js`).
- Start the static server (from this repo) and open the page.

Next steps and maintenance ideas

- Add a small configuration UI to let users enter the WebSocket URL without editing source files.
- Implement reconnection/backoff and more robust state handling on the client (there are TODOs in `static/js/script.js`).
- Add tests and a simple example server in the companion backend repository to make onboarding easier.

Contributing

If you make changes that affect the protocol, please document message shapes in this README and update the companion server repository. Small focused pull requests are preferred.

License

This project doesn't include a license file yet. If you'd like, I can add an MIT `LICENSE` file.
