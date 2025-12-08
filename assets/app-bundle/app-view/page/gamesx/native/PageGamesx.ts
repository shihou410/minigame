import { _decorator, Asset, Color, ConfigurableConstraint, instantiate, JsonAsset, math, Node, NodeEventType, Prefab, Sprite, Tween, tween, UIOpacity, UITransform, v3, Vec3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
const { ccclass } = _decorator;

const ITEM_LIST_MAX: number = 7;
const ITEM_SIZE: number = 112;

const GRAY_COLOR: Color = new Color(122, 122, 122, 255);

type GameItem = {
    id: number,
    layer: number,
    type: number,
    node: Node,
    row: number,
    col: number,
    index: number,
    cType: number,
    isElimi?: boolean,
    isMove?: boolean,
    isLanded?: boolean,
    isBlock?: boolean,
};

@ccclass('PageGamesx')
export class PageGamesx extends BaseView.BindController(GameController) {
    /** 游戏内容节点 */
    private content: Node = null;
    /** 游戏 item 节点 */
    private layer_instance: Node = null;
    /** item 消除列表的节点 */
    private layer_itme_list: Node = null;
    /** 暂时存放 item 的节点 */
    private layer_temp: Node = null;


    private eff_put: Prefab = null;


    /** 关卡配置 */
    private level_config: any[] = null;
    /** 当前关卡 id */
    private _current_level_number: number = 70;
    private set current_level_number(v: number) {
        this._current_level_number = v;
        this.current_level_index = (this.current_level_number - 1) % 50;
        if (this.level_config) this.current_level_config = this.level_config[this.current_level_index];

    }

    private get current_level_number(): number {
        return this._current_level_number;
    }

    private current_level_index: number = 0;
    /** 当前关卡配置 */
    private current_level_config: any = null;

    /** 关卡路径 */
    private current_level_path: string = '';
    // 子界面列表，数组顺序为子界面排列顺序
    protected miniViews: IMiniViewNames = ['PaperAllGame'];

    private itemId: number = 0;

    private gameState: 'pause' | 'start' | 'end' = 'end';


    // 初始化
    onLoad() {
        this.content = this.node.getChildByName('content');
        this.layer_instance = this.content.getChildByName('layer_instance');
        this.layer_itme_list = this.content.getChildByName('layer_list');
        this.layer_temp = this.content.getChildByName('layer_temp');

        app.manager.loader.load({
            path: 'prefab/effect_item_put',
            bundle: 'resources',
            type: Prefab,
            onComplete: (asset: Prefab) => {
                this.eff_put = asset;
            }
        });

        this.bindEvent();
    }

    private bindEvent() {
        this.controller.on('NextLevel', this.nextLevel, this);
        this.controller.on('UseProp', this.useProp, this);
        this.controller.on('RefreshLevel', this.nextLevel, this);
    }

    private offEvent() {
        this.controller.off('NextLevel', this.nextLevel, this);
        this.controller.off('UseProp', this.useProp, this);
        this.controller.off('RefreshLevel', this.nextLevel, this);
    }

    // 界面打开时的相关逻辑写在 onShow，可被多次调用
    onShow(params: any) {
        this.current_level_number = params.level;
        this.showMiniViews({ views: this.miniViews, data: { level: this.current_level_number } });
        this.current_level_path = `level/level_${Math.floor((this.current_level_number - 1) / 50)}`;
        this.loadLevel(this.current_level_path);
    }

    protected loadLevel(path: string) {
        const task = app.lib.task.createSync();
        task.add((next) => {
            this.loadRes(path, JsonAsset, (res) => {
                this.level_config = res.json as any[];
                this.current_level_config = this.level_config[this.current_level_index];
                next();
            });
        });

        task.start(() => {
            this.init();
        });
    }
    // 界面关闭时的相关逻辑写在 onHide
    onHide(result: undefined) {
        this.offEvent();
        return result;
    }

    private itemScale: number = 0;
    private itemSize: number = 0;

    private node_layers: Node[] = null;
    private game_items: GameItem[][] = null;
    // 消除列表
    private elimi_list: GameItem[] = null;

    private currentItemLength: number = 0;
    private isXiaoChu: boolean = false;

    /** 当前子关卡 */
    private current_step: number = 0;
    private max_step: number = 0;
    private init(step: number = 0) {
        this.node_layers = [];
        this.elimi_list = [];
        this.game_items = [];
        this.current_step = step;
        this.currentItemLength = 0;
        this.isXiaoChu = false;

        this.max_step = this.current_level_config.length;

        const stepConfig = this.current_level_config[this.current_step];

        const layers = stepConfig.layers.length;

        let min_x = Infinity;
        let min_y = Infinity;
        let max_x = -Infinity;
        let max_y = -Infinity;

        stepConfig.layers.forEach((layers: any) => {
            layers.tiles.forEach((tile: any) => {
                min_x = Math.min(min_x, tile.x);
                min_y = Math.min(min_y, tile.y);
                max_x = Math.max(max_x, tile.x);
                max_y = Math.max(max_y, tile.y);
            });
        });

        const cols = (max_x - min_x) + 1;
        const rows = (max_y - min_y) + 1;

        let COLS = 8; if (rows > 9) COLS = 8.5;

        const uit = this.layer_instance.getComponent(UITransform);
        this.itemScale = uit.width / COLS / ITEM_SIZE;
        this.itemSize = ITEM_SIZE * this.itemScale;


        const centerx = (min_x + max_x) / 2;
        const centery = (min_y + max_y) / 2;

        this.generateLayer(layers, centerx, centery);
        const items = this.refresh_block_state();
        this.anima_enter(() => {
            items.forEach(item => this.anima_item_color(item, Color.WHITE, GRAY_COLOR));
        });

        this.startGame();
    }

    private readonly list_item_scale: number = 0.86;
    private startGame() {
        this.gameState = 'start';
    }

    private generateLayer(layers: number, centerx: number, centery: number) {

        for (let layer = 0; layer < layers; layer++) {
            const layer_node = new Node();
            this.layer_instance.addChild(layer_node);
            this.node_layers.push(layer_node);
            const items: GameItem[] = [];
            const tiles = this.current_level_config[this.current_step].layers[layer].tiles;
            tiles.forEach((tile: any) => {
                const col = tile.x - centerx;
                const row = tile.y - centery;
                const item = this.createItem(layer, tile.skinIdx, row, col);
                item.index = items.length;
                items.push(item);
            });
            this.game_items.push(items);
        }

        this.sortItem();

    }

    private createItem(layer: number, type: number, row: number, col: number): GameItem {
        const node = app.manager.game.getItem();
        node.setScale(this.itemScale, this.itemScale);

        const item: GameItem = {
            id: this.itemId++,
            layer: layer,
            type: type,
            node: node,
            row: 1,
            col: 1,
            index: 0,
            cType: type,
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

    private grid_to_node(row: number, col: number): number[] {
        return [col * this.itemSize, row * this.itemSize + 80];
    }

    private item_click(item: GameItem) {
        if (this.gameState === 'end') return;

        // 新增：被遮挡不能点
        if (item.isBlock) {
            this.anima_item_error(item);
            return;
        }

        item.node.off(NodeEventType.TOUCH_START);

        let length = 0;
        this.game_items.forEach(v => { length += v.length; });

        if (this.currentItemLength < ITEM_LIST_MAX) this.list_put(item);

    }

    private list_put(item: GameItem) {

        //先获取所有被遮挡的item
        const tempItems: GameItem[] = [];
        this.game_items.forEach(items => items.forEach(i => i.isBlock && tempItems.push(i)));

        // 查找插入位置：相同类型的最后一个后面
        let insertIndex = this.elimi_list.map(v => v.type).lastIndexOf(item.type);
        insertIndex = insertIndex < 0 ? this.elimi_list.length : insertIndex + 1;
        this.elimi_list.splice(insertIndex, 0, item);
        // 更新已有元素索引
        this.list_refresh_index();

        const same = this.elimi_list.filter(i => { return i.type !== -1 && i.type === item.type; });
        if (same.length >= 3) { same.forEach(i => { i.type = -1; }); }

        this.list_refresh_leng();

        // 从原层移除
        const layerItems = this.game_items[item.layer];
        const f = layerItems.findIndex(v => v.id === item.id);
        if (f >= 0) { layerItems.splice(f, 1); }

        // 添加到收集区节点，保持原世界坐标避免跳动
        const ws = item.node.worldPosition;
        const pos = this.layer_itme_list.getComponent(UITransform).convertToNodeSpaceAR(ws);
        this.layer_itme_list.addChild(item.node);
        item.node.position = pos;
        // item.node.setScale(this.list_item_scale, this.list_item_scale);

        //起飞
        tween(item.node)
            .to(0.2, { scale: v3(item.node.scale).multiplyScalar(1.3), angle: -10 })
            .call(() => item.isMove = true).start();

        const res = this.refresh_block_state();
        const items: GameItem[] = [];
        tempItems.forEach(i => {
            const index = res.indexOf(i);
            if (index < 0) items.push(i);
        });
        items.forEach(i => this.anima_item_color(i, GRAY_COLOR, Color.WHITE));

    }


    protected update(dt: number): void {
        if (this.gameState != 'start') return;
        if (!this.elimi_list) return;

        let landedCount: number = 0;
        this.elimi_list?.forEach((item: GameItem, index: number) => {
            const target = this.index_to_list(item.index);
            if (item.isMove || item.isLanded) {
                const sp = 15;
                item.node.position.lerp(v3(target[0], target[1]), dt * sp);
                const s_res = v3(item.node.scale).lerp(v3(this.list_item_scale, this.list_item_scale, 1), dt * sp);
                !item.isElimi && item.node.setScale(s_res);
                item.node.angle = math.lerp(item.node.angle, 0, dt * sp);
            }

            if (!item.isLanded && v3(item.node.position).subtract(v3(target[0], target[1])).length() < 1) {
                item.isLanded = true;
                item.isMove = false;
                this.list_refresh_leng();
                this.eff_put_play(item);
            }
            if (item.isLanded) landedCount++;
        });

        landedCount === this.elimi_list.length && this.check_game_status();

        const same = this.elimi_list.filter(e => { return e.type === -1 && !e.isElimi && !e.isMove && e.isLanded; });

        if (!this.isXiaoChu && same.length >= 3) {
            const temp = same.filter(i => { return i.cType === same[0].cType; });
            if (temp.length >= 3) {
                this.isXiaoChu = true;
                const elimi = temp.splice(0, 3);
                elimi.forEach(i => { i.isElimi = true });
                this.anima_items_elimi(elimi, () => {
                    this.isXiaoChu = false;
                    this.elimi_list = this.elimi_list.filter(i => { return i.node });
                    this.list_refresh_index();
                    this.list_refresh_leng();
                    this.check_game_status();
                });
            }
        }

    }

    private refresh_block_state(): GameItem[] {

        const blocks: GameItem[] = [];
        const rootTrans = this.layer_instance.getComponent(UITransform);
        const blockSize = this.itemSize * 0.65; // 遮挡判定范围，可调 0.5 ~ 0.8

        for (let layer = 0; layer < this.game_items.length; layer++) {

            const list = this.game_items[layer];

            list.forEach(item => {
                // 如果这个 item 已经飞走到槽里，不在层中，不需要判断遮挡
                if (!item.node || item.node.parent !== this.node_layers[layer]) {
                    item.isBlock = false;
                    return;
                }

                // item 当前世界坐标 → 转换到同一坐标系
                const wpos = item.node.worldPosition;
                const pos = rootTrans.convertToNodeSpaceAR(wpos);

                let blocked = false;

                // 查找所有上层
                for (let upper = layer + 1; upper < this.game_items.length; upper++) {

                    const upperList = this.game_items[upper];

                    const hit = upperList.find(u => {
                        if (!u.node || u.node.parent !== this.node_layers[upper]) return false;

                        const uw = u.node.worldPosition;
                        const up = rootTrans.convertToNodeSpaceAR(uw);

                        // 计算重叠（AABB）
                        const dx = Math.abs(up.x - pos.x);
                        const dy = Math.abs(up.y - pos.y);

                        return dx < blockSize && dy < blockSize;
                    });

                    if (hit) {
                        blocked = true;
                        break;
                    }
                }

                item.isBlock = blocked;
                if (item.isBlock) blocks.push(item);
            });
        }
        return blocks;
    }


    // 重排索引并保持位置
    private list_refresh_index() {
        this.elimi_list.forEach((it, idx) => it.index = idx);
    }

    private list_refresh_leng() {
        this.currentItemLength = this.elimi_list.filter(e => { return e.type !== -1 }).length;
    }

    // 检查胜负状态
    private check_game_status() {
        if (this.currentItemLength >= ITEM_LIST_MAX) {
            this.gameState = 'end';
            this.controller.gameEnd(false);
            return;
        }

        let remain = this.elimi_list.length;
        this.game_items.forEach(v => remain += v.length);
        if (remain === 0) {
            this.gameState = 'end';
            this.nextStep();
        }
    }

    private sortItem() {
        this.game_items.forEach(layer => {
            layer.sort((a, b) => b.node.position.y - a.node.position.y)
                .forEach((item, index) => {
                    item.node.setSiblingIndex(index);
                });
        });
    }

    private eff_put_play(item: GameItem) {
        if (!this.eff_put) return;

        const eff = instantiate(this.eff_put);
        eff.name = "eff_node";
        item.node.addChild(eff);
    }


    // 开场动画
    private anima_enter(call: () => void) {

        let count = 0;
        let finished = 0;
        const duration = 0.3;
        this.game_items.forEach((items: GameItem[], layer: number) => {
            count += items.length;
            items.forEach(item => {
                item.node.setScale(0, 0, 1);
                tween(item.node)
                    .delay(duration * layer)
                    .to(duration, { scale: v3(this.itemScale, this.itemScale, 1) }, { easing: 'backOut' })
                    .call(() => {
                        ++finished;
                        if (finished >= count) call && call();
                    }).start();
            });
        });
    }

    // item遮挡动画
    private anima_item_error(item: GameItem) {
        if (!item || !item.node) return;

        if ((item as any)._errorTween) { return; }

        const node = item.node;
        const originalX = node.position.x;

        const shakeDist = 12;   // 摇晃幅度
        const shakeTime = 0.05; // 每次摇晃的时间

        const t = tween(node)
            .to(shakeTime, { position: v3(originalX - shakeDist, node.position.y, 0) })
            .to(shakeTime, { position: v3(originalX + shakeDist, node.position.y, 0) })
            .to(shakeTime, { position: v3(originalX - shakeDist * 0.6, node.position.y, 0) })
            .to(shakeTime, { position: v3(originalX + shakeDist * 0.6, node.position.y, 0) })
            .to(shakeTime, { position: v3(originalX, node.position.y, 0) })
            .call(() => {
                (item as any)._errorTween = null;
            });

        (item as any)._errorTween = t;
        t.start();
    }

    // item消除动画
    private anima_items_elimi(item: GameItem[], call: () => void = null, duration: number = 0.3) {
        let delayTime = 0;
        item.forEach((element, index) => {
            let delay = index * 0.1;
            delayTime = Math.max(delay + duration, delayTime);
            tween(element.node).delay(delay).to(duration, { scale: v3(0, 0, 1) }, { easing: 'backIn' }).start();
        });

        this.scheduleOnce(() => {
            item.forEach((element, index) => {
                const eff = element.node.getChildByName("eff_node");
                if (eff) {
                    const ws = eff.worldPosition;
                    const ls = this.layer_temp.getComponent(UITransform).convertToNodeSpaceAR(ws);
                    this.layer_temp.addChild(eff);
                    eff.position = ls;
                }
                app.manager.game.putItem(element.node);
                element.node = null;
            });
            call && call();
        }, delayTime);
    }

    private tempColor: Color = new Color(255, 255, 255, 255);
    // item换色
    private anima_item_color(item: GameItem, sColor: Color, dColor: Color) {
        this.tempColor.set(sColor.r, sColor.g, sColor.b, sColor.a);
        tween(this.tempColor).to(0.3, { r: dColor.r, g: dColor.g, b: dColor.b, a: dColor.a }, {
            onUpdate: (target, ratio) => {
                item.node.getChildByName('normal').getComponent(Sprite).color = this.tempColor;
                item.node.getChildByName('spr').getComponent(Sprite).color = this.tempColor;
            },
        }).start();
    }

    private index_to_list(index: number): [number, number] {
        const itemWidth = this.list_item_scale * ITEM_SIZE;
        const startX = -294;
        const startY = 22;
        return [startX + index * (itemWidth + 2), startY];
    }

    private clearLevel() {
        this.layer_instance.removeAllChildren();
        this.layer_itme_list.removeAllChildren();
    }

    /** 下一轮 */
    private nextStep() {

        this.current_step++;
        this.clearLevel();
        if (this.current_step >= this.max_step) {
            this.current_step = 0;
            this.controller.gameEnd(true);
        } else {
            this.init(this.current_step);
        }

    }

    /** 下一关 */
    private nextLevel(level: number) {
        this.clearLevel();

        if (level > 1000) {
            app.manager.ui.showToast("暂无更多关卡");
        } else {
            this.current_level_number = level;
            const newPath = `level/level_${Math.floor((this.current_level_number - 1) / 50)}`;
            if (newPath != this.current_level_path) {
                this.loadLevel(newPath);
            } else {
                this.init();
            }
        }
    }

    /** 使用道具 */
    private useProp(type: number) {

        switch (type) {
            case 0: // 提示道具
                this.gameTip();
                break;

            case 1: // 消除道具
                this.gameElimi();
                break;
            case 2: // 刷新道具
                this.gameRefresh();
                break;
        }


    }

    private tipMap: Map<number, GameItem[]> = new Map();
    private gameTip() {
        this.tipMap.clear();
        let items: GameItem[] = [];
        this.game_items.forEach(layer => layer.forEach(item => !item.isBlock && items.push(item)));

        items.forEach(item => {
            if (this.tipMap.has(item.type)) {
                this.tipMap.get(item.type).push(item);
            } else {
                this.tipMap.set(item.type, [item]);
            }
        });

        for (const [key, value] of this.tipMap) {
            if (value.length >= 3) {
                value.splice(0, 3).forEach(item => this.item_click(item)); return;
            }
        }
    }


    private gameElimi() {
        this.tipMap.clear();
        let items: GameItem[] = [];
        this.game_items.forEach(layer => layer.forEach(item => !item.isBlock && items.push(item)));


        this.elimi_list.forEach(item => {
            if (this.tipMap.has(item.type)) {
                this.tipMap.get(item.type).push(item);
            } else {
                this.tipMap.set(item.type, [item]);
            }
        });
        items.forEach(item => {
            if (this.tipMap.has(item.type)) {
                this.tipMap.get(item.type).push(item);
            } else {
                this.tipMap.set(item.type, [item]);
            }
        });


        for (const [key, value] of this.tipMap) {
            if (value.length >= 3) {
                value.splice(0, 3).forEach(item => {
                    !item.isLanded && this.item_click(item);
                });
                return;
            }
        }
    }


    private gameRefresh() {

    }


}
