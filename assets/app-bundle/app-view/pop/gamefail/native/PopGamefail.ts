import { _decorator, Button, Node } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
const { ccclass, property } = _decorator;
@ccclass('PopGamefail')
export class PopGamefail extends BaseView.BindController(GameController) {

    private content: Node = null;


    private backBtn: Node = null;
    private retryBtn: Node = null;
    // 初始化的相关逻辑写在这
    onLoad() {
        this.content = this.node.getChildByName('content');

        this.backBtn = this.content.getChildByName('backBtn');
        this.retryBtn = this.content.getChildByName('retryBtn');

        this.backBtn.on(Button.EventType.CLICK, this.onClickBack, this);
        this.retryBtn.on(Button.EventType.CLICK, this.onClickRetry, this);

    }

    private currentLeveL: number = 0;
    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.currentLeveL = params.level;
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PopGamefail>({name: 'PopGamefail', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }


    private onClickBack() {

        this.hide();
    }

    private onClickRetry() {
        this.controller.nextLevel(this.currentLeveL);
        this.hide();
    }
}