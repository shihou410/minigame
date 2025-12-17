import { _decorator, Button, Label, Node, NodeEventType } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;

/** 游戏类型 */
enum GameType {
    /** 消消了 */
    LLL = 0,
    /** 连连了 */
    XXL = 1,
}




@ccclass('PageHome')
export class PageHome extends BaseView {
    // 子界面列表，数组顺序为子界面排列顺序
    protected miniViews: IMiniViewNames = [];

    private content: Node = null;
    private coinAdd: Node = null;
    private xxlBtn: Node = null;
    private lllBtn: Node = null;
    private setBtn: Node = null;
    private label_score: Label = null;
    private label_coin: Label = null;
    private label_lll: Label = null;
    private label_xxl: Label = null;
    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.xxlBtn = this.content.getChildByPath('gameBtn/xxlBtn');
        this.lllBtn = this.content.getChildByPath('gameBtn/lllBtn');
        this.coinAdd = this.content.getChildByPath('coin/btn');
        this.setBtn = this.content.getChildByPath('btns/set');

        this.label_score = this.content.getChildByPath('score/label').getComponent(Label);
        this.label_coin = this.content.getChildByPath('coin/label').getComponent(Label);
        this.label_lll = this.lllBtn.getComponentInChildren(Label);
        this.label_xxl = this.xxlBtn.getComponentInChildren(Label);


        this.xxlBtn.on(Button.EventType.CLICK, this.onClickXXl, this);
        this.lllBtn.on(Button.EventType.CLICK, this.onClickLLl, this);
        this.coinAdd.on(Button.EventType.CLICK, this.onClickCoinAdd, this);
        this.setBtn.on(Button.EventType.CLICK, this.onClickSetBtn, this);


    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.showMiniViews({ views: this.miniViews });

        this.label_coin.string = '999';
        this.label_score.string = '999';

        this.label_xxl.string = "1";
        this.label_lll.string = "1";
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PageHome>({name: 'PageHome', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private onClickXXl() {
        app.manager.ui.showAsync({ name: "PageGamesx", data: { level: 10 } });
    }

    private onClickLLl() {
        app.manager.ui.showAsync({ name: "PageGamellk", data: { level: 1 } });
    }

    private onClickCoinAdd() {
        app.manager.ui.show({ name: 'PopShop' });
    }

    private onClickSetBtn() {
        app.manager.ui.show({ name: 'PopSettings' });
    }

}