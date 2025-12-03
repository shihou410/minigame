import { _decorator, Label, Node, NodeEventType } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;
@ccclass('PageHome')
export class PageHome extends BaseView {
    // 子界面列表，数组顺序为子界面排列顺序
    protected miniViews: IMiniViewNames = [];

    private content: Node = null;

    private xxlBtn: Node = null;
    private lllBtn: Node = null;

    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.xxlBtn = this.content.getChildByName('xxlBtn');
        this.lllBtn = this.content.getChildByName('lllBtn');

        const label_level = this.xxlBtn.getComponentInChildren(Label);

        this.xxlBtn.on(NodeEventType.TOUCH_START, this.onClickXXl, this);
        this.lllBtn.on(NodeEventType.TOUCH_START, this.onClickLLl, this);

        label_level.string = `LEVEL 1`;
    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.showMiniViews({ views: this.miniViews });
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PageHome>({name: 'PageHome', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private onClickXXl() {
        app.manager.ui.showAsync({ name: "PageGamesx", data: { level: 1 } });
    }

    private onClickLLl() {
        app.manager.ui.showAsync({ name: "PageGamellk", data: { level: 1 } });
    }
}