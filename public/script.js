// ==========================================
// 🔐 AUTH LOGIC (No Google)
// ==========================================
const authModal = document.getElementById("authModal");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authError = document.getElementById("authError");
const logoutBtn = document.getElementById("logoutBtn");
const authToggleBtn = document.getElementById("authToggleBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const closeAuthCross = document.getElementById("closeAuthCross");

if(localStorage.getItem("ishuToken")) {
    authToggleBtn.textContent = "🚪 Logout";
    logoutBtn.style.display = "block";
}

authToggleBtn.addEventListener("click", () => {
    if(localStorage.getItem("ishuToken")) {
        localStorage.removeItem("ishuToken");
        location.reload();
    } else {
        authModal.style.display = "flex";
    }
});

closeAuthBtn.addEventListener("click", () => { authModal.style.display = "none"; });
if(closeAuthCross) { closeAuthCross.addEventListener("click", () => { authModal.style.display = "none"; }); }

loginBtn.addEventListener("click", async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    if(!email || !password) { authError.textContent = "Please enter both email and password."; authError.style.display = "block"; return; }

    try {
        const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem("ishuToken", data.token);
            authModal.style.display = "none";
            location.reload();
        } else {
            authError.textContent = data.error;
            authError.style.display = "block";
        }
    } catch (e) { authError.textContent = "Server error."; authError.style.display = "block"; }
});

signupBtn.addEventListener("click", async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    if(!email || !password) { authError.textContent = "Please enter both email and password."; authError.style.display = "block"; return; }

    try {
        const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if(data.success) { alert("Account created successfully! Please log in."); }
        else { authError.textContent = data.error; authError.style.display = "block"; }
    } catch (e) { authError.textContent = "Server error."; authError.style.display = "block"; }
});

logoutBtn.addEventListener("click", () => { localStorage.removeItem("ishuToken"); location.reload(); });

// ==========================================
// MAIN APP LOGIC
// ==========================================
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const newChatBtn = document.getElementById("newChat");
const exportDataBtn = document.getElementById("exportDataBtn");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const fileButton = document.getElementById("fileButton");
const fileInput = document.getElementById("fileInput");
const micButton = document.getElementById("micButton");
const sendButton = document.getElementById("sendButton");
const thinkBtn = document.getElementById("thinkBtn");
const searchBtn = document.getElementById("searchBtn");
let selectedFileText = "";
let selectedImageBase64 = "";
let lastUserMessage = ""; 
let currentSessionId = null;

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const voiceSelect = document.getElementById("voiceSelect");
const autoSpeakToggle = document.getElementById("autoSpeakToggle");
const clearChatBtn = document.getElementById("clearChatBtn");

if(thinkBtn) { thinkBtn.addEventListener("click", () => { thinkBtn.classList.toggle("active"); }); }
if(searchBtn) { searchBtn.addEventListener("click", () => { searchBtn.classList.toggle("active"); }); }

userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
    if(userInput.value.trim() !== "") { micButton.style.display = "none"; sendButton.style.display = "flex"; } 
    else { micButton.style.display = "flex"; sendButton.style.display = "none"; }
});

function getToken() { return localStorage.getItem("ishuToken") || ""; }

document.querySelectorAll(".side-link").forEach((btn) => {
    btn.addEventListener("click", () => {
        const text = btn.textContent.replace(/[^a-zA-Z ]/g, "").trim();
        if (text && !btn.id) { 
            userInput.value = `Tell me about ${text}`;
            userInput.focus();
            chatForm.requestSubmit();
        }
    });
});

