#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting ManaHR Backend...');
console.log('Working directory:', process.cwd());
console.log('Node.js version:', process.version);

// Check for dist/server.js in current directory
let serverPath = path.join(__dirname, 'dist', 'server.js');

if (!fs.existsSync(serverPath)) {
    // If not found, try one directory up (handle Render deployment structure)
    serverPath = path.join(__dirname, '..', 'dist', 'server.js');

    if (!fs.existsSync(serverPath)) {
        // If still not found, check if we're in src directory and go to parent
        const parentPath = path.join(__dirname, '..', 'dist', 'server.js');
        if (fs.existsSync(parentPath)) {
            serverPath = parentPath;
        } else {
            console.error('Error: Cannot find dist/server.js');
            console.error('Current directory:', __dirname);
            console.error('Looking for server at:', serverPath);
            process.exit(1);
        }
    }
}

console.log('Server path resolved to:', serverPath);

// Import and start the server
const serverUrl = `file://${serverPath}`;
import(serverUrl)
    .then(() => {
        console.log('Server import successful');
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });