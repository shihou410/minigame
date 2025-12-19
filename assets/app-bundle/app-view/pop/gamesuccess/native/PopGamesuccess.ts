import { _decorator, Button, Label, labelAssembler, Node, ParticleSystem2D, ProgressBar, SceneAsset, tween, UIOpacity, UITransform, v3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
import { app } from 'db://assets/app/app';
import { ButtonScale } from '../../../paper/all/game/native/expansion/ButtonScale';
const { ccclass, property } = _decorator;
@ccclass('PopGamesuccess')
export class PopGamesuccess extends BaseView.BindController(GameController) {


    private content: Node = null;

    private readonly max: number = 4;

    private btnsNode: Node = null;
    private titleNode: Node = null;
    private imgNode: Node = null;
    private coinNode: Node = null;
    private progressNode: Node = null;
    private nextNode: Node = null;
    private giftNode: Node = null;
    private rewardNode: Node = null;
    private effectNode: Node = null;

    private progress: ProgressBar = null;
    private curText: Label = null;
    private maxText: Label = null;
    private score: Label = null;
    // 初始化的相关逻辑写在这
    onLoad() {

        this.content = this.node.getChildByName('content');
        this.btnsNode = this.content.getChildByName('btns');
        this.titleNode = this.content.getChildByName('title');
        this.imgNode = this.content.getChildByName('img');
        this.coinNode = this.content.getChildByName('coin');
        this.progressNode = this.content.getChildByName('progress');
        this.nextNode = this.content.getChildByName('nextBtn');
        this.giftNode = this.content.getChildByName('gift');
        this.rewardNode = this.content.getChildByName('reward');
        this.effectNode = this.content.getChildByName('effect');

        this.progress = this.progressNode.getComponent(ProgressBar);
        this.curText = this.progressNode.getChildByPath('text/bText').getComponent(Label);
        this.maxText = this.progressNode.getChildByPath('text/eText').getComponent(Label);
        this.score = this.imgNode.getComponentInChildren(Label);
        this.nextNode.on(Button.EventType.CLICK, this.onClickNext, this);
        this.btnsNode.children.forEach(v => v.on(Button.EventType.CLICK, this.onClickBtns, this));
    }


    private currentLevel: number = 0;

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.currentLevel = params.level;
        this.giftNode.active = false;
        this.progressNode.getChildByName('img').active = true;
        this.progressNode.getComponent(UIOpacity).opacity = 255;
        this.effectNode.active = false;
        this.rewardNode.active = false;

        let currGifg = app.manager.game.getGift();
        let currCoin = app.manager.game.getCoin();
        let currScore = app.manager.game.getScore();

        this.progress.progress = currGifg / this.max;
        this.curText.string = `${currGifg}`;
        this.maxText.string = `${this.max}`;

        this.score.string = `${currScore}`;

        this.coinNode.getComponentInChildren(Label).string = `${currCoin}`;

        this.titleNode.children[0].setScale(0, 0, 1);
        this.imgNode.setScale(0, 0, 1);
        this.progressNode.setScale(0, 0, 1);
        this.nextNode.setScale(0, 0, 1);
        this.progressNode.getChildByPath('img/liang').active = false;
        tween(this.node)
            .call(() => {
                const e = this.titleNode.children[0];
                e.setPosition(0, -420);
                tween(e)
                    .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                    .delay(0.5)
                    .to(0.5, { y: 0 })
                    .start();
            }).delay(1.5)
            .call(() => {
                tween(this.imgNode)
                    .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            }).delay(0.5)
            .call(() => {
                currGifg += 1;

                tween(this.progressNode)
                    .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                    .call(() => {
                        this.curText.string = `${currGifg}`;
                        app.manager.game.setGift(currGifg);
                        this.progressNode.getChildByPath('img/liang').active = true;
                    })
                    .start();
            }).delay(0.5)
            .call(() => {
                const target = currScore + 5;
                app.manager.game.setScore(target);
                tween(this.imgNode)
                    .to(0.3, { scale: v3(1.5, 1.5, 1) })
                    .call(() => {
                        let obj = { value: currScore };
                        tween(obj).to(0.3, { value: target }, {
                            onUpdate: (target, ratio) => {
                                this.score.string = `${Math.floor(target.value)}`;
                            }
                        }).start();
                    }).delay(0.7)
                    .to(0.3, { scale: v3(1, 1, 1) })
                    .start();
            }).delay(1)
            .call(() => {
                tween(this.progress).to(0.3, { progress: currGifg / this.max }).start();
                if (currGifg >= this.max) {
                    let img = this.progressNode.getChildByName('img');
                    let pos = this.content.getComponent(UITransform).convertToNodeSpaceAR(img.worldPosition);
                    this.giftNode.position = pos;
                    this.giftNode.active = true;
                    img.active = false;
                    app.manager.game.setGift(0);
                    tween(this.progressNode.getComponent(UIOpacity))
                        .delay(0.4)
                        .to(0.3, { opacity: 0 }).start();
                    tween(this.giftNode).delay(0.4)
                        .to(0.5, { x: 0, y: this.giftNode.y + 20 })
                        .delay(0.1)
                        .call(() => {
                            this.effectNode.setPosition(this.giftNode.x, this.giftNode.y - 40);
                            this.effectNode.active = true;
                            this.effectNode.getComponent(ParticleSystem2D).resetSystem();

                            this.giftNode.active = false;
                            this.rewardNode.setScale(0, 0, 1);
                            this.rewardNode.setPosition(this.giftNode.x, this.giftNode.y);
                            this.rewardNode.active = true;
                            tween(this.rewardNode).to(0.3, { scale: v3(1, 1, 1) }).start();
                            tween(this.rewardNode)
                                .to(0.6, { y: this.rewardNode.y + 30 })
                                .to(0.6, { y: this.rewardNode.y - 50 }, { easing: 'sineIn' })
                                .start();
                            currCoin += 200;
                            app.manager.game.addCoin(200);
                            this.coinNode.getComponentInChildren(Label).string = currCoin.toString();

                            tween(this.nextNode).delay(0.6).to(0.6, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
                        }).start();
                } else {
                    tween(this.nextNode).to(0.6, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
                }
            })
            .start();

        this.effectNode.getComponent(ParticleSystem2D)

    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PopGamesuccess>({name: 'PopGamesuccess', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }


    private onClickBtns(n: Node) {
        const name = n.name;
        if (name.startsWith('set')) {
            app.manager.ui.show({ name: 'PopSettings' });
        }
    }

    private onClickNext() {

        this.currentLevel += 1;
        this.controller.nextLevel(this.currentLevel);
        this.hide();
    }


}