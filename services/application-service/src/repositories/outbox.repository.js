const { query } = require('../config/database');

class OutboxRepository {
  /**
   * Save an outbox event for reliable asynchronous event publishing
   */
  static async publishEvent(aggregateType, aggregateId, eventType, payload = {}, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      INSERT INTO outbox_events (
        aggregate_type, aggregate_id, event_type, payload, created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    try {
      const res = await executor(sql, [
        String(aggregateType || 'APPLICATION'),
        aggregateId,
        String(eventType),
        JSON.stringify(payload),
      ]);
      return res.rows[0];
    } catch (err) {
      console.warn(`Outbox event record warning: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch unpublished outbox events
   */
  static async getUnpublishedEvents(limit = 20) {
    const sql = `
      SELECT * FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1;
    `;
    const res = await query(sql, [limit]);
    return res.rows;
  }

  /**
   * Mark an event as published
   */
  static async markPublished(eventId, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      UPDATE outbox_events
      SET published_at = NOW()
      WHERE id = $1;
    `;
    await executor(sql, [eventId]);
  }
}

module.exports = OutboxRepository;