// Settings Logic
if(settingsBtn) {
    settingsBtn.addEventListener("click", () => {
        settingsModal.style.display = "flex";
        voiceSelect.value = localStorage.getItem("ishuVoice") || "hi-IN";
        autoSpeakToggle.checked = localStorage.getItem("ishuAutoSpeak") === "true";
    });
}
if(closeSettingsBtn) closeSettingsBtn.addEventListener("click", () => { settingsModal.style.display = "none"; });
if(saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
        localStorage.setItem("ishuVoice", voiceSelect.value);
        localStorage.setItem("ishuAutoSpeak", autoSpeakToggle.checked);
        settingsModal.style.display = "none";
    });
}
if(clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
        if(confirm("Are you sure you want to delete all chats?")) {
            fetch('/api/clear-chats', { method: 'POST', headers: { "Authorization": getToken() } }).then(() => {
                messagesEl.innerHTML = "";
                document.getElementById("chatHistoryList").innerHTML = "";
                welcomeEl.style.display = "block";
                settingsModal.style.display = "none";
            });
        }
    });
}

function checkMobile() {
    if (window.innerWidth <= 820) { if(menuButton) menuButton.style.display = "block"; } 
    else { if(menuButton) menuButton.style.display = "none"; sidebar.classList.remove("open"); sidebarOverlay.style.display = "none"; }
}
window.addEventListener("resize", checkMobile); checkMobile();
if(menuButton) menuButton.addEventListener("click", () => { sidebar.classList.add("open"); sidebarOverlay.style.display = "block"; });
if(sidebarOverlay) sidebarOverlay.addEventListener("click", () => { sidebar.classList.remove("open"); sidebarOverlay.style.display = "none"; });

if (exportDataBtn) exportDataBtn.addEventListener("click", () => { window.location.href = "/api/export"; });

document.querySelectorAll(".suggestion").forEach((btn) => {
    btn.addEventListener("click", () => { userInput.value = btn.dataset.prompt; userInput.focus(); chatForm.requestSubmit(); });
});

// 🔥 New Chat (अब नया सेशन बनाएगा)
if(newChatBtn) newChatBtn.addEventListener("click", () => {
    messagesEl.innerHTML = ""; 
    welcomeEl.style.display = "block";
    currentSessionId = "session_" + Date.now(); 
    lastUserMessage = "";
    if(window.innerWidth <= 820) { sidebar.classList.remove("open"); sidebarOverlay.style.display = "none"; }
});

// File Upload
fileButton.addEventListener("click", () => {
    if(!getToken()) { alert("Please log in first to upload files."); authModal.style.display = "flex"; } 
    else { fileInput.click(); }
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
        reader.onload = (e) => { selectedImageBase64 = e.target.result; fileButton.style.color = "#3ddc97"; };
        reader.readAsDataURL(file);
    } else {
        reader.onload = (e) => { selectedFileText = e.target.result; fileButton.style.color = "#3ddc97"; };
        reader.readAsText(file);
    }
});

// Voice Input
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition(); recognition.lang = 'hi-IN'; recognition.interimResults = false;
    micButton.addEventListener("click", () => { recognition.start(); micButton.style.color = "red"; });
    recognition.onresult = (event) => { userInput.value = event.results[0][0].transcript; micButton.style.color = "#8b949e"; userInput.dispatchEvent(new Event('input')); chatForm.requestSubmit(); };
    recognition.onerror = () => { micButton.style.color = "#8b949e"; };
}

