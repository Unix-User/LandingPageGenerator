const http = require("http");
const url = require("url");
const { request } = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const dotenv = require('dotenv');

dotenv.config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PORT = process.env.PORT || 3001;
const AI_MODEL = process.env.AI_MODEL || 'llama3.2';
const OLLAMA_API_HOST = process.env.OLLAMA_API_HOST || 'localhost';
const OLLAMA_API_PORT = process.env.OLLAMA_API_PORT || 11434;
const OPENAI_API_HOST = process.env.OPENAI_API_HOST || 'https://api.openai.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_PROVIDER = process.env.API_PROVIDER || 'ollama';

const handleStaticFile = (res, fileName, contentType = "text/html") => {
    const filePath = path.join(__dirname, fileName);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<html><body><h1>Error loading the file</h1><p>${err.message}</p></body></html>`);
        } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
        }
    });
};

const handleAIResponse = (res, siteContent) => {
    if (!siteContent) {
        console.error("Site content is null, cannot proceed with filtering.");
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><h1>Error: Failed to generate site content.</h1></body></html>");
        return;
    }

    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
    });
    res.end(siteContent);
};


const generateSite = (res, mensagem) => {
    const imagePromptRequest = {
        model: AI_MODEL,
        prompt: `Generate 3-5 keywords for Unsplash image search related to "${mensagem}". Output format: keyword1, keyword2, keyword3`,
        stream: false,
    };
    console.log("Sending image prompt request to AI:", imagePromptRequest);

    makeAIRequest(imagePromptRequest, (imagePrompt) => {
        console.log("Received image prompt from AI:", imagePrompt);

        searchUnsplashImages(imagePrompt, (imageUrls) => {
            if (!imageUrls || imageUrls.length === 0) {
                console.error("No images found for the given prompt.");
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end("<html><body><h1>Error: No images found.</h1></body></html>");
                return;
            }
            const sitePrompt = `Create HTML for a simple, well-structured, and informative landing page about "${mensagem}". Requirements:
1. Responsive design using flexbox or CSS grid
2. Clean and modern aesthetic
3. Simple navigation with Home(/index.html), About(/about.html), and Author(https://github.com/Unix-User) links at the top of the page
4. Hero section with a relevant Unsplash image and a clear, concise headline
5. Brief "About" section explaining the main concept or service
6. Key features or benefits section (3-4 points)
7. Simple and responsive and elegant call-to-action (CTA) button
8. Minimal footer with essential links at the bottom of the page
9. Use this image URL for the hero section: ${imageUrls[0] || 'https://placekitten.com/800/400'}
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
            console.log("Sending site generation request to AI:", siteRequest);

            makeAIRequest(siteRequest, (siteContent) => {
                console.log("Received site content from AI:", siteContent);
                handleAIResponse(res, siteContent);
            });
        });
    });
};


http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`Request received for: ${parsedUrl.pathname}`);

    switch (parsedUrl.pathname) {
        case "/":
        case "/index.html":
            handleStaticFile(res, "index.html");
            break;
        case "/about.html":
            handleStaticFile(res, "about.html");
            break;
        case "/ollama.jpeg":
            handleStaticFile(res, "ollama.jpeg", "image/jpeg");
            break;
        case "/generate":
            const { mensagem } = parsedUrl.query;
            if (mensagem) {
                generateSite(res, mensagem);
            } else {
                res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                res.end("<html><body><h1>Error: Missing 'mensagem' parameter</h1></body></html>");
            }
            break;
        default:
            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<html><body><h1>Error: Not Found</h1></body></html>");
    }
}).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


async function makeAIRequest(postData, callback) {
    console.log(`API Provider selected: ${API_PROVIDER}`);
    try {
        if (API_PROVIDER === 'ollama') {
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
            console.log("Making AI request to Ollama:", `http://${options.hostname}:${options.port}${options.path}`, "with data:", postData);

            const req = request(options, (response) => {
                let data = "";
                response.on("data", (chunk) => {
                    data += chunk;
                });
                response.on("end", () => {
                    try {
                        const jsonResponse = JSON.parse(data);
                        if (jsonResponse && jsonResponse.response) {
                            let responseText = jsonResponse.response;
                            responseText = responseText.replace(/```html/g, '').replace(/```/g, '');
                            callback(responseText);
                        } else {
                            console.error("Unexpected Ollama response structure:", jsonResponse);
                            callback(null);
                        }
                    } catch (error) {
                        console.error("Error parsing Ollama response:", error);
                        callback(null);
                    }
                });
            });

            req.on("error", (error) => {
                console.error("Error making Ollama request:", error);
                callback(null);
            });

            req.write(JSON.stringify(postData));
            req.end();
        } else if (API_PROVIDER === 'openai') {
            const data = JSON.stringify({
                model: AI_MODEL,
                messages: [{ role: 'user', content: postData.prompt }],
            });

            const options = {
                hostname: new URL(OPENAI_API_HOST).hostname,
                path: new URL(OPENAI_API_HOST).pathname + '/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            };

            console.log("Sending request to OpenAI with data:", data);

            const req = https.request(options, (response) => {
                let responseData = '';
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    console.log("Received response from OpenAI:", responseData);
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        if (jsonResponse.error) {
                            console.error("OpenAI API error:", jsonResponse.error.message);
                            callback(null);
                            return;
                        }
                        if (jsonResponse.choices && jsonResponse.choices.length > 0) {
                            let siteContent = jsonResponse.choices[0].message.content;
                             if (siteContent) {
                                siteContent = siteContent.replace(/```html/g, '').replace(/```/g, '');
                                callback(siteContent);
                            } else {
                                console.error("OpenAI returned empty content.");
                                callback(null);
                            }
                        } else {
                            console.error("Unexpected response structure from OpenAI:", jsonResponse);
                            callback(null);
                        }
                    } catch (error) {
                        console.error("Error parsing OpenAI response:", error);
                        callback(null);
                    }
                });
            });

            req.on('error', (error) => {
                console.error("Error making OpenAI request:", error);
                callback(null);
            });

            req.write(data);
            req.end();
        } else {
            console.error(`Unsupported API provider: ${API_PROVIDER}`);
            callback(null);
        }
    } catch (error) {
        console.error("Error in makeAIRequest:", error);
        callback(null);
    }
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
    console.log("Fetching images from Unsplash with URL:", url);

    https
        .get(url, options, (response) => {
            let data = "";
            response.on("data", (chunk) => {
                data += chunk;
            });
            response.on("end", () => {
                try {
                    const result = JSON.parse(data);
                    console.log("Unsplash API response:", result);
                    if(result && result.results){
                        const imageUrls = result.results.map((photo) => photo.urls.regular);
                        callback(imageUrls);
                    } else {
                        console.error("Unexpected Unsplash response structure:", result);
                        callback([]);
                    }

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

function isValidHTML(content) {
    if (!content || typeof content !== 'string') {
        return false;
    }
    const trimmedContent = content.trim();
    return trimmedContent.startsWith('<!DOCTYPE html>') &&
           trimmedContent.includes('<html') &&
           trimmedContent.includes('<head>') &&
           trimmedContent.includes('<body') &&
           trimmedContent.includes('</html>');
}
