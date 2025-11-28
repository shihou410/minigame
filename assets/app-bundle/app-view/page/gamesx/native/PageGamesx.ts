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
    cType: number,
    isMove?: boolean,
    isLanded?: boolean,
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
    private current_level_number: number = 44;
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

    private gameState: 'pause' | 'start' | 'end' = 'end';

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
    // 消除列表
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
    private startGame() {

        this.gameState = 'start';
    }

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
            index: 0,
            cType: type
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
        if (this.gameState === 'end') return;
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

    private list_put(item: GameItem) {

        // 查找插入位置：相同类型的最后一个后面
        let insertIndex = this.elimi_list.map(v => v.type).lastIndexOf(item.type);
        insertIndex = insertIndex < 0 ? this.elimi_list.length : insertIndex + 1;
        this.elimi_list.splice(insertIndex, 0, item);
        // 更新已有元素索引
        this.list_refresh_index();

        const same = this.elimi_list.filter(i => { return i.type !== -1 && i.type === item.type; });
        if (same.length >= 3) { same.forEach(i => { i.type = -1; }); }

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

        //起飞
        item.isMove = true;
    }


    private currentItemLength: number = 0;
    private isXiaoChu: boolean = false;
    protected update(dt: number): void {
        if (this.gameState != 'start') return;
        if (!this.elimi_list) return;
        this.elimi_list?.forEach((item: GameItem, index: number) => {
            const target = this.index_to_list(item.index);
            const res = item.node.position.lerp(v3(target[0], target[1]), dt * 10);
            item.node.setPosition(res);

            if (!item.isLanded && v3(item.node.position).subtract(v3(target[0], target[1])).length() < 1) {
                item.isLanded = true;
                item.isMove = false;
                this.list_refresh_leng();
                this.check_game_status();
            }
        });

        const same = this.elimi_list.filter(e => { return e.type === -1 && !e.isMove; });

        if (!this.isXiaoChu && same.length >= 3) {
            const temp = same.filter(i => { return i.cType === same[0].cType; });
            if (temp.length >= 3) {
                this.isXiaoChu = true;
                this.anima_items_elimi(temp.splice(0, 3), () => {
                    this.isXiaoChu = false;
                    this.elimi_list = this.elimi_list.filter(i => { return i.node });
                    this.list_refresh_index();
                    this.list_refresh_leng();
                    this.check_game_status();
                });
            }
        }

    }

    // 重排索引并保持位置
    private list_refresh_index() {
        this.elimi_list.forEach((it, idx) => it.index = idx);
    }

    private list_refresh_leng() {
        this.currentItemLength = this.elimi_list.filter(e => { return e.type !== -1 && e.isLanded }).length;
    }


    // 检查胜负状态
    private check_game_status() {
        if (this.currentItemLength >= ITEM_LIST_MAX) {
            app.manager.ui.showToast('游戏结束！！');
            this.gameState = 'end';
            return;
        }

        let remain = this.elimi_list.length;
        this.game_items.forEach(v => remain += v.length);
        if (remain === 0) {
            this.gameState = 'end';
            app.manager.ui.showToast('游戏成功！！');
        }
    }

    private anima_items_elimi(item: GameItem[], call: () => void = null, duration: number = 0.3) {
        let delayTime = 0;
        item.forEach((element, index) => {
            let delay = index * 0.1;
            delayTime = Math.max(delay + duration, delayTime);
            tween(element.node).delay(delay).to(duration, { scale: v3(0, 0, 1) }, { easing: 'backIn' }).start();
        });

        this.scheduleOnce(() => {
            item.forEach((element, index) => {
                app.manager.game.putItem(element.node);
                element.node = null;
            });
            call && call()
        }, delayTime);
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