// Text to Speech
function speakText(text) {
    if (!text) return;
    const isAutoSpeak = localStorage.getItem("ishuAutoSpeak") === "true";
    if (!isAutoSpeak) return; 
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    let cleanText = text.replace(/[*#`_~\[\]()]/g, '').replace(/[^a-zA-Z0-9\s\u0900-\u097F.,?!😄😂😊😉👍]/g, ''); 
    if (cleanText.trim() === "") return;
    const selectedLang = localStorage.getItem("ishuVoice") || "hi-IN";
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLang; 
    window.speechSynthesis.speak(utterance);
}

// Send Message
async function sendMessage(message) {
    const text = message.trim(); 
    if (!text && !selectedFileText && !selectedImageBase64) return;
    
    welcomeEl.style.display = "none";

    // 🔥 अगर सेशन नहीं है, तो नया बनाओ
    if(!currentSessionId) currentSessionId = "session_" + Date.now();

    let displayMessage = text; 
    if (selectedFileText) displayMessage = `[File attached] ${text}`;
    if (selectedImageBase64) displayMessage = `[Image attached] ${text}`;
    addMessage("user", displayMessage);
    lastUserMessage = text;
    
    userInput.value = ""; 
    userInput.style.height = "auto";
    micButton.style.display = "flex"; sendButton.style.display = "none";

    let seconds = 0;
    const thinkingMsg = addMessage("ai", "ISHU AI is thinking... (0s)");
    const timer = setInterval(() => {
        seconds++;
        thinkingMsg.querySelector(".bubble").textContent = `ISHU AI is thinking... (${seconds}s)`;
    }, 1000);

    let finalMessage = text;
    if (selectedFileText) finalMessage = `Here is the text from my file:\n\n${selectedFileText}\n\nNow my question: ${text}`;

    try {
        const response = await fetch("/api/chat", { 
            method: "POST", 
            headers: { "Content-Type": "application/json", "Authorization": getToken() }, 
            body: JSON.stringify({ message: finalMessage, image: selectedImageBase64, session_id: currentSessionId }) 
        });
        const data = await response.json(); 
        clearInterval(timer); 
        renderMessageWithCode(thinkingMsg, data.reply);
        setTimeout(loadChatHistory, 1000); 
        selectedFileText = ""; selectedImageBase64 = ""; fileInput.value = ""; fileButton.style.color = "#8b949e";
    } catch (error) { 
        clearInterval(timer); 
        thinkingMsg.querySelector(".bubble").textContent = "⚠ Error: Could not connect to server."; 
    }
}

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    lastUserMessage = ""; 
    sendMessage(userInput.value);
});

// Render Message
function renderMessageWithCode(msgDiv, text) {
    const bubble = msgDiv.querySelector(".bubble");
    bubble.innerHTML = ""; 
    const parts = text.split(/(```[\s\S]*?```)/g);
    parts.forEach(part => {
        if (part.startsWith("```") && part.endsWith("```")) {
            const codeText = part.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
            const codeDiv = document.createElement("div"); codeDiv.className = "code-container";
            const header = document.createElement("div"); header.className = "code-header"; header.innerHTML = `<span>Code</span>`;
            const copyBtn = document.createElement("button"); copyBtn.className = "copy-btn"; copyBtn.textContent = "Copy";
            copyBtn.onclick = () => { navigator.clipboard.writeText(codeText); copyBtn.textContent = "Copied!"; setTimeout(() => copyBtn.textContent = "Copy", 2000); };
            header.appendChild(copyBtn);
            const codeContent = document.createElement("div"); codeContent.className = "code-content"; codeContent.textContent = codeText;
            codeDiv.appendChild(header); codeDiv.appendChild(codeContent); bubble.appendChild(codeDiv);
        } else {
            if (part.trim() !== "") { const textNode = document.createElement("span"); textNode.textContent = part; bubble.appendChild(textNode); }
        }
    });

    const actionDiv = document.createElement("div"); actionDiv.className = "action-buttons";

    const copyIcon = document.createElement("button"); copyIcon.className = "action-icon"; copyIcon.title = "Copy";
    copyIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyIcon.onclick = () => { navigator.clipboard.writeText(text); copyIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`; setTimeout(() => copyIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`, 2000); };
    actionDiv.appendChild(copyIcon);

    const thumbUp = document.createElement("button"); thumbUp.className = "action-icon"; thumbUp.title = "Good Response";
    thumbUp.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;
    thumbUp.onclick = () => { thumbUp.style.color = "#3ddc97"; thumbDown.style.color = "#8b949e"; };
    actionDiv.appendChild(thumbUp);

    const thumbDown = document.createElement("button"); thumbDown.className = "action-icon"; thumbDown.title = "Bad Response";
    thumbDown.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`;
    thumbDown.onclick = () => { thumbDown.style.color = "#f85149"; thumbUp.style.color = "#8b949e"; };
    actionDiv.appendChild(thumbDown);

    const speakerContainer = document.createElement("div"); speakerContainer.style.display = "flex"; speakerContainer.style.alignItems = "center";
    const speakIcon = document.createElement("button"); speakIcon.className = "action-icon"; speakIcon.title = "Listen";
    speakIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const waveDiv = document.createElement("div"); waveDiv.className = "speaking-waves"; waveDiv.style.display = "none"; waveDiv.innerHTML = "<span></span><span></span><span></span><span></span>";

    speakIcon.onclick = () => {
        if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); waveDiv.style.display = "none"; } 
        else {
            const selectedLang = localStorage.getItem("ishuVoice") || "hi-IN";
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = selectedLang;
            window.speechSynthesis.speak(utterance);
            waveDiv.style.display = "flex";
            utterance.onend = () => { waveDiv.style.display = "none"; };
        }
    };
    speakerContainer.appendChild(speakIcon); speakerContainer.appendChild(waveDiv); actionDiv.appendChild(speakerContainer);

    const shareIcon = document.createElement("button"); shareIcon.className = "action-icon"; shareIcon.title = "Share";
    shareIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`;
    shareIcon.onclick = () => {
        if (navigator.share) { navigator.share({ title: 'ISHU AI', text: text }).catch(console.error); } 
        else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank'); }
    };
    actionDiv.appendChild(shareIcon);

    const regenBtn = document.createElement("button"); regenBtn.className = "action-icon"; regenBtn.style.marginLeft = "auto"; regenBtn.title = "Regenerate";
    regenBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
    regenBtn.onclick = () => { if(lastUserMessage) { msgDiv.remove(); sendMessage(lastUserMessage); } };
    actionDiv.appendChild(regenBtn);

    bubble.appendChild(actionDiv);
    speakText(text);
}

