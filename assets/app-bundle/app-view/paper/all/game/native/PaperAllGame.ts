import { _decorator, Button, Label, Node } from 'cc';
import BaseView from '../../../../../../../extensions/app/assets/base/BaseView';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;
@ccclass('PaperAllGame')
export class PaperAllGame extends BaseView.BindController(GameController) {
    private content: Node = null;
    private btns_node: Node = null;
    private proplist: Node = null;
    private title: Label = null;

    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.proplist = this.content.getChildByName('PropList');
        this.title = this.content.getChildByName('title').getComponent(Label);
        this.btns_node = this.content.getChildByName('btns');

        this.controller.on('GameEnd', this.onGameEnd, this);
        this.controller.on('NextLevel', this.onNextLevel, this);

        this.btns_node.children.forEach(node => node.on(Button.EventType.CLICK, this.onClickBtn, this));

        this.proplist.children.forEach(node => node.on(Button.EventType.CLICK, this.onClickProp, this));
    }

    private level_number: number = 0;
    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.level_number = params;
        this.title.string = `第${this.level_number}关`;

    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {

    }

    private onNextLevel(level: number) {
        this.level_number = level;
        this.title.string = `第${this.level_number}关`;
    }

    /** 点击道具 */
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

    /** 点击按钮    */
    private onClickBtn(node: Node) {
        const name = node.name;
        if (name.startsWith('back')) {
            this.level_number++;
            this.controller.nextLevel(this.level_number);
        } else if (name.startsWith('set')) {
            app.manager.ui.show({ name: 'PageGamesx' });
        }
    }

    /** 游戏结束 */
    private onGameEnd(suc: boolean) {
        if (suc) app.manager.ui.show({ name: 'PopGamesuccess', data: { level: this.level_number } });
        else app.manager.ui.show({ name: 'PopGamefail', data: { level: this.level_number } });
    }
}