import { EventEmitter } from 'events';

// Aumentar el límite predeterminado si hay muchos usuarios concurrentes conectados a SSE
class NotificationEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(200);
    }

    emitUserEvent(userId, payload) {
        if (!userId) {
            console.log('[SSE-EMITTER] emitUserEvent falló: userId es nulo/indefinido', payload);
            return;
        }
        const eventName = `user_${userId.toString().toLowerCase()}`;
        console.log(`[SSE-EMITTER] 📢 Emitiendo evento en canal: ${eventName}`);
        console.log(`[SSE-EMITTER] 📦 Payload:`, payload);
        const listenersCount = this.listenerCount(eventName);
        console.log(`[SSE-EMITTER] 👥 Suscriptores activos en este canal: ${listenersCount}`);
        this.emit(eventName, payload);
    }

    subscribeUser(userId, listener) {
        if (!userId) return;
        const eventName = `user_${userId.toString().toLowerCase()}`;
        console.log(`[SSE-EMITTER] 🔌 Un usuario se ha SUSCRITO al canal: ${eventName}`);
        this.on(eventName, listener);
    }

    unsubscribeUser(userId, listener) {
        if (!userId) return;
        const eventName = `user_${userId.toString().toLowerCase()}`;
        console.log(`[SSE-EMITTER] ❌ Un usuario se ha DESUSCRITO del canal: ${eventName}`);
        this.off(eventName, listener);
    }
}

const notificationEmitter = new NotificationEmitter();

export default notificationEmitter;
