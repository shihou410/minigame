import { _decorator, Component, Node, EventTouch, Tween, tween, v3, Button, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ButtonScale')
export class ButtonScale extends Component {

    @property
    pressedScale: number = 0.85;   // 按下时缩放比例

    @property
    duration: number = 0.1;        // 单段动画时间

    private _isClick: boolean = true;
    public get isClick() { return this._isClick; }
    public set isClick(value: boolean) {
        this._isClick = value;
        let uit = this.getComponent(UIOpacity);
        if (!uit) uit = this.addComponent(UIOpacity);

        const t = value ? 255 : 120;
        tween(uit).to(0.3, { opacity: t }).start();

    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onCancel, this);
    }

    onPress(event: EventTouch) {
        if (!this._isClick) return;
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(this.duration, { scale: v3(this.pressedScale, this.pressedScale, 1) })
            .start();
    }

    onCancel(event: EventTouch) {
        if (!this._isClick) return;
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(this.duration, { scale: v3(1.1, 1.1, 1) })
            .to(this.duration * 2, { scale: v3(1, 1, 1) }, { easing: "backOut" })
            .start();
    }

    onEnd(event: EventTouch) {
        if (!this._isClick) return;

        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(this.duration, { scale: v3(1.1, 1.1, 1) })
            .to(this.duration * 2, { scale: v3(1, 1, 1) }, { easing: "backOut" })
            .call(() => { this.node.emit(Button.EventType.CLICK, this.node); })
            .start();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.off(Node.EventType.TOUCH_END, this.onCancel, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onEnd, this);
    }
}
