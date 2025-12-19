import { _decorator, Button, Label, Node } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;
@ccclass('PopShop')
export class PopShop extends BaseView {

    private content: Node = null;
    private coin: Label = null;
    private adBtn: Node = null;
    private backBtn: Node = null;
    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.coin = this.content.getChildByPath('title/coin/label').getComponent(Label);
        this.adBtn = this.content.getChildByPath('ShopItem/shopAd');
        this.backBtn = this.content.getChildByPath('title/btnBack');

        this.adBtn.on(Button.EventType.CLICK, this.onClickAdBtn, this);
        this.backBtn.on(Button.EventType.CLICK, this.onClickBackBtn, this);

    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.coin.string = `${app.manager.game.getCoin()}`;
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PopShop>({name: 'PopShop', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private onClickAdBtn() {

    }

    private onClickBackBtn() {
        this.hide();
    }

}