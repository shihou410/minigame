import { _decorator, Color, JsonAsset, Node, NodeEventType, Sprite, Tween, tween, UITransform, v3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
const { ccclass } = _decorator;

const ROWS: number = 8;
const ITEM_LIST_MAX: number = 7;
const ITEM_SIZE: number = 112;
const LIST_MAX: number = 7;

type GameItem = {
    id: number,
    layer: number,
    type: number,
    node: Node,
    active: boolean,
    row: number,
    col: number,
    index: number,
    ani?: Tween
};

@ccclass('PageGamesx')
export class PageGamesx extends BaseView {
    /** 游戏内容节点 */
    private content: Node = null;
    /** 游戏 item 节点 */
    private layer_instance: Node = null;
    /** item 消除列表的节点 */
    private layer_itme_list: Node = null;
    /** 暂时存放 item 的节点 */
    private layer_temp: Node = null;

    /** 关卡配置 */
    private level_config: any[] = null;
    /** 当前关卡 id */
    private current_level_number: number = 5;
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

    // 初始化
    onLoad() {
        this.content = this.node.getChildByName('content');
        this.layer_instance = this.content.getChildByName('layer_instance');
        this.layer_itme_list = this.content.getChildByName('layer_list');
        this.layer_temp = this.content.getChildByName('layer_temp');

        const uit = this.layer_instance.getComponent(UITransform);
        this.itemScale = uit.width / ROWS / ITEM_SIZE;
        this.itemSize = ITEM_SIZE * this.itemScale;
        this.startX = -uit.width / 2;
        this.startY = uit.height / 2;

        const task = app.lib.task.createSync();
        task.add((next) => {
            this.loadRes('level/level', JsonAsset, (res) => {
                this.level_config = res.json as any[];
                this.current_level_config = this.level_config[this.current_level_number - 1];
                next();
            });
        });

        task.start(() => {
            this.init();
        });
    }

    // 界面打开时的相关逻辑写在 onShow，可被多次调用
    onShow(params: any) {
        this.showMiniViews({ views: this.miniViews });
    }

    // 界面关闭时的相关逻辑写在 onHide
    onHide(result: undefined) {
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
        console.log('游戏数据', this.game_items);
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
        let length = 0;
        this.game_items.forEach(v => { length += v.length; });

        if (this.currentItemLength >= ITEM_LIST_MAX) {
            console.log('游戏结束！！');
            app.manager.ui.showToast('游戏结束！！');
        } else if (length <= 0) {
            app.manager.ui.showToast('游戏成功！！');
            console.log('游戏成功！！');
        } else {
            this.list_put(item);
        }
    }

    private color: Color = new Color;
    /** 设置 item 的状态 */
    private item_set_active(item: GameItem, value: boolean) {
        item.active = value;
        value ? this.color.set(255, 255, 255, 255) : this.color.set(111, 111, 111, 255);

        item.node.getChildByName('normal').getComponent(Sprite).color = this.color;
        item.node.getChildByName('spr').getComponent(Sprite).color = this.color;
    }

    private currentItemLength: number = 0;
    private list_put(item: GameItem) {
        if (this.currentItemLength >= ITEM_LIST_MAX) {
            app.manager.ui.showToast('游戏结束！！');
            return;
        }

        // 查找插入位置：相同类型的最后一个后面
        let insertIndex = this.elimi_list.map(v => v.type).lastIndexOf(item.type);
        insertIndex = insertIndex < 0 ? this.elimi_list.length : insertIndex + 1;

        for (let i = insertIndex; i < this.elimi_list.length; i++) {
            this.elimi_list[i].index++;
        }
        item.index = insertIndex;

        // 从原层移除
        const layerItems = this.game_items[item.layer];
        const f = layerItems.findIndex(v => v.id === item.id);
        if (f >= 0) { layerItems.splice(f, 1); }

        // 添加到收集区节点，保持原世界坐标避免跳动
        const ws = item.node.worldPosition;
        const pos = this.layer_itme_list.getComponent(UITransform).convertToNodeSpaceAR(ws);
        this.layer_itme_list.addChild(item.node);
        item.node.position = pos;
        item.node.setScale(this.list_item_scale, this.list_item_scale);

        // 插入到收集区数组
        this.elimi_list.splice(insertIndex, 0, item);
        this.currentItemLength = this.elimi_list.length;

        let sameItems = this.elimi_list.filter(v => v.type === item.type);
        if (sameItems.length >= 3) {
            this.currentItemLength -= 3;
        } else {
            sameItems = null;
        }

        // 先移动到正确位置，再检查是否需要消除
        this.anima_items_move(() => {
            if (sameItems) {
                sameItems.forEach(it => {
                    const idx = this.elimi_list.indexOf(it);
                    if (idx >= 0) this.elimi_list.splice(idx, 1);
                });
            }

        });
    }

    // 插入后尝试匹配三消
    private list_try_elimi(type: number) {
        const sameItems = this.elimi_list.filter(v => v.type === type);

        sameItems.forEach(it => {
            const idx = this.elimi_list.indexOf(it);
            if (idx >= 0) this.elimi_list.splice(idx, 1);
        });
        this.currentItemLength = this.elimi_list.length;
        this.list_refresh_index();

        this.anima_items_elimi(sameItems, () => {
            this.anima_items_move(() => this.check_game_status());
        });
    }

    // 重排索引并保持位置
    private list_refresh_index() {
        this.elimi_list.forEach((it, idx) => it.index = idx);
    }

    // 检查胜负状态
    private check_game_status() {
        if (this.currentItemLength >= ITEM_LIST_MAX) {
            app.manager.ui.showToast('游戏结束！！');
            return;
        }

        let remain = this.elimi_list.length;
        this.game_items.forEach(v => remain += v.length);
        if (remain === 0) {
            app.manager.ui.showToast('游戏成功！！');
        }
    }

    private anima_items_elimi(item: GameItem[], call: () => void = null, duration: number = 0.3) {
        item.forEach(i => this.anima_item_elimi(i, duration));
        this.scheduleOnce(() => call && call(), duration);
    }

    // item 消除动画
    private anima_item_elimi(item: GameItem, duration: number = 0.3) {
        tween(item.node).to(duration, { scale: v3(0, 0, 0) }).call(() => {
            app.manager.game.putItem(item.node);
            item.node = null;
        }).start();
    }

    private anima_items_move(call: () => void = null, duration: number = 0.3) {
        this.elimi_list.forEach(item => {
            !item.ani && this.anima_item_move(item, duration);
        });
        this.scheduleOnce(() => call && call(), duration);
    }

    // item 移动动画
    private anima_item_move(item: GameItem, duration: number = 0.3) {
        const pos = this.index_to_list(item.index);
        item.ani = tween(item.node)
            .to(duration, { position: v3(pos[0], pos[1], 0) })
            .call(() => { item.ani = null })
            .start();
    }

    private anima_itme_move_to(item: GameItem, call: () => void = null) {
        const pos = this.index_to_list(item.index);
        tween(item.node).to(0.3, { position: v3(pos[0], pos[1] + this.layer_itme_list.y, 0) }).call(() => call && call()).start();
    }

    // item 放置动画
    private anima_item_to_list(item: GameItem, call: (item: GameItem) => void) {
        const pos = this.index_to_list(item.index);
        tween(item.node).to(0.3, { position: v3(pos[0], pos[1]) }).call(() => call && call(item)).start();
    }

    private index_to_list(index: number): [number, number] {
        const itemWidth = this.itemScale * ITEM_SIZE;
        const startX = -297;
        const startY = 22;
        return [startX + index * (itemWidth + 5), startY];
    }

    private grid_to_node(row: number, col: number): number[] {
        return [
            this.startX + col * this.itemSize,
            this.startY - row * this.itemSize,
        ];
    }
}
