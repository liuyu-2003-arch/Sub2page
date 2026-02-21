import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import SrtParser from "srt-parser-2";
import { GoogleGenAI } from "@google/genai";
import { parse as parseAss } from "ass-compiler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Gemini
const genAI = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

async function generateSummary(text: string) {
  if (!genAI) return "A cinematic transcript captured in time.";
  try {
    const model = genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: `Summarize this movie/video transcript in one artistic, poetic sentence: ${text.substring(0, 5000)}` }] }],
    });
    const response = await model;
    return response.text || "A cinematic transcript captured in time.";
  } catch (err) {
    console.error("Gemini error:", err);
    return "A cinematic transcript captured in time.";
  }
}

// Ensure subtitle directory exists
const subtitleDir = path.join(__dirname, "subtitle");
if (!fs.existsSync(subtitleDir)) {
  fs.mkdirSync(subtitleDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const parser = new SrtParser();

function generateHtml(title: string, subtitleData: any[], seed: string, summary: string, album: string = "Untitled Collection", tags: string = "Archive, Transcript") {
  const itemsHtml = subtitleData.map(item => `
    <div class="subtitle-item" id="cue-${item.id}">
      <div class="time">${item.startTime}</div>
      <div class="text editable" contenteditable="true">${item.text}</div>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M9 9l6 3-6 3V9z'%3E%3C/path%3E%3C/svg%3E" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;1,400&family=Libre+Baskerville:ital@0;1&family=Space+Grotesk:wght@300;400;600&display=swap');
        
        :root {
            --bg: #ffffff;
            --text: #000000;
            --accent: rgba(0, 0, 0, 0.05);
            --font-size: 2.5rem;
            --font-family: 'Playfair Display', serif;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .cover {
            width: 100%;
            height: 60vh;
            overflow: hidden;
            position: relative;
        }

        .cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(1) brightness(0.9);
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 10vh 2rem;
        }

        header {
            margin-bottom: 15vh;
            border-left: 1px solid black;
            padding-left: 2rem;
            position: relative;
            z-index: 10;
        }

        h1 {
            font-family: 'Anton', sans-serif;
            font-size: clamp(4rem, 15vw, 10rem);
            line-height: 0.85;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.04em;
        }

        .meta {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            color: rgba(0, 0, 0, 0.4);
            margin-top: 2.5rem;
            display: flex;
            gap: 2rem;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .meta-label {
            font-size: 0.5rem;
            opacity: 0.5;
            letter-spacing: 0.1em;
        }

        .editable:hover {
            outline: 1px dashed rgba(0,0,0,0.2);
            outline-offset: 4px;
            cursor: text;
        }

        .editable:focus {
            outline: 1px solid black;
            outline-offset: 4px;
            background: rgba(0,0,0,0.02);
        }

        .subtitle-item {
            margin-bottom: 6rem;
            opacity: 0.5;
            transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .subtitle-item:hover {
            opacity: 1;
            transform: translateX(10px);
        }

        .time {
            font-family: 'Inter', sans-serif;
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.2em;
            color: rgba(0, 0, 0, 0.3);
            margin-bottom: 1rem;
        }

        .text {
            font-family: var(--font-family);
            font-size: var(--font-size);
            line-height: 1.4;
            font-style: italic;
        }

        .noise {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            opacity: 0.05;
            z-index: 9999;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* Editor UI */
        #editor-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            z-index: 2000;
            padding: 3rem 2rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            display: none; /* Hidden by default */
            flex-direction: column;
            gap: 1.5rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            box-sizing: border-box;
        }

        #editor-panel.visible {
            display: flex;
        }

        .toggle-editor-btn, .back-btn {
            position: fixed;
            top: 2rem;
            z-index: 1000;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 0.75rem 1.5rem;
            border-radius: 100px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(0,0,0,0.05);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .toggle-editor-btn {
            right: 2rem;
        }

        .back-btn {
            left: 2rem;
        }

        .toggle-editor-btn:hover, .back-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            border-color: black;
        }

        .control-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 1rem;
        }

        .control-label {
            font-size: 0.6rem;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            font-weight: 800;
            color: rgba(0,0,0,0.3);
            width: 80px;
        }

        .style-btn {
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .style-btn:hover {
            border-color: black;
            background: #fafafa;
        }

        .style-btn.active {
            background: black;
            color: white;
            border-color: black;
        }

        footer {
            margin-top: 20vh;
            padding-top: 4rem;
            border-top: 1px solid var(--accent);
            font-size: 0.6rem;
            text-transform: uppercase;
            letter-spacing: 0.3em;
            color: rgba(0, 0, 0, 0.2);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="noise"></div>
    <button class="back-btn" onclick="window.location.href='/'">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back
    </button>
    <button class="toggle-editor-btn" onclick="toggleEditor()">Settings</button>
    <div class="cover">
        <img src="https://picsum.photos/seed/${seed}/1920/1080?grayscale" alt="" />
    </div>
    
    <div class="container">
        <div id="editor-panel">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div class="control-group">
                    <span class="control-label">Font</span>
                    <button class="style-btn" onclick="updateStyle('font-family', '\\'Playfair Display\\', serif', this)">Playfair</button>
                    <button class="style-btn" onclick="updateStyle('font-family', '\\'Libre Baskerville\\', serif', this)">Baskerville</button>
                    <button class="style-btn" onclick="updateStyle('font-family', '\\'Space Grotesk\\', sans-serif', this)">Grotesk</button>
                    <button class="style-btn" onclick="updateStyle('font-family', '\\'Inter\\', sans-serif', this)">Inter</button>
                </div>
                <div class="control-group">
                    <span class="control-label">Size</span>
                    <button class="style-btn" onclick="updateStyle('font-size', '1.5rem', this)">Small</button>
                    <button class="style-btn" onclick="updateStyle('font-size', '2.5rem', this)">Medium</button>
                    <button class="style-btn" onclick="updateStyle('font-size', '3.5rem', this)">Large</button>
                    <button class="style-btn" onclick="updateStyle('font-size', '4.5rem', this)">X-Large</button>
                </div>
            </div>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); font-size: 0.7rem; color: rgba(0,0,0,0.5);">
                Tip: Click on any text (Title, Album, Tags, or Subtitles) to edit it directly on the page.
            </div>
            <button class="style-btn" style="align-self: flex-end; margin-top: 1rem; background: black; color: white; padding: 0.75rem 2rem; border-radius: 100px;" onclick="saveChanges()">Save Changes</button>
        </div>

        <header>
            <div style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                <div style="width: 40px; height: 40px; background: black; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 9l6 3-6 3V9z"></path></svg>
                </div>
                <span style="font-family: 'Anton', sans-serif; font-size: 1.2rem; letter-spacing: 0.2em; text-transform: uppercase;">SUB.GEN</span>
            </div>
            <h1 contenteditable="true" class="editable" id="page-title">${title}</h1>
            <p contenteditable="true" class="editable" id="page-summary" style="margin-top: 2rem; font-size: 1.1rem; font-style: italic; color: rgba(0,0,0,0.6); max-width: 600px; line-height: 1.6;">
                "${summary}"
            </p>
            <div class="meta">
                <div class="meta-item">
                    <span class="meta-label">Album</span>
                    <span contenteditable="true" class="editable" id="meta-album">${album}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Tags</span>
                    <span contenteditable="true" class="editable" id="meta-tags">${tags}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Type</span>
                    <span>Subtitles</span>
                </div>
            </div>
        </header>
        <main>
            ${itemsHtml}
        </main>
        <footer>
            Generated by SUB.GEN / ${new Date().getFullYear()}
        </footer>
    </div>

    <script>
        function toggleEditor() {
            const panel = document.getElementById('editor-panel');
            panel.classList.toggle('visible');
        }

        async function saveChanges() {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;

            const data = {
                title: document.getElementById('page-title').textContent,
                summary: document.getElementById('page-summary').textContent.replace(/^"|"$/g, ''),
                album: document.getElementById('meta-album').textContent,
                tags: document.getElementById('meta-tags').textContent,
                subtitleData: Array.from(document.querySelectorAll('.subtitle-item')).map(item => ({
                    id: item.id.replace('cue-', ''),
                    startTime: item.querySelector('.time').textContent.split(' — ')[0], // Note: this might need adjustment if format changed
                    endTime: item.querySelector('.time').textContent.split(' — ')[1] || '',
                    text: item.querySelector('.text').textContent
                }))
            };

            // Fix startTime/endTime if they are just one string in the UI
            const timeElements = document.querySelectorAll('.time');
            data.subtitleData = Array.from(document.querySelectorAll('.subtitle-item')).map((item, i) => {
                const timeText = item.querySelector('.time').textContent;
                return {
                    id: item.id.replace('cue-', ''),
                    startTime: timeText, // We'll just store the whole string if it's not split
                    text: item.querySelector('.text').textContent
                };
            });

            try {
                const response = await fetch(\`/api/subtitles/${seed}/save\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    btn.textContent = 'Saved!';
                    setTimeout(() => {
                        btn.textContent = 'Save Changes';
                        btn.disabled = false;
                        toggleEditor();
                    }, 1000);
                } else {
                    alert('Failed to save changes');
                    btn.textContent = 'Error';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert('Network error');
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        }

        function updateStyle(prop, value, btn) {
            document.documentElement.style.setProperty('--' + prop, value);
            localStorage.setItem('subgen-' + prop, value);
            
            // Update active state
            if (btn) {
                const group = btn.parentElement;
                group.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        }

        // Load saved styles
        window.onload = () => {
            const savedFont = localStorage.getItem('subgen-font-family');
            const savedSize = localStorage.getItem('subgen-font-size');
            
            if (savedFont) {
                document.documentElement.style.setProperty('--font-family', savedFont);
                const btn = Array.from(document.querySelectorAll('.style-btn')).find(b => b.textContent.toLowerCase().includes(savedFont.split("'")[1].split(" ")[0].toLowerCase()));
                if (btn) btn.classList.add('active');
            } else {
                document.querySelectorAll('.control-group')[0].querySelectorAll('.style-btn')[0].classList.add('active');
            }
            
            if (savedSize) {
                document.documentElement.style.setProperty('--font-size', savedSize);
                const btn = Array.from(document.querySelectorAll('.style-btn')).find(b => b.onclick.toString().includes(savedSize));
                if (btn) btn.classList.add('active');
            } else {
                document.querySelectorAll('.control-group')[1].querySelectorAll('.style-btn')[1].classList.add('active');
            }
        };
    </script>
</body>
</html>
  `;
}

// API Routes
app.use(express.json());

// List all generated subtitles
app.get("/api/subtitles", (req, res) => {
  try {
    const files = fs.readdirSync(subtitleDir)
      .filter(file => file.endsWith(".html"))
      .map(file => ({
        name: file.replace(".html", ""),
        url: `/subtitle/${file}`,
        mtime: fs.statSync(path.join(subtitleDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Failed to list subtitles" });
  }
});

// Delete a subtitle
app.delete("/api/subtitles/:name", (req, res) => {
  const { name } = req.params;
  const filePath = path.join(subtitleDir, `${name}.html`);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Rename a subtitle
app.patch("/api/subtitles/:name", (req, res) => {
  const { name } = req.params;
  const { newName } = req.body;
  
  if (!newName) return res.status(400).json({ error: "New name is required" });
  
  const oldPath = path.join(subtitleDir, `${name}.html`);
  const newPath = path.join(subtitleDir, `${newName}.html`);
  
  try {
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      res.json({ success: true, url: `/subtitle/${newName}.html` });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to rename file" });
  }
});

// Save changes to a subtitle
app.post("/api/subtitles/:name/save", (req, res) => {
  const { name } = req.params;
  const { title, summary, album, tags, subtitleData } = req.body;
  
  const filePath = path.join(subtitleDir, `${name}.html`);
  
  try {
    if (fs.existsSync(filePath)) {
      const htmlContent = generateHtml(title, subtitleData, name, summary, album, tags);
      fs.writeFileSync(filePath, htmlContent);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save changes" });
  }
});

// Upload and generate
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const content = req.file.buffer.toString("utf-8");
    const extension = path.extname(req.file.originalname).toLowerCase();
    let subtitleData: any[] = [];

    if (extension === ".ass") {
      const parsedAss = parseAss(content);
      subtitleData = parsedAss.events.dialogue.map((d, i) => ({
        id: i + 1,
        startTime: d.Start,
        endTime: d.End,
        text: d.Text.combined.replace(/\{[^}]+\}/g, "").replace(/\\N/g, " "),
      }));
    } else {
      subtitleData = parser.fromSrt(content);
    }
    
    // Sanitize filename: remove extension, keep alphanumeric and hyphens
    const originalName = path.parse(req.file.originalname).name;
    let sanitizedName = originalName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    
    // Fallback if sanitized name is empty (e.g. all Chinese characters)
    if (!sanitizedName) {
      sanitizedName = `subtitle-${Date.now()}`;
    } else {
      // Add a short hash or timestamp to avoid collisions
      sanitizedName = `${sanitizedName}-${Math.random().toString(36).substring(2, 7)}`;
    }
    
    // Generate AI Summary
    const fullText = subtitleData.map(d => d.text).join(" ");
    const summary = await generateSummary(fullText);
    
    const htmlContent = generateHtml(originalName, subtitleData, sanitizedName, summary);
    const fileName = `${sanitizedName}.html`;
    const filePath = path.join(subtitleDir, fileName);

    fs.writeFileSync(filePath, htmlContent);

    res.json({
      success: true,
      name: sanitizedName,
      url: `/subtitle/${fileName}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process subtitle file" });
  }
});

// Serve generated subtitles
app.use("/subtitle", express.static(subtitleDir));

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
