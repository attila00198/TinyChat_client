///////////////////////////////
////        TODO           ////
///////////////////////////////

// [X] TODO: change all text on the page to hungarian.
// [X] TODO: make the sidebar toggler button change to indicate the sidebar's position.
// [X] TODO: make the sidebar retain its position regardless of the user list changes.
// [X] TODO: make an indicator that shows the state of connecton. (connected, disconnected, reconnecting.)
// [X] TODO: make the refresh button disappear when client connected to the server.
// [ ] TODO: Implement updateStatusIndicator()
// [ ] TODO: Implement updateUserList()
// [ ] TODO: Iplement leaveServer() and make a visible button when connected to the server
// [ ] TODO: Implement auto reconnect if connection is lost
// [ ] TODO: Move command handling to server side
// [ ] TODO: Update command list when the server sands a message with 'type:command_list'.
// [ ] TODO: Create a '/help' command on clients side that lists all the available commands.
// [ ] TODO: Implement autosuggestion when user types '/'.

///////////////////////////////
////      Variables        ////
///////////////////////////////

let reconnectAttempts = 0;
const RECONNECT_DELAY = 3000; // 3 másodperc
const MAX_RECONNECT_ATTEMPTS = 3;

const HOST = "localhost"
const PORT = 8765

const COMMANDS = {
    "/whisper": {
        usage: "/whisper [cél_user] [üzenet]",
        handler: (args, timestamp) => {
            if (args.length < 2) {
                return systemMessage(`Használat: ${COMMANDS["/whisper"].usage}`)
            }
            return {
                type: "private",
                from: current_user.username,
                to: args[0],
                content: args.slice(1).join(" "),
                timestamp: getCurrentTime()
            }
        }
    },
    "/login": {
        usage: "/login [jelszó]",
        handler: (args, timestamp) => {
            if (args.length < 1) {
                return systemMessage(`Használat: ${COMMANDS["/login"].usage}`)
            }
            return {
                type: "command",
                username: current_user.username,
                content: `/login ${args[0]}`,
                timestamp: new Date(timestamp).toLocaleTimeString()
            }
        }
    },
    "/to": {
        usage: "/to [cél_user] [idő]",
        handler: (args, timestamp) => {
            if (args.length < 2) {
                return systemMessage(`Használat: ${COMMANDS["/to"].usage}`)
            }
            if (args[0] === current_user.username) {
                return systemMessage("Saját magad nem némíthatod.")
            }
            return {
                type: "command",
                username: current_user.username,
                content: `/to ${args[0]} ${args[1]}`,
                timestamp: new Date(timestamp).toLocaleTimeString()
            }
        }
    }
}

// State variables
var ws = null;
var is_connected = false
var is_sidebar_closed = false

var current_user = loadUserFromCookie() || {}
var currentUsername = current_user.username || ''
var users = []



///////////////////////////////
////   Cookie Functions    ////
///////////////////////////////

function saveUserToCookie(user) {
    const userJson = JSON.stringify(user);
    // Cookie 7 napig él
    const expires = new Date();
    expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000));
    document.cookie = `current_user=${encodeURIComponent(userJson)}; expires=${expires.toUTCString()}; path=/`;
    console.log("User mentve cookie-ba:", user);
}

function loadUserFromCookie() {
    const name = "current_user=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            const userJson = cookie.substring(name.length);
            const user = JSON.parse(userJson);
            console.log("User betöltve cookie-ból:", user);
            return user;
        }
    }
    return null;
}

function deleteUserCookie() {
    document.cookie = "current_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log("User cookie törölve");
    current_user = {};
    location.reload(); // Oldal újratöltése
}

// Debug: Cookie törlése konzolból
window.clearUser = deleteUserCookie;

///////////////////////////////
////   Helper Functions   /////
///////////////////////////////

function systemMessage(text) {
    return {
        type: "system",
        username: "System",
        content: text,
        timestamp: getCurrentTime()
    }
}

function isEmbtyObj(obj) {
    for (var prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            console.log("Current user: ", obj)
            return false
        }
    }
    console.log("Current user is embty! ", current_user)
    return true
}

function getUserInfo(username) {
    return users.find(user => user.username === username);
}

function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().substring(0, 8);
}

function isUserMod(username) {
    const user = getUserInfo(username);
    return user && user.is_mod;
}

