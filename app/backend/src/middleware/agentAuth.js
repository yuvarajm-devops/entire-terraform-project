const db = require('../db');

/**
 * Authenticates monitoring agent requests using X-Agent-Key header or Bearer token.
 * Attaches req.server and req.tenantId.
 */
async function authenticateAgent(req, res, next) {
  const agentKey = req.headers['x-agent-key'] || 
                   (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ') 
                    ? req.headers['authorization'].split(' ')[1] 
                    : null);

  if (!agentKey) {
    return res.status(401).json({
      success: false,
      error: 'Agent key required in X-Agent-Key header'
    });
  }

  try {
    if (db.isPostgres()) {
      const result = await db.query('SELECT * FROM servers WHERE agent_key = $1 LIMIT 1', [agentKey]);
      if (result && result.rows.length > 0) {
        req.server = result.rows[0];
        req.tenantId = req.server.tenant_id;
        return next();
      }
    } else {
      const server = db.memory.servers.find(s => s.agent_key === agentKey);
      if (server) {
        req.server = server;
        req.tenantId = server.tenant_id;
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Invalid agent credentials'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Agent authentication failed: ' + err.message
    });
  }
}

module.exports = {
  authenticateAgent
};
