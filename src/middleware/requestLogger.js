const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody = null;
  
  // Override res.json to capture response data
  res.json = function(data) {
    responseBody = data;
    return originalJson.call(this, data);
  };
  
  // Override res.send to capture response data
  res.send = function(data) {
    if (!responseBody && data) {
      try {
        responseBody = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseBody = data;
      }
    }
    return originalSend.call(this, data);
  };
  
  // Log detailed request information
  logger.info('🔵 INCOMING REQUEST', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    headers: req.headers,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
    timestamp: new Date().toISOString()
  });

  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const statusEmoji = res.statusCode >= 400 ? '🔴' : '🟢';
    
    logger[logLevel](`${statusEmoji} REQUEST COMPLETED`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseBody: responseBody && JSON.stringify(responseBody).length < 1000 ? responseBody : 'Response too large to log',
      timestamp: new Date().toISOString()
    });
  });

  next();
};

module.exports = requestLogger;