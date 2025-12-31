# tinyChat — Web Client

This repository contains the static browser-based frontend for the tinyChat project. The frontend is a minimal single-page UI that connects to a separate WebSocket backend (not included here).

What this repo contains
- A static web client implemented in HTML/CSS/JS that connects to a WebSocket server and provides a basic chat interface.
- No backend/server code is included — run the matching backend repository to provide the WebSocket endpoint.

Quick start

1) Configure the WebSocket connection

Open `static/js/config.js` and edit the `CONFIG.server` values to point to your backend. By default:

```javascript
CONFIG.server = {
	host: "localhost",
	port: 8765,
	ssl_enabled: true
}
```

The frontend uses the `CONFIG.server.protocol` helper to pick `wss` when `ssl_enabled` is true and `ws` otherwise.

2) Start a static server and open the UI

PowerShell (Windows) example — run from inside the `chat_client` folder:

```pwsh
# Python 3 built-in static server
python -m http.server 8000

# or, if you have Node.js installed
npx http-server . -p 8000
```

Then open http://localhost:8000 (or the port you chose) in your browser.

Project structure

- `index.html` — main UI shell (loads `static/js/config.js`, `static/js/domino.js`, `static/js/app.js`)
- `static/css/style.css` — stylesheet for the UI
- `static/js/config.js` — central client configuration (server host/port, reconnection, feature flags)
- `static/js/domino.js` — small DOM helper library and utilities used by the UI
- `static/js/app.js` — main client logic (UI rendering, WebSocket connection, message handling)
- `README.md` — this file

Client ↔ Server protocol

The client uses a lightweight JSON message protocol over WebSocket. The code in `static/js/app.js` expects and sends messages with these types:

- `join` — sent by the client to announce a user joining. Example:

```json
{ "type": "join", "username": "alice", "timestamp": "12:34:56" }
```

- `public` — a public chat message (note: the client uses `type: "public"` for normal chats). Example:

```json
{ "type": "public", "username": "alice", "content": "Hello everyone", "timestamp": "12:35:00" }
```

- `private` — a private message between users. Example:

```json
{ "type": "private", "from": "alice", "to": "bob", "content": "secret", "timestamp": "12:35:10" }
```

- `command` — sent when the user enters a slash command (client packages the command as `type: "command"`).

- `user_list` — server → clients: updates the client user list. The client expects `data.content` to be an array of user objects like:

```json
{ "username": "bob", "is_mod": false, "is_timed_out": false }
```

- `command_list` — an informational list of available commands (the client currently logs this to console).

- `system` / `error` — used for informational or error messages the client will display in the chat area.

Integration notes
- The client stores the current user in a cookie named `current_user` (see `static/js/app.js` cookie helpers).
- The configuration in `static/js/config.js` contains reconnection settings and feature flags (e.g., `reconnect.max_attempts`, `features.whisper_enabled`).
- Much of the UI state is managed in `static/js/app.js`. Commands and authoritative operations should be validated and executed server-side for production.

Troubleshooting and common pitfalls
- Do not open `index.html` via `file://` — use a static server to avoid WebSocket restrictions.
- If you serve the page over HTTPS, set `ssl_enabled: true` in `static/js/config.js` and ensure the backend accepts `wss://`.
- Cross-origin: your WebSocket backend must accept connections from the client's origin.

Examples of running locally
- Start your backend server (from the companion server repo) and point `static/js/config.js` at it.
- Start a static server (see step 2) and open the page.

Next steps and maintenance ideas
- Add a small configuration UI so users can enter the WebSocket URL without editing source files.
- Harden reconnection/backoff and state handling (there are TODO comments in `static/js/app.js`).
- Add a simple example backend for local testing to make onboarding easier.

Contributing

If you change the client/server message shapes, update this README and the companion backend repository. Small, focused pull requests are preferred.

License

This project does not include a license file yet. If you want, I can add an MIT `LICENSE` file.
