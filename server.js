const http = require("http");
const url = require("url");
const { request } = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PORT = process.env.PORT || 3001;
const AI_MODEL = process.env.AI_MODEL || 'llama3';
const OLLAMA_API_HOST = process.env.OLLAMA_API_HOST || 'localhost';
const OLLAMA_API_PORT = process.env.OLLAMA_API_PORT || 11434;

http
  .createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
      serveStaticFile(res, "index.html");
    } else if (parsedUrl.pathname === "/about.html") {
      serveStaticFile(res, "about.html");
    } else if (parsedUrl.pathname === "/ollama.jpeg") {
      serveStaticFile(res, "ollama.jpeg", "image/jpeg");
    } else if (parsedUrl.pathname === "/generate") {
      const queryObject = parsedUrl.query;
      if (queryObject.mensagem) {
        // First, request AI to generate image search keywords
        const imagePromptRequest = {
          model: AI_MODEL,
          prompt: `Generate 3-5 keywords for Unsplash image search related to "${queryObject.mensagem}". Output format: keyword1, keyword2, keyword3`,
          stream: false,
        };

        makeAIRequest(imagePromptRequest, (imagePrompt) => {
          // Use the generated prompt to search for images on Unsplash
          searchUnsplashImages(imagePrompt, (imageUrls) => {
            // Create the improved prompt to generate a simple but well-structured and informative landing page
            const sitePrompt = `Create HTML for a simple, well-structured, and informative landing page about "${queryObject.mensagem}". Requirements:
1. Responsive design using flexbox or CSS grid
2. Clean and modern aesthetic
3. Simple navigation with Home(/index.html), About(/about.html), and Author(https://github.com/Unix-User) links at the top of the page
4. Hero section with a relevant Unsplash image and a clear, concise headline
5. Brief "About" section explaining the main concept or service
6. Key features or benefits section (3-4 points)
7. Simple and responsive and elegant call-to-action (CTA) button
8. Minimal footer with essential links at the bottom of the page
9. Use this image URL for the hero section: ${imageUrls[0]}
10. Use a color scheme that complements the hero image
11. Optimize for fast loading and readability
Output: Single HTML file with inline CSS and minimal JS (if needed). Include only <head> and <body> tags.
Any explanations or comments should be included as HTML comments within the code.
Focus on clarity, simplicity, and effective communication of the main message.
Ensure the structure follows this order: navigation, hero, about, features, CTA, footer.
DO NOT INCLUDE ANY TEXT OR CODE OUTSIDE OF THE HTML STRUCTURE.`;

            const siteRequest = {
              model: AI_MODEL,
              prompt: sitePrompt,
              stream: false,
            };

            makeAIRequest(siteRequest, (siteContent) => {
              // Filter the LLM response to include only the HTML content
              const filteredContent = siteContent
                .replace(/^[\s\S]*?<head>/, "<head>")
                .replace(/<\/body>[\s\S]*$/, "</body>");

              // Request AI to review and optimize the generated content
              const optimizationPrompt = `Optimize the following HTML content for a responsive, concise, and elegant landing page:

1. Include only <head> and <body> tags
2. Use semantic HTML5 and responsive CSS3
3. Structure: nav, hero, about, features, CTA, footer
4. Ensure all links use "./index.html", "./about.html", or author's GitHub
5. Translate site content to Brazilian Portuguese, ensuring proper localization and cultural adaptation.
6. Don't change/remove existing url images, but optimize for responsiveness
7. Implement accessibility features (alt text, ARIA)
8. Minify inline CSS

Content to optimize:
${filteredContent}

Output: Single HTML file with inline CSS and minimal JS. Include only <head> and <body> tags.
Use HTML comments for explanations.
Focus on clarity and effective communication.
DO NOT include any content outside the HTML structure.`;

              const optimizationRequest = {
                model: AI_MODEL,
                prompt: optimizationPrompt,
                stream: false,
              };

              makeAIRequest(optimizationRequest, (optimizedContent) => {
                // Apply second filter to remove content before <head> and after </body>
                const finalContent = optimizedContent
                  .replace(/^[\s\S]*?<head>/, "<head>")
                  .replace(/<\/body>[\s\S]*$/, "</body>");
                
                res.writeHead(200, {
                  "Content-Type": "text/html; charset=utf-8",
                });
                res.end(`<!DOCTYPE html>${finalContent}`);
              });
            });
          });
        });
      } else {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<html><body>Error: Missing 'mensagem' parameter</body></html>"
        );
      }
    } else {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body>Error: Not Found</body></html>");
    }
  })
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

function serveStaticFile(res, fileName, contentType = "text/html") {
  const filePath = path.join(__dirname, fileName);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("<html><body>Error loading the file</body></html>");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
}

function makeAIRequest(postData, callback) {
  const options = {
    hostname: OLLAMA_API_HOST,
    port: OLLAMA_API_PORT,
    path: "/api/generate",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(postData)),
    },
  };

  const req = request(options, (response) => {
    let data = "";
    response.on("data", (chunk) => {
      data += chunk;
    });
    response.on("end", () => {
      try {
        const jsonResponse = JSON.parse(data);
        callback(jsonResponse.response);
      } catch (error) {
        console.error("Error parsing AI response:", error);
        callback(null);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Error making AI request:", error);
    callback(null);
  });

  req.write(JSON.stringify(postData));
  req.end();
}

function searchUnsplashImages(query, callback) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query
  )}&per_page=5`;
  const options = {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  };

  https
    .get(url, options, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        try {
          const result = JSON.parse(data);
          const imageUrls = result.results.map((photo) => photo.urls.regular);
          callback(imageUrls);
        } catch (error) {
          console.error("Error parsing Unsplash response:", error);
          callback([]);
        }
      });
    })
    .on("error", (error) => {
      console.error("Error fetching images from Unsplash:", error);
      callback([]);
    });
}
