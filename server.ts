import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import SrtParser from "srt-parser-2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure subtitle directory exists
const subtitleDir = path.join(__dirname, "subtitle");
if (!fs.existsSync(subtitleDir)) {
  fs.mkdirSync(subtitleDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const parser = new SrtParser();

function generateHtml(title: string, subtitleData: any[], seed: string) {
  const itemsHtml = subtitleData.map(item => `
    <div class="subtitle-item" id="cue-${item.id}">
      <div class="time">${item.startTime}</div>
      <div class="text">${item.text}</div>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
            font-size: clamp(3rem, 10vw, 6rem);
            line-height: 0.9;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.02em;
        }

        .meta {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            color: rgba(0, 0, 0, 0.4);
            margin-top: 1.5rem;
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
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 1rem 2rem;
            border-radius: 100px;
            display: flex;
            gap: 2rem;
            align-items: center;
            z-index: 10000;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            transition: opacity 0.3s, transform 0.3s;
        }

        #editor-panel:hover {
            background: rgba(255, 255, 255, 1);
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .control-label {
            font-size: 0.6rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
            color: rgba(0,0,0,0.4);
        }

        select, input[type="range"] {
            background: transparent;
            border: none;
            font-family: 'Inter', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            outline: none;
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

        @media (max-width: 768px) {
            #editor-panel {
                width: 90%;
                gap: 1rem;
                padding: 1rem;
                flex-direction: column;
                border-radius: 20px;
                bottom: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="noise"></div>
    <div class="cover">
        <img src="https://picsum.photos/seed/${seed}/1920/1080?grayscale" alt="" />
    </div>
    
    <div id="editor-panel">
        <div class="control-group">
            <span class="control-label">Font</span>
            <select id="font-select" onchange="updateStyle('font-family', this.value)">
                <option value="'Playfair Display', serif">Playfair Display</option>
                <option value="'Libre Baskerville', serif">Libre Baskerville</option>
                <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                <option value="'Inter', sans-serif">Inter Sans</option>
            </select>
        </div>
        <div class="control-group">
            <span class="control-label">Size</span>
            <input type="range" min="1" max="5" step="0.1" value="2.5" oninput="updateStyle('font-size', this.value + 'rem')">
        </div>
    </div>

    <div class="container">
        <header>
            <h1>${title}</h1>
            <div class="meta">Transcript / Subtitles / Archive</div>
        </header>
        <main>
            ${itemsHtml}
        </main>
        <footer>
            Generated by SUB.GEN / ${new Date().getFullYear()}
        </footer>
    </div>

    <script>
        function updateStyle(prop, value) {
            document.documentElement.style.setProperty('--' + prop, value);
            localStorage.setItem('subgen-' + prop, value);
        }

        // Load saved styles
        window.onload = () => {
            const savedFont = localStorage.getItem('subgen-font-family');
            const savedSize = localStorage.getItem('subgen-font-size');
            if (savedFont) {
                document.documentElement.style.setProperty('--font-family', savedFont);
                document.getElementById('font-select').value = savedFont;
            }
            if (savedSize) {
                document.documentElement.style.setProperty('--font-size', savedSize);
                document.querySelector('input[type="range"]').value = savedSize.replace('rem', '');
            }
        };

        // Hide editor on scroll
        let lastScroll = 0;
        window.onscroll = () => {
            const currentScroll = window.pageYOffset;
            const panel = document.getElementById('editor-panel');
            if (currentScroll > lastScroll && currentScroll > 200) {
                panel.style.opacity = '0.3';
                panel.style.transform = 'translateX(-50%) translateY(20px)';
            } else {
                panel.style.opacity = '1';
                panel.style.transform = 'translateX(-50%) translateY(0)';
            }
            lastScroll = currentScroll;
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

// Upload and generate
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const content = req.file.buffer.toString("utf-8");
    const subtitleData = parser.fromSrt(content);
    
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
    
    const htmlContent = generateHtml(originalName, subtitleData, sanitizedName);
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