function addMessage(role, text) {
    const msgDiv = document.createElement("div"); msgDiv.className = `msg ${role}`;
    const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = text;
    msgDiv.appendChild(bubble); messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight; return msgDiv; 
}

async function loadChatHistory() {
    try {
        const res = await fetch('/api/history', { headers: { "Authorization": getToken() } }); 
        const chats = await res.json();
        const historyList = document.getElementById('chatHistoryList'); 
        if(!historyList) return;
        
        historyList.innerHTML = ""; 
        const uniqueSessions = [];
        chats.forEach(c => { 
            if(!uniqueSessions.find(s => s.session_id === c.session_id)) {
                uniqueSessions.push(c); 
            }
        });

        uniqueSessions.forEach((chat, index) => {
            if (index > 10) return; 
            const btn = document.createElement('button'); 
            let displayTitle = chat.message || "New Chat";
            if(displayTitle.length > 25) displayTitle = displayTitle.substring(0, 25) + "...";
            btn.textContent = displayTitle; 
            btn.addEventListener('click', () => openOldChat(chat.session_id)); 
            historyList.appendChild(btn);
        });
    } catch (error) { console.error("History Error:", error); }
}

function openOldChat(sessionId) {
    messagesEl.innerHTML = ""; welcomeEl.style.display = "none";
    if(window.innerWidth <= 820) { sidebar.classList.remove("open"); sidebarOverlay.style.display = "none"; }
    
    // 🔥 पुरानी चैट खोलने पर currentSessionId सेट करो
    currentSessionId = sessionId;

    fetch('/api/chat-details', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', "Authorization": getToken() }, 
        body: JSON.stringify({ session_id: sessionId }) 
    })
    .then(res => res.json()).then(data => {
        if(data.history && data.history.length > 0) { 
            let lastFoundUserMsg = "";
            data.history.forEach(msg => { 
                const role = msg.role === 'user' ? 'user' : 'ai';
                const msgDiv = addMessage(role, ""); 
                if(role === 'ai') { renderMessageWithCode(msgDiv, msg.message); } 
                else { 
                    msgDiv.querySelector(".bubble").textContent = msg.message; 
                    lastFoundUserMsg = msg.message; 
                }
            });
            lastUserMessage = lastFoundUserMsg; 
        } 
        else { addMessage("ai", "Sorry, I couldn't find that chat."); }
    });
}
document.addEventListener("DOMContentLoaded", loadChatHistory);