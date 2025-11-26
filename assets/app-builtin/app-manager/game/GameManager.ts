import { _decorator, instantiate, NodePool, Prefab, Sprite, SpriteAtlas, Node, SpriteFrame } from 'cc';
import BaseManager from '../../../../extensions/app/assets/base/BaseManager';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;
@ccclass('GameManager')
export class GameManager extends BaseManager {


    private atlas_items: SpriteAtlas = null;
    private prefab_item: Prefab = null;

    private item_pool: NodePool = null;

    // [无序] 加载完成时触发
    protected onLoad() { }

    // [无序] 自身初始化完成, init执行完毕后被调用
    protected onInited() {
        this.item_pool = new NodePool();
        this.creatorItems(20);
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
        item.getChildByName('spr').getComponent(Sprite).spriteFrame = null;
        item.targetOff(item);
        this.item_pool.put(item);

    }

    public getSpriteFrameByName(name: string): SpriteFrame {
        return this.atlas_items.getSpriteFrame(name);
    }

    public getSpriteFrameByIndex(index: number): SpriteFrame {
        return this.atlas_items.getSpriteFrames()[index];
    }

    public getAtlasLength(): number { return this.atlas_items.getSpriteFrames().length; }

}