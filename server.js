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
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

const handleStaticFile = (res, fileName, contentType = "text/html", errorType = 'Error', errorMessage = 'Ocorreu um erro.') => {
    if (fileName) {
        const filePath = path.join(__dirname, fileName);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end(`Erro interno do servidor ao carregar ${fileName}`);
                console.error(`Falha ao carregar ${fileName}: ${err}`);
                return;
            } else {
                res.writeHead(200, { "Content-Type": contentType });
                res.end(content);
            }
        });
    } else {
        const filePath = path.join(__dirname, 'error.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end(`Erro interno do servidor ao carregar error.html`);
                console.error(`Falha ao carregar error.html: ${err}`);
                return;
            } else {
                let errorContent = content.toString();
                errorContent = errorContent.replace('<title id="error-title">Error</title>', `<title id="error-title">${errorType}</title>`);
                errorContent = errorContent.replace('<h1 id="error-heading">Error!</h1>', `<h1 id="error-heading">${errorType}!</h1>`);
                errorContent = errorContent.replace('<p >Ocorreu um erro.</p >', `<p>${errorMessage}</p>`);

                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(errorContent);
            }
        });
    }
};

const handleAIResponse = (res, siteContent) => {
    if (!siteContent) {
        console.error("Site content is null, cannot proceed with filtering.");
        handleStaticFile(res, null, "text/html; charset=utf-8", "AI Response Error", "There was an error processing your request with the AI model. Please try again. If the issue persists, consider checking the AI model configuration.");
        return;
    }

    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
    });
    res.end(siteContent);
};


const generateSite = (res, language, mensagem) => {
    const message = mensagem === undefined ? 'Web developer looking for a job' : mensagem;
    const targetLanguage = language === 'pt-br' ? 'pt-br' : 'en-us';
    const imagePromptRequest = {
        model: AI_MODEL,
        prompt: `Generate 3-5 keywords in "${targetLanguage}" language for Unsplash image search related to "${message}". Output format: keyword1, keyword2, keyword3`,
        stream: false,
    };
    console.log("Sending image prompt request to AI:", imagePromptRequest);

    makeAIRequest(imagePromptRequest, (imagePrompt) => {
        console.log("Received image prompt from AI:", imagePrompt);

        searchUnsplashImages(imagePrompt, (imageUrls) => {
            if (!imageUrls || imageUrls.length === 0) {
                console.error("No images found for the given prompt.");
                handleStaticFile(res, null, "text/html; charset=utf-8", "Image Search Error", "Unfortunately, we could not find any relevant images for your request. Please try a different search term or ensure your query is valid.");
                return;
            }
            const sitePrompt = `Create HTML for a simple, well-structured, and informative landing page about "${message}" using "${targetLanguage}". Requirements:
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
11. Include the following meta tags in the <head>:
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta property="og:title" content="Ollama Landing Page Generator" />
    <meta property="og:description" content="Landing page generated by AI" />
    <meta property="og:image" content="https://olpg.udianix.com.br/ollama.jpeg" />
    <meta property="og:url" content="https://olpg.udianix.com.br" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Ollama Landing Page Generator" />
    <meta name="twitter:description" content="Landing page generated by AI" />
    <meta name="twitter:image" content="https://olpg.udianix.com.br/ollama.jpeg" />
12. Optimize for fast loading and readability
Output: Single HTML file with inline CSS and minimal JS (if needed). Include only <head> and <body> tags.
Any explanations or comments should be included as HTML comments within the code.
Focus on clarity, simplicity, and effective communication of the main message.
Ensure the structure follows this order: navigation, hero, about, features, CTA, footer.
DO NOT INCLUDE ANY TEXT OR CODE OUTSIDE OF THE HTML STRUCTURE.
`;


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
        case "/index-en.html":
            handleStaticFile(res, "index-en.html");
            break;
        case "/about.html":
            handleStaticFile(res, "about.html");
            break;
        case "/about-en.html":
            handleStaticFile(res, "about-en.html");
            break;
        case "/ollama.jpeg":
            handleStaticFile(res, "ollama.jpeg", "image/jpeg");
            break;
        case "/generate":
            const { mensagem, language } = parsedUrl.query;
            generateSite(res, language, mensagem);
            break;
        default:
            handleStaticFile(res, null, "text/html; charset=utf-8", "Não Encontrado", `Recurso '${parsedUrl.pathname}' não encontrado no servidor.`);
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
        } else if (API_PROVIDER === 'gemini') {
            const data = JSON.stringify({
                contents: [{
                    parts: [{ text: postData.prompt }]
                }]
            });

    const options = {

                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/${AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
                method: 'POST',
        headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
        },
    };

            const fullUrl = `https://${options.hostname}${options.path}`;
            console.log("Sending request to Gemini URL:", fullUrl);
            console.log("Sending request to Gemini with data:", data);

            const req = https.request(options, (response) => {
                let responseData = '';
                response.on('data', (chunk) => {
                    responseData += chunk;
            });
                response.on('end', () => {
                    if (responseData.trim().startsWith('<')) {
                        console.error("Received an HTML response instead of JSON. URL might be incorrect. Response:", responseData);
                            callback(null);
                            return;
                    }

                    console.log("Received response from Gemini:", responseData);
                try {
                        const jsonResponse = JSON.parse(responseData);
                        if (jsonResponse.error) {
                            console.error("Gemini API error:", jsonResponse.error.message);
                            callback(null);
                            return;
                    }
                        if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
                            console.error("No candidates returned from Gemini. The prompt might have been blocked.", jsonResponse);
                            callback(null);
                            return;
                }

                        let siteContent = jsonResponse.candidates[0].content.parts[0].text;
                        if (siteContent) {
                            siteContent = siteContent.replace(/```html/g, '').replace(/```/g, '');
                            callback(siteContent);
                        } else {
                            console.error("Gemini returned empty content.");
                            callback(null);
                        }
                    } catch (error) {
                        console.error("Error parsing Gemini response:", error);
                        callback(null);
                    }
            });
        });

            req.on('error', (error) => {
                console.error("Error making Gemini request:", error);
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
                    if (result && result.results) {
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


