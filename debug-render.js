#!/usr/bin/env node

console.log('=== Render Deployment Debug Info ===');
console.log('Node.js version:', process.version);
console.log('Current working directory:', process.cwd());
console.log('Process args:', process.argv);
console.log('Environment NODE_ENV:', process.env.NODE_ENV);

console.log('\n=== File system check ===');
const fs = require('fs');
const path = require('path');

// Check if dist directory exists
const distPath = path.join(process.cwd(), 'dist');
console.log('Dist directory exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
    console.log('Dist directory contents:', fs.readdirSync(distPath));
}

// Check if server.js exists
const serverPath = path.join(process.cwd(), 'dist', 'server.js');
console.log('Server.js exists:', fs.existsSync(serverPath));
console.log('Server.js path:', serverPath);

// Try to resolve the module
try {
    const resolvedPath = require.resolve('./dist/server.js');
    console.log('Module resolved to:', resolvedPath);
} catch (error) {
    console.error('Module resolution failed:', error.message);
}

console.log('\n=== Attempting to start server ===');
try {
    require('./dist/server.js');
} catch (error) {
    console.error('Failed to start server:', error);
}