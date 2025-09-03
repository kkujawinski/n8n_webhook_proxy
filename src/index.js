/**
 * Cloudflare Worker - n8n Webhook Proxy
 * Proxies requests to TARGET_DOMAIN with configurable modifications
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Get target domain from environment
      const targetDomain = env.TARGET_DOMAIN;
      if (!targetDomain) {
        return new Response('TARGET_DOMAIN environment variable is required', { 
          status: 500 
        });
      }

      // Parse the original request URL
      const url = new URL(request.url);
      
      // Create the target URL preserving protocol, path, and query
      const targetUrl = new URL(url.pathname + url.search, targetDomain);
      
      // Log incoming request details
      console.log('Incoming Request:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        timestamp: new Date().toISOString()
      });

      // Clone the request to modify headers
      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      });

      // Remove headers if REMOVE_HEADERS is specified
      const removeHeaders = env.REMOVE_HEADERS;
      if (removeHeaders) {
        const headersToRemove = removeHeaders.split(',').map(h => h.trim().toLowerCase());
        
        // Create new headers object without the specified headers
        const newHeaders = new Headers();
        for (const [key, value] of modifiedRequest.headers.entries()) {
          console.log('Header:', key, value);
          if (!headersToRemove.includes(key.toLowerCase())) {
            console.log('Setting header:', key, value);
            newHeaders.set(key, value);
          }
        }

        // Log removed headers
        const removedHeaders = headersToRemove.filter(header => 
          request.headers.has(header)
        );
        if (removedHeaders.length > 0) {
          console.log('Removed headers:', removedHeaders);
        }

        // Create final request with modified headers
        const finalRequest = new Request(targetUrl.toString(), {
          method: request.method,
          headers: newHeaders,
          body: request.body,
          redirect: 'manual'
        });

        console.log('Modified Request:', {
          url: finalRequest.url,
          method: finalRequest.method,
          headers: Object.fromEntries(finalRequest.headers.entries()),
          timestamp: new Date().toISOString(),
          path: finalRequest.pathname
        });

        // Make the proxied request
        const response = await fetch(finalRequest);
        
        // Log response details
        console.log('Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });

        // Return the response
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        // No headers to remove, make direct proxied request
        const response = await fetch(modifiedRequest);
        
        // Log response details
        console.log('Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });

        // Return the response
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }

    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Internal Server Error', { 
        status: 500 
      });
    }
  },
};
