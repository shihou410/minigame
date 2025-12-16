import { _decorator, Button, Node, tween, v3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
const { ccclass, property } = _decorator;
@ccclass('PopSettings')
export class PopSettings extends BaseView {

    private content: Node = null;
    private sound_switch: Node = null;
    private mussic_switch: Node = null;
    private btnClose: Node = null;

    private _music: boolean = true;
    private get music(): boolean { return this._music; }
    private set music(value: boolean) {
        this._music = value;
        let t = this._music ? 30 : -30;
        const point = this.mussic_switch.getChildByName('point');
        point.children[1].active = this._music;
        point.children[0].active = !this._music;
        tween(point).to(0.3, { position: v3(t, -1) }).start();
    }

    private _sound: boolean = true;
    private get sound(): boolean { return this._sound; }
    private set sound(value: boolean) {
        this._sound = value;
        let t = this._sound ? 30 : -30;
        const point = this.sound_switch.getChildByName('point');
        point.children[1].active = this._sound;
        point.children[0].active = !this._sound;
        tween(point).to(0.3, { position: v3(t, -1) }).start();
    }

    // 初始化的相关逻辑写在这
    onLoad() {
        this.content = this.node.getChildByName('content');
        this.sound_switch = this.content.getChildByPath('sound/switch');
        this.mussic_switch = this.content.getChildByPath('music/switch');
        this.btnClose = this.content.getChildByName('btnClose');


        this.sound_switch.on(Button.EventType.CLICK, this.onClickSoundSwitch, this);
        this.mussic_switch.on(Button.EventType.CLICK, this.onClickMussicSwitch, this);
        this.btnClose.on(Button.EventType.CLICK, this.onClickClose, this);
    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {

        this.music = true;
        this.sound = true;

    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PopSettings>({name: 'PopSettings', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private onClickSoundSwitch() { this.sound = !this.sound; }


    private onClickMussicSwitch() { this.music = !this.music; }

    private onClickClose() {
        this.hide();
    }
}