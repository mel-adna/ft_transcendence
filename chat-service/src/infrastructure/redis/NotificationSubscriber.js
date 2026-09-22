const { createClient } = require('redis');
const socketServer = require('../socket/SocketServer');

/**
 * NotificationSubscriber
 *
 * Subscribes to the Java backend's cross-service event channel
 * (RedisEventPublisherService / app.redis.channel, default
 * "teampulse-realtime-events") and relays each event to the recipient's
 * live socket as `notification:new`. Every logged-in user already holds a
 * socket to this service, so it doubles as the delivery pipe for events
 * the Java side has no WebSocket of its own to push — same idea as
 * notifyController's data:changed relay, but for the WORKSPACE/TASK/SYSTEM
 * notification stream instead of "refetch this resource".
 *
 * This is read-only relay: no state is kept here. The Java backend remains
 * the source of truth (NotificationController's REST endpoints) for anyone
 * who wasn't online when the event fired.
 */
class NotificationSubscriber {
  constructor() {
    /** @type {import('redis').RedisClientType | null} */
    this._client = null;
  }

  /**
   * @returns {Promise<void>} no-op when REDIS_URL isn't configured, same
   *   single-instance fallback as the Socket.io Redis adapter.
   */
  async start() {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.log('[NotificationSubscriber] REDIS_URL not set — notifications disabled');
      return;
    }

    const channel = process.env.REDIS_CHANNEL || 'teampulse-realtime-events';

    this._client = createClient({ url });
    this._client.on('error', (err) => {
      console.error('[NotificationSubscriber] Redis error:', err.message);
    });

    await this._client.connect();
    await this._client.subscribe(channel, (message) => this._handleMessage(message));

    console.log(`[NotificationSubscriber] Subscribed to "${channel}"`);
  }

  /**
   * @param {string} rawMessage - JSON-encoded UnifiedEvent from RedisEventPublisherService
   */
  _handleMessage(rawMessage) {
    let event;
    try {
      event = JSON.parse(rawMessage);
    } catch (err) {
      console.error('[NotificationSubscriber] Malformed event payload:', err.message);
      return;
    }

    const recipientId = event.recipientId;
    if (!recipientId) {
      // SYSTEM/broadcast-style events with no single recipient aren't routed
      // here yet — nothing in the current schema needs it.
      return;
    }

    socketServer.emitToUser(String(recipientId), 'notification:new', event);
  }

  async stop() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
    }
  }
}

module.exports = new NotificationSubscriber();
