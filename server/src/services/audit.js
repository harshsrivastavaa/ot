const AuditLog = require('../models/AuditLog');
async function recordAudit({
  actor,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
}) {
  return AuditLog.create({ actor, action, entityType, entityId, before, after });
}
module.exports = { recordAudit };