function toggleSidebar() {
    let left_panel = getById("left-panel")
    if (left_panel.className == "hidden") {
        replaceText(getById("toggle-sidebar"), "Panel elreytése")
        is_sidebar_closed = false
    } else {
        replaceText(getById("toggle-sidebar"), "Panel megjelenítése")
        is_sidebar_closed = true
    }
    left_panel.toggleClass("hidden")
}

// TODO: Mobil whisper commandfix
// - insertWhisperCommand() után hívni kell a toggleSidebar()-t
// - Így user kattintásra: beszúrja a commandot ÉS bezárja a sidebar-t
// - Ez mobilon jobb UX, desktop-on nem zavar mert a sidebar úgyis látszik
function insertWhisperCommand(e) {
    let name = e.target.dataset.username  // Pontos username
    if (name !== current_user.username) {
        let command_to_paste = `/whisper ${name} `
        let chat_input = document.getElementById("chat-input")
        chat_input.value = command_to_paste
        chat_input.focus()
    }
}

function formatMessage(message) {
    let { type, timestamp, username, content, from, to } = message;
    let is_mod = false

    for (let user of users) {
        if (user.username === username && user.is_mod === true) is_mod = true
    }
    const badge = is_mod ? "[MOD]" : "";

    if (username === currentUsername) username = "Te"
    if (type === "private") {
        return `[${timestamp}] ${from} ${badge} -> ${to}: ${content}`;
    } else {
        return `[${timestamp}] ${username} ${badge}: ${content}`;
    }

}

///////////////////////////////
////    App Componenets    ////
///////////////////////////////

function reconnectBtn() {
    return btn("⟲").onClick(reconnect).setId("reconnect-btn").setClass(`${is_connected ? "hidden" : ""}`)
}

function statusIndicator() {
    return div(
        span(`${is_connected ? "Online" : "Offline"}`).setClass(`${is_connected ? "online" : "offline"}`),
        reconnectBtn()
    ).setClass("left-panel-header")
}

function userList() {
    return ul(
        ...users.map((user) => {
            let badges = ""
            if (user.is_mod) badges += " [MOD]"
            if (user.is_timed_out) badges += " [TO]"

            return li(user.username + badges)
                .setClass("user-item")
                .setAttr({ "data-username": user.username })  // Username eltárolva
                .onClick(insertWhisperCommand)
        })
    ).setClass("user-list")
}

function messageItem(message) {
    let type = ""
    if (message.type === "message") {
        type = "public"
    } else {
        type = message.type
    }
    return div(
        span(formatMessage(message)).setClass(`msg-${type}`)
    ).setClass("message-item");
}

function loginPanel() {
    return div(
        h2("Terminal Chat"),
        form(
            div(
                input("text")
                    .setClass("name-input")
                    .setId("name-input")
                    .setName("username")
                    .setPlaceholder("Add meg a neved...")
                    .isRequired(),
                btn("Csatlakozás", "submit")
                    .setClass("join-btn")
                    .onClick(joinChat)
            ).setClass("input-container")
        ).setMethod("post").setId("form-login")
    ).setClass("login-panel")
}

function leftPanel() {
    return div(
        statusIndicator(),
        userList()
    ).setId("left-panel")
}

function chatInterface() {
    return div(
        div().setId("message-list"),
        form(
            input("text")
                .setId("chat-input")
                .setName("chat-input")
                .isRequired(),
            btn("Küldés", "submit").setId("send-btn").onClick(sendMessage)
        ).setId("chat-form")
            .setAction("#")
            .setMethod("post")
    ).setId("chat_interface")
}

function rightPanel() {
    return div(
        div(
            btn("Panel elreytése", "button")
                .setId("toggle-sidebar")
                .setClass("toggle-btn")
                .onClick(toggleSidebar),
            span(`Felhasználónév: ${current_user.username} ${current_user.is_mod ? 'Rang: [MOD]' : ''}`).setId("right-panel-heading"),
            btn("Kapcsolat bontása", "button").onClick(disconnect)
        ).setClass("right-panel-header"),
        chatInterface()
    ).setId("right-panel")
}

///////////////////////////////
////          APP          ////
///////////////////////////////

