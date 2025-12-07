const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Import the ES module server
import('./server.js')
    .then(server => {
        console.log('Server started successfully');
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });