const { createClient } = require('redis');
const socketServer = require('../socket/SocketServer');
const UserRepository = require('../repositories/UserRepository');

class NotificationSubscriber {
  constructor() {
    this._client = null;
  }

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

  _handleMessage(rawMessage) {
    let event;
    try {
      event = JSON.parse(rawMessage);
    } catch (err) {
      console.error('[NotificationSubscriber] Malformed event payload:', err.message);
      return;
    }

    if (event.type === 'USER' && event.action === 'DELETED') {
      this._handleUserDeleted(event);
      return;
    }

    const recipientId = event.recipientId;
    if (!recipientId) {
      return;
    }

    socketServer.emitToUser(String(recipientId), 'notification:new', event);
  }

  async _handleUserDeleted(event) {
    const userId = event.payload?.userId ?? event.entityId;
    if (!userId) return;
    try {
      await UserRepository.releaseEmail(String(userId));
      socketServer.disconnectUser(String(userId));
    } catch (err) {
      console.error('[NotificationSubscriber] USER_DELETED sync failed:', err.message);
    }
  }

  async stop() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
    }
  }
}

module.exports = new NotificationSubscriber();
