import { _decorator, Button, Label, Node, ProgressBar } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
const { ccclass, property } = _decorator;
@ccclass('PopGamesuccess')
export class PopGamesuccess extends BaseView.BindController(GameController) {


    private content: Node = null;
    private label_title: Label = null;

    private progress: ProgressBar = null;
    private nextBtn: Node = null;
    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.label_title = this.content.getChildByPath('title/label_title').getComponent(Label);
        this.nextBtn = this.content.getChildByName('nextBtn');
        this.progress = this.content.getChildByName('progress').getComponent(ProgressBar);
        this.nextBtn.on(Button.EventType.CLICK, this.onClickNext, this);
    }


    private currentLevel: number = 0;

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.currentLevel = params.level;
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PopGamesuccess>({name: 'PopGamesuccess', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }


    private onClickNext() {

        this.currentLevel += 1;
        this.controller.nextLevel(this.currentLevel);
        this.hide();
    }


}