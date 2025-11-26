import { EventTarget, _decorator } from 'cc';
import BaseManager from '../../base/BaseManager';
const { ccclass } = _decorator;

class Event {
    static destroy(event: Event) {
        if (!event) return;
        event._event = null;
    }

    // 事件管理器
    private _event: EventTarget = new EventTarget();

    /**
     * 事件分发
     */
    public emit(event: string | number, ...data: any[]) {
        if (!this._event) {
            throw Error('当前event已销毁，无法继续调用');
        }
        this._event.emit(event as any, ...data);
    }

    /**
     * 事件监听
     */
    public on(event: string | number, cb: (...any: any[]) => void, target?: any) {
        if (!this._event) {
            throw Error('当前event已销毁，无法继续调用');
        }
        this._event.on(event as any, cb, target);
    }

    /**
     * 事件监听
     */
    public once(event: string | number, cb: (...any: any[]) => void, target?: any) {
        if (!this._event) {
            throw Error('当前event已销毁，无法继续调用');
        }
        this._event.once(event as any, cb, target);
    }

    /**
     * 事件移除监听
     */
    public off(event: string | number, cb?: (...any: any[]) => void, target?: any) {
        if (!this._event) {
            throw Error('当前event已销毁，无法继续调用');
        }
        this._event.off(event as any, cb, target);
    }

    /**
     * 事件移除监听
     */
    public targetOff(target: any) {
        if (!this._event) {
            throw Error('当前event已销毁，无法继续调用');
        }
        this._event.targetOff(target);
    }
}

@ccclass('EventManager')
export default class EventManager extends BaseManager {
    private events: Map<string | number | Symbol, Event> = new Map();

    clear() {
        this.events.forEach(event => Event.destroy(event));
        return this.events.clear();
    }

    delete(key: string | number | Symbol) {
        Event.destroy(this.events.get(key));
        return this.events.delete(key);
    }

    get(key: string | number | Symbol): Event {
        if (this.events.has(key)) {
            return this.events.get(key);
        }

        const event = new Event();
        this.events.set(key, event);

        return event;
    }
}
