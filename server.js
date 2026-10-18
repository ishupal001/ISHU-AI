const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Ollama } = require('ollama'); // 🔥 Ollama Cloud के लिए
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 Ollama Cloud Setup
const ollamaCloud = new Ollama({
    host: 'https://ollama.com',
    headers: { Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY }
});

const db = new sqlite3.Database('./ishu_memory.db');

// टेबल्स
db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS chat_memory (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, session_id TEXT, role TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);

function saveTrainingData(prompt, response) {
    const data = JSON.stringify({ prompt: prompt, response: response }) + "\n";
    fs.appendFileSync('training_data.jsonl', data, 'utf8');
}

// AUTH
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: "This email is already registered!" });
            res.json({ success: true, message: "Account created successfully!" });
        });
    } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: "Invalid email or password!" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password!" });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret_key", { expiresIn: '7d' });
        res.json({ success: true, token: token });
    });
});

// HISTORY
app.get('/api/history', (req, res) => {
    const token = req.headers.authorization;
    let userId = 0; 
    if(token) { try { const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key"); userId = decoded.id; } catch(e) {} }
    
    db.all("SELECT session_id, message FROM chat_memory WHERE role = 'user' AND user_id = ? GROUP BY session_id ORDER BY id DESC", [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        res.json(rows);
    });
});

// GET CHAT DETAILS
app.post('/api/chat-details', (req, res) => {
    const token = req.headers.authorization;
    let userId = 0;
    if(token) { try { const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key"); userId = decoded.id; } catch(e) {} }
    const sessionId = req.body.session_id;
    
    db.all("SELECT role, message FROM chat_memory WHERE session_id = ? AND user_id = ? ORDER BY id ASC", [sessionId, userId], (err, rows) => {
        if (err) return res.json({ history: [] });
        res.json({ history: rows });
    });
});

// CLEAR CHATS
app.post('/api/clear-chats', (req, res) => {
    const token = req.headers.authorization;
    let userId = 0;
    if(token) { try { const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key"); userId = decoded.id; } catch(e) {} }
    db.run("DELETE FROM chat_memory WHERE user_id = ?", [userId], (err) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        res.json({ success: true });
    });
});

// EXPORT
app.get('/api/export', (req, res) => {
    db.all("SELECT role, message, timestamp FROM chat_memory ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        res.setHeader('Content-Disposition', 'attachment; filename="ishu_ai_training_data.json"');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(rows, null, 2));
    });
});

// 🔥 MAIN CHAT API (Ollama Cloud + Memory + Translation)
app.post('/api/chat', async (req, res) => {
    try {
        const token = req.headers.authorization;
        let userId = 0;
        if(token) { try { const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key"); userId = decoded.id; } catch(e) {} }

        let userMessage = req.body.message || "";
        let imageBase64 = req.body.image || null;
        let sessionId = req.body.session_id || "default_session";

        db.run("INSERT INTO chat_memory (user_id, session_id, role, message) VALUES (?, ?, ?, ?)", [userId, sessionId, "user", userMessage]);

        db.all("SELECT role, message FROM chat_memory WHERE session_id = ? AND user_id = ? ORDER BY id DESC LIMIT 20", [sessionId, userId], async (err, rows) => {
            if (err) return res.status(500).json({ reply: "⚠ ERROR: DB_01" });

            let history = rows.reverse().map(row => ({
                role: row.role === 'user' ? 'user' : 'model',
                parts: [{ text: row.message }]
            }));

            let systemInstruction = `You are ISHU AI, a smart and helpful AI assistant created by Ishu. 

            CRITICAL RULES:
            1. If the user says "हिंदी में बोलो" or "is ko hindi ma do", look at the PREVIOUS assistant message in the history. Translate that exact message into Hindi.
            2. If the user says "give me in English", translate the previous message into English.
            3. Answer the user's question directly. NEVER ask "How can I help you?" if the user has already asked something.
            4. Do NOT use asterisks (*), hashtags (#), or markdown tables.
            5. Use line breaks (Enter) after every point.
            6. You can use friendly emojis like 😊.
            7. If asked for code, provide it inside triple backticks (\`\`\`).
            
            LANGUAGE RULE: Reply in the same language the user speaks. Default is English.`;
            
            let messages = [{ role: 'system', content: systemInstruction }];
            history.forEach(h => messages.push(h));

            if (imageBase64) {
                messages.push({ role: 'user', content: userMessage || "Please describe this image.", images: [imageBase64.split(',')[1]] });
            } else {
                messages.push({ role: 'user', content: userMessage });
            }

            console.log(`⏳ Processing request for User ID: ${userId}...`);

            try {
                // 🔥 Ollama Cloud Call
                const response = await ollamaCloud.chat({ 
                    model: 'gpt-oss:120b-cloud', 
                    messages: messages,
                    options: { temperature: 0.7, num_ctx: 4096 }
                });

                const reply = response.message.content;

                db.run("INSERT INTO chat_memory (user_id, session_id, role, message) VALUES (?, ?, ?, ?)", [userId, sessionId, "model", reply]);
                saveTrainingData(userMessage, reply);
                
                res.json({ reply: reply });
            } catch (error) {
                console.error("Ollama Error:", error.message);
                res.status(500).json({ reply: "⚠ Error: Could not connect to AI." });
            }
        });
    } catch (error) {
        res.status(500).json({ reply: "⚠ ERROR CODE: SERVER_500" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ ISHU AI Server running on: http://localhost:${PORT}`);
    console.log(`🚀 Ollama Cloud Mode Active!`);
});
