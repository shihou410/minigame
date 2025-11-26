import { _decorator, Color, JsonAsset, Node, NodeEventType, Sprite, SubContextView, tween, UIOpacity, UITransform, utils, v3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
const { ccclass, property } = _decorator;

const ROWS: number = 8;

const ITEM_LIST_MAX: number = 7;

type GameItem = {
    id: number,
    layer: number,
    type: number,
    node: Node,
    active: boolean,
    row: number,
    col: number,
    index: number,
};


const ITEM_SIZE: number = 112;
const LIST_MAX: number = 7;
@ccclass('PageGamesx')
export class PageGamesx extends BaseView {
    /** 游戏内容节点 */
    private content: Node = null;
    /** 游戏item节点 */
    private layer_instance: Node = null;
    /** item消除列表的节点 */
    private layer_itme_list: Node = null;


    /** 关卡配置 */
    private level_config: any[] = null;
    /** 当前关卡id */
    private current_level_number: number = 1;
    /** 当前关卡配置 */
    private current_level_config: any = null;

    /** 当前子关卡 */
    private crrent_sub: number = 0;
    /** 子关卡数量 */
    private sub_count: number = 0;

    // 子界面列表，数组顺序为子界面排列顺序
    protected miniViews: IMiniViewNames = [];

    private startX: number = 0;
    private startY: number = 0;

    private itemScale: number = 0;
    private itemSize: number = 0;

    private itemId: number = 0;

    // 初始化的相关逻辑写在这
    onLoad() {
        this.content = this.node.getChildByName('content');
        this.layer_instance = this.content.getChildByName('layer_instance');
        this.layer_itme_list = this.content.getChildByName('layer_list');

        const uit = this.layer_instance.getComponent(UITransform);

        this.itemScale = uit.width / ROWS / ITEM_SIZE;

        this.itemSize = ITEM_SIZE * this.itemScale;

        this.startX = -uit.width / 2;
        this.startY = uit.height / 2;

        const task = app.lib.task.createSync();
        task.add((next, retry) => {
            this.loadRes('level/level', JsonAsset, (res) => {
                this.level_config = res.json as any[];
                this.current_level_config = this.level_config[this.current_level_number - 1];
                next();
            });
        });

        task.start(suc => {
            this.init();
        });

    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) {
        this.showMiniViews({ views: this.miniViews });
    }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PageGamesx>({name: 'PageGamesx', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private node_layers: Node[] = null;
    private game_items: GameItem[][] = null;
    private elimi_list: GameItem[] = null;
    private init(step: number = 0) {

        this.node_layers = [];
        this.elimi_list = [];
        this.game_items = [];
        this.crrent_sub = step;
        const layers = this.current_level_config[this.crrent_sub].layers.length;

        this.generateLayer(layers);

        this.game_items[this.node_layers.length - 1].forEach(v => {
            this.item_set_active(v, true);
        });
        console.log("游戏数据：", this.game_items);
        this.startGame();
    }

    private list_item_scale: number = 0.86;
    private startGame() { }

    private generateLayer(layers: number) {

        for (let layer = 0; layer < layers; layer++) {
            const layer_node = new Node();
            this.layer_instance.addChild(layer_node);
            this.node_layers.push(layer_node);
            const items: GameItem[] = [];
            const tiles = this.current_level_config[this.crrent_sub].layers[layer].tiles;
            tiles.forEach((tile: any) => {
                const col = 4 - tile.x;
                const row = 4 - tile.y;

                const item = this.createItem(layer, tile.skinIdx, row, col);
                this.item_set_active(item, false);
                item.index = items.length;
                items.push(item);
            });
            this.game_items.push(items);
        }
    }

    private createItem(layer: number, type: number, row: number, col: number): GameItem {
        const node = app.manager.game.getItem();
        node.setScale(this.itemScale, this.itemScale);

        const item: GameItem = {
            id: this.itemId++,
            layer: layer,
            type: type,
            node: node,
            active: true,
            row: 1,
            col: 1,
            index: 0
        };

        const spriteFrame = app.manager.game.getSpriteFrameByIndex(type);
        const sprite = node.getChildByName('spr').getComponent(Sprite);
        sprite.spriteFrame = spriteFrame;

        this.node_layers[layer].insertChild(node, 0);
        const pos = this.grid_to_node(row, col);
        node.setPosition(pos[0], pos[1]);
        node.on(NodeEventType.TOUCH_START, () => this.item_click(item), this);
        return item;
    }

    private item_click(item: GameItem) {

        item.node.off(NodeEventType.TOUCH_START);
        let length: number = 0;
        this.game_items.forEach(v => { length += v.length; });

        if (this.elimi_list.length >= ITEM_LIST_MAX) {
            console.log("游戏结束！！");
        } else if (length <= 0) {
            console.log("游戏成功！！");
        } else {
            this.list_put(item);
        }
    }

    private color: Color = new Color;
    /** 设置item的状态 */
    private item_set_active(item: GameItem, value: boolean) {
        item.active = value;
        value ? this.color.set(255, 255, 255, 255) : this.color.set(111, 111, 111, 255);

        item.node.getChildByName('normal').getComponent(Sprite).color = this.color;
        item.node.getChildByName('spr').getComponent(Sprite).color = this.color;
    }

    private list_put(item: GameItem) {

        // 查找插入位置：相同类型的最后一个后面
        let insertIndex = this.elimi_list.findIndex(v => { return v.type === item.type; });
        if (insertIndex < 0) {
            insertIndex = this.elimi_list.length;
        } else {
            for (let i = insertIndex; i < this.elimi_list.length; i++)++this.elimi_list[i].index;
        }
        item.index = insertIndex;

        // 插入到指定位置
        this.elimi_list.splice(insertIndex, 0, item);
        console.log("array: ", this.elimi_list.map(v => { return v.index; }));
        // 添加到对应图层
        const ws = item.node.worldPosition;
        const pos = this.layer_itme_list.getComponent(UITransform).convertToNodeSpaceAR(ws);
        this.layer_itme_list.addChild(item.node);
        item.node.position = pos;

        // 删除网格数据
        const f = this.game_items[item.layer].findIndex(v => { return v.id === item.id; });
        (f >= 0) && this.game_items[item.layer].splice(f, 1);

        // 设置缩放
        item.node.setScale(this.list_item_scale, this.list_item_scale);

        // 播放动画
        this.elimi_list.forEach(e => this.anima_item_to_list(e));
        const sameItems = this.check_elimination(item.type);

        // let delay = 0;
        // if (sameItems) {
        //     this.scheduleOnce(() => sameItems.forEach(i => this.anima_item_elimi(i)), 0.3);
        //     delay = 0.3;
        // }

        // this.scheduleOnce(() => {
        //     this.rearrange_list();
        //     this.elimi_list.forEach((item) => { this.anima_item_move(item); });
        // }, delay + 0.3);

    }

    // 检查具有相同类型的三个item
    private check_elimination(type: number): GameItem[] {
        // 找出所有相同类型的 item
        const sameItems = this.elimi_list.filter(i => i.type === type);
        if (sameItems.length >= 3) {
            // 从 elimi_list 中移除这些 item
            this.elimi_list = this.elimi_list.filter(i => i.type !== type);
            return sameItems;
        }
        return null;
    }

    //重新排列item
    private rearrange_list() {
        this.elimi_list.forEach((item, idx) => item.index = idx);
    }
    // item消除动画
    private anima_item_elimi(item: GameItem) {
        tween(item.node).to(0.3, { scale: v3(0, 0, 0) }).call(() => {
            app.manager.game.putItem(item.node);
            item.node = null;
        }).start();
    }
    // item移动动画
    private anima_item_move(item: GameItem) {
        const pos = this.index_to_list(item.index);
        tween(item.node).to(0.3, { position: v3(pos[0], pos[1], 0) }).start();
    }

    // item放置动画
    private anima_item_to_list(item: GameItem) {

        const pos = this.index_to_list(item.index);
        tween(item.node).to(0.3, { position: v3(pos[0], pos[1]) }).start();
    }

    private index_to_list(index: number): [number, number] {
        const itemWidth = this.itemScale * ITEM_SIZE
        const startX = -297;
        const startY = 22;
        return [startX + index * (itemWidth + 5), startY]
    }

    private grid_to_node(row: number, col: number): number[] {
        return [
            this.startX + col * this.itemSize,
            this.startY - row * this.itemSize,
        ];
    }

}