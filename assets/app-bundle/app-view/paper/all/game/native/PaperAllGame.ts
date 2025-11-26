import { _decorator, Button, Node } from 'cc';
import BaseView from '../../../../../../../extensions/app/assets/base/BaseView';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
const { ccclass, property } = _decorator;
@ccclass('PaperAllGame')
export class PaperAllGame extends BaseView.BindController(GameController) {
    private content: Node = null;

    private proplist: Node = null;


    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.proplist = this.content.getChildByName('PropList');
        this.proplist.children.forEach(node => { node.on(Button.EventType.CLICK, this.onClickProp, this); });
    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        console.log("页面数据：", params);
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {

    }

    private onClickProp(node: Node) {
        console.log('点击：', node);
        const name = node.name;
        switch (name) {
            case 'GamePopTip':  //提示道具
                this.controller.useProp(0);
                break;
            case 'GamePropElim':  //消除道具
                this.controller.useProp(1);
                break;
            case 'GamePropRefresh':  //刷新道具
                this.controller.useProp(2);
                break;
            case 'GamePropPlier':  //钳子道具
                this.controller.useProp(3);
                break;
        }
    }

}