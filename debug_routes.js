import app from './src/server.js';

function printRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.log(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            let nextPrefix = prefix;
            // Attempt to find the path prefix for this router
            // This is tricky as Express regexps are complex, but often simple strings are preserved
            // We'll just continue traversing

            // For express 4, finding the mount path is hard from just the stack if it was mounted with app.use('/path', router)
            // But we can just dump everything
            console.log(`[Router]`);
            printRoutes(layer.handle.stack, prefix);
        }
    });
}

// Since inspecting the stack structure of a mounted app is complex, 
// let's just use a library approach or simple iteration.
// A better way is using a library like 'express-list-endpoints' but we don't want to install it.
// We'll write a simple inspector.

const getRoutes = (layer, prefix = '') => {
    if (layer.route) {
        return Object.keys(layer.route.methods).map(method => ({
            method: method.toUpperCase(),
            path: prefix + layer.route.path
        }));
    }
    if (layer.name === 'router' && layer.handle.stack) {
        const routes = [];
        layer.handle.stack.forEach(stackItem => {
            // Check if it's a route or sub-router
            // Note: Express doesn't easily expose the mount path here of the sub-router 
            // commonly stored in `regexp` but not as a string.
            // But if we know how we mounted it...
            routes.push(...getRoutes(stackItem, prefix));
        });
        return routes;
    }
    return [];
}

// Just printing the top level stack to see if 'admin-days' is mentioned in any regexp or path
console.log("Checking Top Level Stack for admin-days...");
app._router.stack.forEach(layer => {
    if (layer.route) {
        console.log("ROUTE:", layer.route.path);
    } else if (layer.name === 'router') {
        // console.log("ROUTER (regexp):", layer.regexp);
        // We can check if the regexp contains 'admin-days'
        if (layer.regexp.toString().includes('admin-days')) {
            console.log("FOUND Router for admin-days:", layer.regexp);
        }
    }
});

console.log("\nAttempting to find /api/admin-days/stats match...");
// We can also just 'mock' a request
import http from 'http';
const req = new http.IncomingMessage(null);
req.method = 'GET';
req.url = '/api/admin-days/stats';
req.headers = { host: 'localhost' };

// We can't easily trigger the router without listening, but we can inspect.
console.log("Done inspecting.");
