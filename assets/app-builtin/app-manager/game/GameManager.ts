import { _decorator, instantiate, NodePool, Prefab, Sprite, SpriteAtlas, Node, SpriteFrame, Tween, Color } from 'cc';
import BaseManager from '../../../../extensions/app/assets/base/BaseManager';
import { app } from 'db://assets/app/app';
import { GameType } from 'db://assets/app-bundle/app-view/page/home/native/PageHome';
import { PropType } from '../../app-controller/GameController';
const { ccclass, property } = _decorator;
@ccclass('GameManager')
export class GameManager extends BaseManager {
    private readonly key: string = "";

    private storage: {
        levels: number[],
        score: number,
        coin: number,
        gift: number,
        props: number[]
    } = null;

    private atlas_items: SpriteAtlas = null;
    public prefab_item: Prefab = null;

    private item_pool: NodePool = null;



    // [无序] 加载完成时触发
    protected onLoad() {
        let data = app.lib.storage.get(this.key);
        if (!data) {
            data = {
                levels: [1, 1],
                score: 0,
                coin: 0,
                props: [0, 0, 0, 0],
                gift: 0,
            }
        }
        this.storage = data;
    }

    // [无序] 自身初始化完成, init执行完毕后被调用
    protected onInited() {
        this.item_pool = new NodePool();
        this.creatorItems(120);
    }

    // [无序] 所有manager初始化完成
    protected onFinished() { }

    // [无序] 初始化manager，在初始化完成后，调用finish方法
    protected init(finish: Function) {

        const task = app.lib.task.createSync();
        task.add((next, retry) => {
            app.manager.loader.load({
                path: 'res/sprites/items/gameitems',
                bundle: 'app-manager',
                type: SpriteAtlas,
                onComplete: (item) => {
                    this.atlas_items = item;
                    next();
                }
            });
        });
        task.add((next, retry) => {
            app.manager.loader.load({
                path: 'res/prefab/GameItem',
                bundle: 'app-manager',
                type: Prefab,
                onComplete: (item) => {
                    this.prefab_item = item;
                    next();
                }
            });
        });
        task.start((suc) => {
            console.log("game manager加载完成：", this.atlas_items, this.prefab_item);
            super.init(finish);
        });
    }

    private creatorItems(count: number) {
        for (let i = 0; i < count; i++) {
            const item = instantiate(this.prefab_item);
            this.item_pool.put(item);
            item.getChildByName('spr').getComponent(Sprite).spriteFrame = null;
            item.getChildByName('selected').active = false;
        }
    }

    public getItem(): Node {
        let item = this.item_pool.get();
        if (!item) {
            this.creatorItems(20);
            item = this.item_pool.get();
        }
        return item;
    }

    public putItem(item: Node): void {
        this.item_pool.put(item);
        Tween.stopAllByTarget(item);
        item.getChildByName('spr').getComponent(Sprite).spriteFrame = null;
        item.getChildByName('spr').getComponent(Sprite).color = Color.WHITE;
        item.getChildByName('normal').getComponent(Sprite).color = Color.WHITE;
        item.getChildByName('selected').active = false;
        item.targetOff(item);
        item.setScale(1, 1, 1);
        item.setPosition(0, 0, 0);
    }

    public getSpriteFrameByName(name: string): SpriteFrame {
        return this.atlas_items.getSpriteFrame(name);
    }

    public getSpriteFrameByIndex(index: number): SpriteFrame {
        return this.atlas_items.getSpriteFrames()[index];
    }

    public getAtlasLength(): number { return this.atlas_items.getSpriteFrames().length; }

    private saveStorage() {
        app.lib.storage.set(this.key, this.storage);
    }


    /** 获取金币数量 */
    public getCoin() { return this.storage.coin; }
    /** 使用金币 */
    public useCoin(amount: number): boolean {
        if (this.storage.coin < amount) return false;
        this.storage.coin -= amount;
        this.saveStorage();
        return true;
    }
    /** 获得金币 */
    public addCoin(amount: number) {
        this.storage.coin += amount;
        this.saveStorage();
    }

    public getLevel(type: GameType): number {
        return this.storage.levels[type];
    }
    public nextLevel(type: GameType) {
        let level = this.storage.levels[type];
        if (level < 1000) ++level;
        this.storage.levels[type] = level;
        this.saveStorage();
        return level;
    }

    public getScore() { return this.storage.score; }
    public setScore(value: number) { this.storage.score = value; this.saveStorage(); }

    public getGift(): number { return this.storage.gift; }
    public setGift(value: number) {
        this.storage.gift = value;
        this.saveStorage();
    }

    public getPropCount(type: PropType) {
        const index = Math.log2(type);
        return this.storage.props[index];
    }

    /** 使用道具 */
    public useProp(type: PropType, value: number): number {
        const index = Math.log2(type);
        let amount = this.storage.props[index];
        amount -= value;
        this.storage.props[index] = amount;
        this.saveStorage();
        return amount;
    }
}