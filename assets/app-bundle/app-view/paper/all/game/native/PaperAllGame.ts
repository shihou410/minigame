import { _decorator, Button, Label, Node } from 'cc';
import BaseView from '../../../../../../../extensions/app/assets/base/BaseView';
import { GameController, PropType } from 'db://assets/app-builtin/app-controller/GameController';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;





@ccclass('PaperAllGame')
export class PaperAllGame extends BaseView.BindController(GameController) {
    private content: Node = null;
    private btns_node: Node = null;
    private proplist: Node = null;
    private title: Label = null;
    private timeL: Label = null;
    private totalTime: number = 0;

    private _pause: boolean = true;

    private _time: number = 0;
    private get time(): number { return this._time; }
    private set time(value: number) {
        this._time = value;
        this.timeL.string = this.formatTime(this.time, false);

        if (this.time <= 0) {
            this._pause = true;
        }
    }

    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.proplist = this.content.getChildByName('PropList');
        this.title = this.content.getChildByName('title').getComponentInChildren(Label);
        this.btns_node = this.content.getChildByName('btns');
        this.timeL = this.content.getChildByName('time').getComponent(Label);
        this.bindEvent();
    }
    bindEvent() {
        this.controller.on('GameEnd', this.onGameEnd, this);
        this.controller.on('NextLevel', this.onNextLevel, this);
        this.controller.on('GamePause', this.onGamePause, this);
        this.controller.on('GameRestore', this.onGamerestore, this);



        this.btns_node.children.forEach(node => node.on(Button.EventType.CLICK, this.onClickBtn, this));
        this.proplist.children.forEach(node => node.on(Button.EventType.CLICK, this.onClickProp, this));

    }

    offEvent() {
        this.controller.off('GameEnd', this.onGameEnd, this);
        this.controller.off('NextLevel', this.onNextLevel, this);
        this.controller.off('GamePause', this.onGamePause, this);
        this.controller.off('GameRestore', this.onGamerestore, this);
    }

    protected update(dt: number): void {
        if (this._pause) return;
        this.time -= dt;
    }

    private level_number: number = 0;
    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.level_number = params.level;
        this.totalTime = params.time || 300;
        this.time = this.totalTime;

        const propTypeMask = params.marsk;

        this.proplist.children.forEach((v, i) => {
            if (((2 << i) & propTypeMask) > 0) {
                v.active = true;
            } else {
                v.active = false;
            }
        });

        this.title.string = this.level_number.toString();
    }


    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        this.offEvent();
    }

    private onNextLevel(level: number) {
        this.level_number = level;
        this.title.string = `第${this.level_number}关`;
    }

    /** 点击道具 */
    private onClickProp(node: Node) {
        if (this._pause) return;
        const name = node.name;
        switch (name) {
            case 'GamePropTip':  //提示道具
                this.controller.useProp(PropType.TS);
                break;
            case 'GamePropElim':  //消除道具
                this.controller.useProp(PropType.XC);
                break;
            case 'GamePropRefresh':  //刷新道具
                this.controller.useProp(PropType.SX);
                break;
            case 'GamePropBack':  //撤回道具
                this.controller.useProp(PropType.CH);
                break;
        }
    }

    /** 点击按钮    */
    private onClickBtn(node: Node) {
        const name = node.name;
        if (name.startsWith('back')) {
            app.manager.ui.show({ name: 'PageHome' });
        } else if (name.startsWith('set')) {
            // app.manager.ui.show({ name: 'PageGamesx' });
        } else if (name.startsWith('refresh')) {
            this.gameReTry();
        }
    }

    /** 游戏刷新 */
    private gameReTry() {
        this.time = this.totalTime;

        app.controller.game.refreshLevel(this.level_number);
    }

    /** 游戏结束 */
    private onGameEnd(suc: boolean) {
        if (suc) app.manager.ui.show({ name: 'PopGamesuccess', data: { level: this.level_number } });
        else app.manager.ui.show({ name: 'PopGamefail', data: { level: this.level_number } });
    }

    /** 游戏暂停 */
    private onGamePause() { this._pause = true; }
    private onGamerestore() { this._pause = false; }

    /**
    * 将秒数格式化为 HH:MM:SS 或 MM:SS 的时间字符串
    * @param seconds 总秒数
    * @param showHours 是否始终显示小时部分（默认false，超过1小时自动显示）
    * @returns 格式化后的时间字符串
    */
    formatTime(seconds: number, showHours: boolean = false): string {
        const sec = Math.max(0, Math.floor(seconds));
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        const remainingSeconds = sec % 60;

        // 替代 padStart 的实现
        const pad = (num: number): string => {
            return num < 10 ? `0${num}` : `${num}`;
        };
        if (showHours || hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
        } else {
            return `${pad(minutes)}:${pad(remainingSeconds)}`;
        }
    }

}