const app = () => {
    if (!isEmbtyObj(current_user)) {
        return div(
            leftPanel(),
            rightPanel()
        ).setClass("container")
    } else {
        return div(
            loginPanel()
        ).setClass("container")
    }
}

getById("root").appendChild(app())

///////////////////////////////
////    Event Handlers     ////
///////////////////////////////

function joinChat(e) {
    e.preventDefault()
    let login_form = document.getElementById("form-login")
    let formData = new FormData(login_form)
    let root = getById("root")
    console.log(formData.get("username"))

    let user = {
        "username": formData.get("username"),
        "is_mod": false,
        "is_timed_out": false
    }
    current_user = user
    currentUsername = current_user.username
    saveUserToCookie(current_user)
    root.innerHTML = ""
    root.appendChild(app())
    connect()
}


function handleCommands(messageText, timestamp) {
    return {
        type: "command",
        username: currentUsername,
        content: messageText,
        timestamp: timestamp
    }
}

function sendMessage(e) {
    e.preventDefault()
    const timestamp = Date.now();

    let chat_input = getById("chat-input")
    let content = chat_input.value
    let message_to_send = {}

    if (!content) return;

    if (content.startsWith("/")) {
        if (!current_user.is_timed_out) {
            message_to_send = handleCommands(content, timestamp)
        }
    } else {
        if (!current_user.is_timed_out) {
            message_to_send = {
                type: "message",
                content: content,
                username: current_user.username,
                timestamp: getCurrentTime()
            }
            addMessage(message_to_send)
        }
    }
    console.log("To send: ", message_to_send)
    chat_input.value = ""
    if (message_to_send !== null) sendToServer(message_to_send)
}

function addMessage(message_to_add) {
    let message_list = getById("message-list")
    message_list.appendChild(messageItem(message_to_add))
    message_list.scrollTop = message_list.scrollHeight
}

function updateLeftPanel(newUserList) {

    let leftPanel = getById("left-panel")
    if (!leftPanel) {
        console.error("Left panel nem található!")
        return
    }

    users = newUserList

    // Teljes left panel újrarenderelése
    replaceHTML(leftPanel, div(
        statusIndicator(),
        userList()
    ))

    leftPanel.setClass(`${is_sidebar_closed ? "hidden" : ""}`)
}

function updateCurrentUser() {
    const updated = users.find(u => u.username === current_user.username)
    if (updated) {
        current_user = updated
        replaceText(getById(
            "right-panel-heading"),
            `Felhasználónév: ${current_user.username} ${current_user.is_mod ? ' [MOD]' : ''}`)
    }
}

///////////////////////////////
////       Websockets      ////
///////////////////////////////

// TODO: Átalakítani a WebSocket implementációt hogy a jelenlegi UI-al működjön.
// Elő sorban a UpadeUserList-et és az addMessage-et kell módosítani.

window.onload = () => {
    if (!isEmbtyObj(current_user)) {
        connect()
    }
}

function connect() {
    const username = currentUsername
    ws = new WebSocket(`ws://${HOST}:${PORT}`);

    ws.onopen = function () {
        is_connected = true;

        message_to_add = {
            type: 'system',
            username: "System",
            content: 'Kapcsolódva a szerverhez',
            timestamp: getCurrentTime()
        }
        addMessage(message_to_add);

        // Username beállítása
        sendToServer({
            type: 'join',
            username: username,
            content: 'Csatlakozott',
            timestamp: getCurrentTime()
        });
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log("[DEBUG]: Fogadott típus: ", data.type)
        console.log("[DEBUG]: Fogadott Üzenet: ", data.content)

        if (data.type === 'user_list') {
            updateLeftPanel(data.content);
            updateCurrentUser()
        } else {
            addMessage(data);
        }
    }

    ws.onclose = function () {
        is_connected = false
        addMessage({
            type: 'system',
            username: 'System',
            content: 'Kapcsolat megszakadt',
            timestamp: getCurrentTime()
        })
        disconnect()
    }

    ws.onerror = function (error) {
        is_connected = false
        /* addMessage({
            type: 'system',
            username: 'System',
            content: 'Kapcsolat megszakadt',
            timestamp: getCurrentTime()
        }) */
        console.error(error)
        disconnect()
    };
};

function reconnect() {
    if (is_connected == false) {
        connect()
    } else {
        return
    }
}

function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
        is_connected = false
    }
}

function sendToServer(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}