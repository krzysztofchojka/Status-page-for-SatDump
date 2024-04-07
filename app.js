const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');

const app = express();

// Function to load configuration from file
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath);
    return JSON.parse(configData);
  } else {
    return null;
  }
}

// Function to save configuration to file
function saveConfig(config) {
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Load configuration
let config = loadConfig();

if (!config) {
  config = {};
}

// Prompt for API settings if not already in config
if (!config.hostname || !config.port) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Enter the hostname (default: localhost): ', (hostname) => {
    config.hostname = hostname || 'localhost';

    readline.question('Enter the port on which SatDump\'s page is running (default: 8081): ', (port) => {
      config.port = port || 8081;
      readline.question('Enter the port on which you want to start the application (default: 3000): ', (appPort) => {
        config.appPort = appPort || 3000;
        readline.close();
        saveConfig(config);
        startServer(config);
      });
    });
  });
} else {
  startServer(config);
}

// Start server
function startServer(config) {
  app.use('/proxy', (req, res) => {
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: req.url,
      method: req.method
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, {
        end: true
      });
    });

    proxyReq.on('error', (error) => {
      console.error(error);
      res.sendStatus(500);
    });

    req.pipe(proxyReq, {
      end: true
    });
  });

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Start the server
  const server = http.createServer(app);

  server.listen(config.appPort, () => {
    console.log(`Server running at http://localhost:${config.appPort}/`);
  });
}