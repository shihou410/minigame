import { _decorator, AnimationManager, easing, game, Graphics, graphicsAssembler, instantiate, JsonAsset, Label, math, Node, NodeEventType, Prefab, randomRange, randomRangeInt, Sprite, SpriteFrame, Tween, tween, UIOpacity, UITransform, utils, v2, v3, Vec2, Vec3 } from 'cc';
import BaseView from '../../../../../../extensions/app/assets/base/BaseView';
import { IMiniViewNames } from '../../../../../app-builtin/app-admin/executor';
import { app } from 'db://assets/app/app';
import { ASync } from 'db://app/lib/task/task';
import { GameController } from 'db://assets/app-builtin/app-controller/GameController';
const { ccclass, property } = _decorator;

const Level1: GameConfig = {
    moveType: "slide",  // 移动方式 shift和slide两种,none表示不会移动
    moveDir: 4,         // 移动方向0~3,右，上，左，下, 4是按0-3方向依次移动
    time: 60,           // 倒计时
    rows: 4,            // 行   最多10
    cols: 4,            // 列   最多8列
    totleTypes: 4,      // 类型对数
    probability: 0,     // 出现item的概率，0表示不会出现 概率最大为30
}


type GameConfig = {
    moveType: "shift" | "slide" | "none",
    moveDir: 0 | 1 | 2 | 3 | 4,
    time: number,
    rows: number,
    cols: number,
    totleTypes: number,
    probability: number,
}

type GameItem = {
    id: number,
    type: number,
    node: Node,
    row: number,
    col: number,
    originScale: number,
};

const ITEM_SIZE: number = 112;

@ccclass('PageGamellk')
export class PageGamellk extends BaseView.BindController(GameController) {

    private prefab_line: Prefab = null;
    private prefab_star: Prefab = null;

    // 子界面列表，数组顺序为子界面排列顺序
    protected miniViews: IMiniViewNames = ['PaperAllGame'];

    private content: Node = null;
    private layer_items: Node = null;
    private layer_effect: Node = null;
    private label_title: Label = null;
    private game_state: "ready" | "plaing" | "pause" | "end" = "ready";
    private LEVELS: GameConfig[] = null;
    private currentLevel: number = 1;
    onLoad() {
        this.content = this.node.getChildByName('content');
        this.layer_items = this.content.getChildByName('layer_items');
        this.layer_effect = this.content.getChildByName('layer_effect');
        this.label_title = this.content.getChildByName('label_title').getComponent(Label);
        this.game_state = "ready";

        this.controller.on('UseProp', this.onUseProp, this);


        const uid = app.manager.ui.showLoading();
        const task = app.lib.task.createASync();
        task.add((next, rery) => {
            this.loadRes('json/levels', JsonAsset, (res: JsonAsset) => {
                this.LEVELS = res.json as GameConfig[];
                next();
            });
        });
        task.add((next, rery) => {
            this.loadRes('prefab/GameLine', Prefab, (res: Prefab) => {
                this.prefab_line = res;
                next();
            });
        });
        task.add((next, rery) => {
            this.loadRes('prefab/GameStar', Prefab, (res: Prefab) => {
                this.prefab_star = res;
                next();
            });
        });
        task.start((suc) => {
            app.manager.ui.hideLoading(uid);
            if (suc) {
                this.showMiniViews({ views: this.miniViews, data: this.level_cfg });
                // return;
                this.initGame(this.currentLevel);
            }
        });
    }

    // 界面打开时的相关逻辑写在这(onShow可被多次调用-它与onHide不成对)
    onShow(params: any) { }

    // 界面关闭时的相关逻辑写在这(已经关闭的界面不会触发onHide)
    onHide(result: undefined) {
        // app.manager.ui.show<PageGamellk>({name: 'PageGamellk', onHide:(result) => { 接收到return的数据，并且有类型提示 }})
        return result;
    }

    private gameGrid: (GameItem | null)[][] = [];
    private stageWidth: number = 0;
    private stageHeight: number = 0;
    private itemSize: number;
    private startX: number;
    private startY: number;

    // 配对次数
    private pairedCount: number = 0;

    private pairedStart: number = 0;

    // 记录item的id
    private itemID: number = 0;
    // item的类型
    private item_types: number[] = null;

    private level_cfg: GameConfig = null;
    private initGame(lv: number) {

        this.label_title.string = `LEVEL ${lv}`;

        const level_index = lv > this.LEVELS.length ? 20 + randomRangeInt(0, 30) : lv - 1;

        this.level_cfg = this.LEVELS[level_index];

        this.pairedStart = randomRangeInt(0, 4);
        this.itemID = 0;

        const uit = this.layer_items.getComponent(UITransform);
        this.stageWidth = uit.width - 60;
        this.stageHeight = uit.height;
        const itemScale = this.stageWidth / this.level_cfg.cols / ITEM_SIZE;
        this.itemSize = itemScale * ITEM_SIZE;
        this.startX = -this.stageWidth / 2 - this.itemSize / 2;
        this.startY = this.stageHeight / 2 + this.itemSize / 2 - 250;


        // 初始化网格
        for (let row = 0; row <= this.level_cfg.rows + 1; row++) {
            this.gameGrid[row] = [];
            for (let col = 0; col <= this.level_cfg.cols + 1; col++) {
                this.gameGrid[row][col] = null;
            }
        }

        this.item_types = this.generatePairedTypes(this.level_cfg.totleTypes, lv);

        this.generateGrid(this.level_cfg.rows, this.level_cfg.cols, this.layer_items);

        this.startGame();

    }

    /** 生成网格 */
    private generateGrid(rows: number, cols: number, layer: Node) {
        let index = 0;
        for (let row = 1; row <= rows; row++) {
            for (let col = 1; col <= cols; col++) {
                const type: number = this.item_types[index++];;
                const gameItem: GameItem = this.creatorGameItem(type, row, col);
                this.anima_item_enter_play(gameItem, (row * cols + col) * 0.015);
            }
        }
    }

    /** 生成指定数量的配对类型 */
    private generatePairedTypes(typeCount: number, seed: number): number[] {
        const totalItems = this.level_cfg.rows * this.level_cfg.cols;

        if (totalItems % 2 !== 0) {
            throw new Error("Grid item count must be even for pairing.");
        }

        const pairCount = totalItems / 2;
        const maxTypes = Math.min(typeCount, pairCount, app.manager.game.getAtlasLength());

        const typeCounts: number[] = Array(maxTypes).fill(2);
        let remainingPairs = pairCount - maxTypes;

        // 用种子随机
        const rand = this.seededRandom(seed);

        while (remainingPairs > 0) {
            const i = Math.floor(rand() * maxTypes);
            typeCounts[i] += 2;
            remainingPairs--;
        }

        const types: number[] = [];
        for (let i = 0; i < maxTypes; i++) {
            for (let j = 0; j < typeCounts[i]; j++) {
                types.push(i);
            }
        }

        // 洗牌（用种子随机）
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }

        return types;
    }

    /** 基于种子的伪随机数生成器 */
    private seededRandom(seed: number): () => number {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    /** 创建gameitem */
    private creatorGameItem(type: number, row: number, col: number): GameItem {

        const itemScale = this.stageWidth / this.level_cfg.cols / ITEM_SIZE;
        const node = app.manager.game.getItem();
        const item: GameItem = {
            id: this.itemID++,
            type: type,
            node: node,
            row: row,
            col: col,
            originScale: itemScale,
        };
        this.layer_items.addChild(node);
        this.gameGrid[row][col] = item;
        node.getChildByName('selected').active = false;
        const index = type % app.manager.game.getAtlasLength();
        node.getChildByName('spr').getComponent(Sprite).spriteFrame = app.manager.game.getSpriteFrameByIndex(index);
        node.setScale(itemScale, itemScale);
        const xy = this.gridToNode(row, col);
        node.setPosition(xy[0], xy[1]);
        this.bindEvent(item);

        return item;
    }

    private bindEvent(item: GameItem) {
        const node = item.node;
        node.on(NodeEventType.TOUCH_START, () => this.onItemDown(item), this);
        node.on(NodeEventType.TOUCH_CANCEL, () => this.onItemUp(item), this);
        node.on(NodeEventType.TOUCH_END, () => {
            this.onItemUp(item);
            this.onClickItem(item);
        }, this);
    }

    private clearEvent(item: GameItem) {
        const node = item.node;
        node.off(NodeEventType.TOUCH_START);
        node.off(NodeEventType.TOUCH_CANCEL);
        node.off(NodeEventType.TOUCH_END);
    }


    /** 开始游戏 */
    private startGame() {
        if (!this.hasAnyPair()) {
            this.shuffleUntilSolvable();
        }

        this.game_state = "plaing";
    }

    private onItemDown(item: GameItem) {
        tween(item.node).to(0.1, {
            scale: v3(item.originScale * 0.9, item.originScale * 0.9, 1)
        }).start();
    }

    private onItemUp(item: GameItem) {
        tween(item.node).to(0.1, {
            scale: v3(item.originScale, item.originScale, 1)
        }).start();
    }


    private showSelected(item: GameItem) {
        const select = item.node.getChildByName('selected');
        select.active = true;
        // select.setScale(0, 0, 1);
        // tween(select).to(0.1, { scale: v3(1, 1, 1) }).start();
    }

    private hideSelected(item: GameItem) {
        const select = item.node.getChildByName('selected');
        select.active = false;
        // select.setScale(1, 1, 1);
        // tween(select).to(0.1, { scale: v3(0, 0, 1) }).start();
    }


    private slelectItem: GameItem = null;
    private onClickItem(item: GameItem) {

        this.anima_item_tip_stop();

        if (!this.slelectItem) {
            this.slelectItem = item;
            this.showSelected(item);
        } else {
            if (this.slelectItem.id === item.id) {
                this.hideSelected(this.slelectItem);
                this.slelectItem = null;
            } else {
                this.hideSelected(this.slelectItem);
                if (this.slelectItem.type === item.type) {
                    this.startPairing(this.slelectItem, item);
                    this.slelectItem = null;
                } else {
                    this.slelectItem = item;
                    this.showSelected(this.slelectItem);
                }
            }

        }
    }


    private itemA: GameItem = null;
    private itemB: GameItem = null;
    /** 开始配对 */
    private startPairing(itemA: GameItem, itemB: GameItem) {
        const path = this.tryConnectWithPath(itemA.row, itemA.col, itemB.row, itemB.col);
        if (path) {

            //增加配对次数
            this.pairedCount++;

            this.drawPath(path, 0.3);
            this.removeItem(itemA);
            this.removeItem(itemB);




            //是否出现新的item
            if (this.pairedCount > 3 && randomRangeInt(0, 100) < this.level_cfg.probability) {
                this.itemEnter();
            }

            //移除item后开始移动
            if (this.level_cfg.moveType != "none") {
                const move_func = this.level_cfg.moveType === "shift" ? this.shiftItems.bind(this) : this.slideItems.bind(this);
                let dir = this.level_cfg.moveDir === 4 ? (this.pairedCount + this.pairedStart) % this.level_cfg.moveDir : this.level_cfg.moveDir;
                move_func(dir);
                this.sortItem();
                this.anima_move_play(0.3);
            }

            if (this.passLevel()) {
                this.onGameEnd(1);
                return;
            }

            if (!this.hasAnyPair()) {
                this.scheduleOnce(() => {
                    this.shuffleUntilSolvable();
                    this.anima_refresh_play(0.5);
                }, 0.3);
            }
        }
    }

    /** 游戏结束 */
    private onGameEnd(suc: number) {
        if (this.game_state === "end") return;
        this.game_state = "end";

        tween(this.node).delay(1).call(() => {

            if (suc) {
                app.manager.ui.showToast("恭喜过关！！");
            } else {

                app.manager.ui.showToast("恭喜失败！！");
            }
        }).delay(2).call(() => {
            this.initGame(++this.currentLevel);
        }).start();


    }

    /** 重新排序item层级 */
    private sortItem() {
        let index = 0;
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (item) {
                    item.node.setSiblingIndex(index++);
                }
            }
        }
    }

    /** 出现item */
    private itemEnter() {

        const temp: { row: number, col: number }[] = [];
        for (let row: number = 1; row <= this.level_cfg.rows; row++) {
            for (let col: number = 1; col <= this.level_cfg.cols; col++) {
                if (!this.gameGrid[row][col]) {
                    temp.push({ row: row, col: col });
                }
            }
        }
        if (temp.length <= 0) return;

        let index = randomRangeInt(0, temp.length);
        let pos1 = temp[index];
        temp.splice(index, 1);
        index = randomRangeInt(0, temp.length);
        let pos2 = temp[index];
        const type = this.item_types[randomRangeInt(0, this.item_types.length)];

        const gameItem1 = this.creatorGameItem(type, pos1.row, pos1.col);
        const gameItem2 = this.creatorGameItem(type, pos2.row, pos2.col);

        this.anima_item_enter_play(gameItem1, 0);
        this.anima_item_enter_play(gameItem2, 0);
        this.sortItem();
    }

    private gridToNode(row: number, col: number): number[] {
        return [
            this.startX + col * this.itemSize,
            this.startY - row * this.itemSize,
        ];
    }

    /** 移除item */
    private removeItem(item: GameItem) {
        this.gameGrid[item.row][item.col] = null;
        this.clearEvent(item);
        const node = item.node;
        item.node = null;
        tween(node).to(0.2, { scale: v3(0, 0, 1) }, { easing: 'backInOut' }).call(() => {
            app.manager.game.putItem(node);
        }).start();
    }

    private tryConnect(itemA: GameItem, itemB: GameItem) {
        if (itemA.id === itemB.id) return false;
        if (itemA.type !== itemB.type) return false;
        return this.canLinkStraight(itemA, itemB) || this.canLinkOneCorner(itemA, itemB) || this.canLinkTwoCorner(itemA, itemB);
    }

    private tryConnectWithPath(rowA: number, colA: number, rowB: number, colB: number) {
        const path1 = this.canLinkStraightWithPath(rowA, colA, rowB, colB);
        const path2 = this.canLinkOneCornerWithPath(rowA, colA, rowB, colB);
        const path3 = this.canLinkTwoCornerWithPath(rowA, colA, rowB, colB);
        return path1 || path2 || path3;
    }

    /** 直线连接 */
    private canLinkStraight(itemA: GameItem, itemB: GameItem): boolean {
        const rowA = itemA.row;
        const colA = itemA.col;
        const rowB = itemB.row;
        const colB = itemB.col;

        return this.canLinkStraightWithPath(rowA, colA, rowB, colB)?.length > 0;
    }
    /** 直线连接有路径 */
    private canLinkStraightWithPath(rowA: number, colA: number, rowB: number, colB: number) {
        if (rowA === rowB) {
            const row = rowA;
            const minCol = Math.min(colA, colB);
            const maxCol = Math.max(colA, colB);
            for (let col = minCol + 1; col < maxCol; col++) {
                if (this.gameGrid[row][col]) return null;
            }
            return [
                { row: rowA, col: colA },
                { row: rowB, col: colB }
            ];
        } else if (colA === colB) {
            const col = colA;
            const minRow = Math.min(rowA, rowB);
            const maxRow = Math.max(rowA, rowB);
            for (let row = minRow + 1; row < maxRow; row++) {
                if (this.gameGrid[row][col]) return null;
            }
            return [
                { row: rowA, col: colA },
                { row: rowB, col: colB }
            ];
        } else return null;
    }

    /** 一个拐点 */
    private canLinkOneCorner(itemA: GameItem, itemB: GameItem): boolean {
        const rowA = itemA.row;
        const colA = itemA.col;
        const rowB = itemB.row;
        const colB = itemB.col;

        return this.canLinkOneCornerWithPath(rowA, colA, rowB, colB)?.length > 0;
    }
    /** 一个拐点有路径 */
    private canLinkOneCornerWithPath(rowA: number, colA: number, rowB: number, colB: number): { row: number, col: number }[] | null {
        // 折点1：rowB, colA
        if (
            this.gameGrid[rowB]?.[colA] == null &&
            this.canLinkStraightWithPath(rowA, colA, rowB, colA) &&
            this.canLinkStraightWithPath(rowB, colA, rowB, colB)
        ) {
            return [
                { row: rowA, col: colA },
                { row: rowB, col: colA },
                { row: rowB, col: colB }
            ];
        }

        // 折点2：rowA, colB
        if (
            this.gameGrid[rowA]?.[colB] == null &&
            this.canLinkStraightWithPath(rowA, colA, rowA, colB) &&
            this.canLinkStraightWithPath(rowA, colB, rowB, colB)
        ) {
            return [
                { row: rowA, col: colA },
                { row: rowA, col: colB },
                { row: rowB, col: colB }
            ];
        }

        return null;
    }
    /** 两个拐点 */
    private canLinkTwoCorner(itemA: GameItem, itemB: GameItem): boolean {
        const rowA = itemA.row;
        const colA = itemA.col;
        const rowB = itemB.row;
        const colB = itemB.col;

        return this.canLinkTwoCornerWithPath(rowA, colA, rowB, colB)?.length > 0;
    }
    /** 两个拐点有路径 */
    private canLinkTwoCornerWithPath(rowA: number, colA: number, rowB: number, colB: number): { row: number, col: number }[] | null {
        const directions = [
            { dr: 0, dc: 1 },  // 右
            { dr: 0, dc: -1 }, // 左
            { dr: 1, dc: 0 },  // 下
            { dr: -1, dc: 0 }  // 上
        ];

        for (const dir of directions) {
            let r = rowA + dir.dr;
            let c = colA + dir.dc;

            while (
                r >= 0 && r <= this.level_cfg.rows + 1 &&
                c >= 0 && c <= this.level_cfg.cols + 1 &&
                (!this.gameGrid[r] || !this.gameGrid[r][c])
            ) {
                const path1 = this.canLinkStraightWithPath(rowA, colA, r, c);
                const path2 = this.canLinkOneCornerWithPath(r, c, rowB, colB);
                if (path1 && path2) {
                    return [
                        { row: rowA, col: colA },
                        ...path1.slice(1),
                        ...path2.slice(1)
                    ];
                }

                r += dir.dr;
                c += dir.dc;
            }
        }

        return null;
    }

    /** 是否通关 */
    private passLevel(): boolean {
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                if (this.gameGrid[row][col]) {
                    return false; // 还有未消除的 item
                }
            }
        }
        return true; // 全部消除，通关！
    }

    /** 是否有item可以配对 */
    private hasAnyPair(): boolean {
        for (let rowA = 1; rowA <= this.level_cfg.rows; rowA++) {
            for (let colA = 1; colA <= this.level_cfg.cols; colA++) {
                const itemA = this.gameGrid[rowA][colA];
                if (!itemA) continue;

                for (let rowB = rowA; rowB <= this.level_cfg.rows; rowB++) {
                    const startCol = rowB === rowA ? colA + 1 : 1;
                    for (let colB = startCol; colB <= this.level_cfg.cols; colB++) {
                        const itemB = this.gameGrid[rowB][colB];
                        if (!itemB || itemA.id === itemB.id) continue;

                        if (
                            itemA.type === itemB.type &&
                            (
                                this.canLinkStraight(itemA, itemB) ||
                                this.canLinkOneCorner(itemA, itemB) ||
                                this.canLinkTwoCorner(itemA, itemB)
                            )
                        ) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /** 打乱棋盘 */
    private shuffleUntilSolvable() {
        const positions: { row: number, col: number }[] = [];
        const items: GameItem[] = [];

        // 收集所有非空 item 和它们的位置
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (item) {
                    positions.push({ row, col });
                    items.push(item);
                }
            }
        }

        if (items.length === 0) return;

        let solvable = false;

        while (!solvable) {
            // 打乱 item 顺序
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }

            // 清空棋盘
            for (const pos of positions) {
                this.gameGrid[pos.row][pos.col] = null;
            }

            // 分配 item 到位置
            for (let i = 0; i < positions.length; i++) {
                const item = items[i];
                const pos = positions[i];
                item.row = pos.row;
                item.col = pos.col;
                this.gameGrid[pos.row][pos.col] = item;
            }

            // 判断是否可解
            solvable = this.hasAnyPair();
        }
        this.sortItem();
    }

    /** 通用移动方法 */
    private shiftItems(direction: 0 | 1 | 2 | 3,) {
        switch (direction) {
            case 0: this.shiftItemsRight(); break;
            case 1: this.shiftItemsUp(); break;
            case 2: this.shiftItemsLeft(); break;
            case 3: this.shiftItemsDown(); break;
        }
    }

    /** 向右移动 */
    private shiftItemsRight() {
        const newGrid: (GameItem | null)[][] = [];

        // 初始化新棋盘
        for (let row = 0; row <= this.level_cfg.rows + 1; row++) {
            newGrid[row] = [];
            for (let col = 0; col <= this.level_cfg.cols + 1; col++) {
                newGrid[row][col] = null;
            }
        }
        // 遍历所有 item，向右移动一格
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (!item) continue;
                let newCol = col + 1;
                if (newCol > this.level_cfg.cols) newCol = 1; // 最右边绕回最左边
                item.col = newCol;
                item.row = row;
                newGrid[row][newCol] = item;
            }
        }
        // 替换棋盘
        this.gameGrid = newGrid;
    }

    /** 向左移动 */
    private shiftItemsLeft() {
        const newGrid: (GameItem | null)[][] = [];

        for (let row = 0; row <= this.level_cfg.rows + 1; row++) {
            newGrid[row] = [];
            for (let col = 0; col <= this.level_cfg.cols + 1; col++) {
                newGrid[row][col] = null;
            }
        }

        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (!item) continue;
                let newCol = col - 1;
                if (newCol < 1) newCol = this.level_cfg.cols;
                item.col = newCol;
                item.row = row;
                newGrid[row][newCol] = item;
            }
        }
        this.gameGrid = newGrid;
    }

    /** 向上移动 */
    private shiftItemsUp() {
        const newGrid: (GameItem | null)[][] = [];

        for (let row = 0; row <= this.level_cfg.rows + 1; row++) {
            newGrid[row] = [];
            for (let col = 0; col <= this.level_cfg.cols + 1; col++) {
                newGrid[row][col] = null;
            }
        }

        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (!item) continue;
                let newRow = row - 1;
                if (newRow < 1) newRow = this.level_cfg.rows;

                item.row = newRow;
                item.col = col;
                newGrid[newRow][col] = item;
            }
        }

        this.gameGrid = newGrid;
    }

    /** 向下移动 */
    private shiftItemsDown() {
        const newGrid: (GameItem | null)[][] = [];

        for (let row = 0; row <= this.level_cfg.rows + 1; row++) {
            newGrid[row] = [];
            for (let col = 0; col <= this.level_cfg.cols + 1; col++) {
                newGrid[row][col] = null;
            }
        }

        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (!item) continue;
                let newRow = row + 1;
                if (newRow > this.level_cfg.rows) newRow = 1;

                newGrid[newRow][col] = item;
                item.row = newRow;
                item.col = col;
            }
        }

        this.gameGrid = newGrid;
    }

    /** 滑动通用方法 */
    private slideItems(direction: 0 | 1 | 2 | 3) {
        switch (direction) {
            case 0: this.slideRight(); break;
            case 1: this.slideUp(); break;
            case 2: this.slideLeft(); break;
            case 3: this.slideDown(); break;
        }
    }

    /** 向右滑动 */
    private slideRight() {
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            const newRow: (GameItem | null)[] = [];
            const animItems: GameItem[] = [];

            // 收集非空 item（从右往左）
            for (let col = this.level_cfg.cols; col >= 1; col--) {
                const item = this.gameGrid[row][col];
                if (item) {
                    newRow.unshift(item); // 插入到前面
                    animItems.push(item);
                }
            }

            // 填充剩余空格
            while (newRow.length < this.level_cfg.cols) {
                newRow.unshift(null);
            }

            // 更新棋盘和动画
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = newRow[col - 1];
                this.gameGrid[row][col] = item;
                item && (item.row = row, item.col = col);
            }
        }
    }

    /** 向左滑动 */
    private slideLeft() {
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            const newRow: (GameItem | null)[] = [];
            const animItems: GameItem[] = [];

            // 收集非空 item
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                if (item) {
                    newRow.push(item);
                    animItems.push(item);
                }
            }

            // 填充剩余空格
            while (newRow.length < this.level_cfg.cols) {
                newRow.push(null);
            }

            // 更新棋盘和动画
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = newRow[col - 1];
                this.gameGrid[row][col] = item;
                item && (item.row = row, item.col = col);
            }
        }
    }

    /** 向上滑动 */
    private slideUp() {
        let time = 0;
        for (let col = 1; col <= this.level_cfg.cols; col++) {
            const newCol: (GameItem | null)[] = [];
            const animItems: GameItem[] = [];

            for (let row = 1; row <= this.level_cfg.rows; row++) {
                const item = this.gameGrid[row][col];
                if (item) {
                    newCol.push(item);
                    animItems.push(item);
                }
            }

            while (newCol.length < this.level_cfg.rows) {
                newCol.push(null);
            }

            for (let row = 1; row <= this.level_cfg.rows; row++) {
                const item = newCol[row - 1];
                this.gameGrid[row][col] = item;
                item && (item.row = row, item.col = col);
            }
        }
    }

    /** 向下滑动 */
    private slideDown() {
        for (let col = 1; col <= this.level_cfg.cols; col++) {
            const newCol: (GameItem | null)[] = [];
            const animItems: GameItem[] = [];

            for (let row = this.level_cfg.rows; row >= 1; row--) {
                const item = this.gameGrid[row][col];
                if (item) {
                    newCol.unshift(item);
                    animItems.push(item);
                }
            }

            while (newCol.length < this.level_cfg.rows) {
                newCol.unshift(null);
            }

            for (let row = 1; row <= this.level_cfg.rows; row++) {
                const item = newCol[row - 1];
                this.gameGrid[row][col] = item;
                item && (item.row = row, item.col = col);
            }
        };
    }

    /** 计算当前棋盘所有item的中心点 */
    private getItemsCenter(): Vec3 {
        let minX: number = Number.MAX_VALUE;
        let maxX: number = Number.MIN_VALUE;

        let minY: number = Number.MAX_VALUE;
        let maxY: number = Number.MIN_VALUE;

        this.gameGrid.forEach(rows => {
            rows.forEach(item => {
                if (item) {
                    const x = item.node.position.x;
                    const y = item.node.position.y;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);

                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            });
        });

        // 包围盒中心点
        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        return v3(centerX, centerY, 0);
    }

    private anima_refresh_play(duration: number) {
        const centerPos = this.getItemsCenter();
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                item && this.anima_item_refresh_play(item, duration, centerPos);
            }
        }
    }

    private anima_refresh_play2(duration: number, delay: number = 0.3) {
        const centerPos = this.getItemsCenter();
        const items: GameItem[] = [];
        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                item && items.push(item);
            }
        }

        tween(this.node)
            .call(() => {
                items.forEach(item => {
                    // 中心点到item的方向
                    const dir = item.node.position.clone().subtract(centerPos).normalize();
                    // 第一段目标位置
                    const pos1 = item.node.position.clone().add(dir.clone().multiplyScalar(10 * randomRange(2, 6)));

                    tween(item.node).to(delay, { position: pos1 }).start();
                });
            }).delay(delay)
            .call(() => {
                items.forEach(item => { this.anima_luoxuan_refresh_play(item, duration); });
            }).start();

    }

    private anima_item_refresh_play(item: GameItem, duration: number, center: Vec3) {

        // 中心点
        const centerPos = center.clone();

        // 中心点到item的方向
        const dir = item.node.position.clone().subtract(centerPos).normalize();

        // 第一段目标位置
        const pos1 = item.node.position.clone().add(dir.clone().multiplyScalar(10 * randomRange(2, 6)));

        // 第二段目标位置
        const pos2 = centerPos.add(dir.clone().multiplyScalar(this.itemSize / 2));

        // 最终打乱的位置
        const target = this.gridToNode(item.row, item.col);
        const targetPos = v3(target[0], target[1]);

        tween(item.node)
            .to(duration * 0.7, { position: pos1 }, { easing: 'backOut' })
            .to(duration, { position: pos2 }, { easing: 'sineIn' })
            .to(duration, { position: targetPos }, { easing: 'backIn' })
            .start();
    }

    private anima_luoxuan_refresh_play(item: GameItem, duration: number) {
        const p = this.gridToNode(item.row, item.col);
        const begin = item.node.position.toVec2();
        const end = v2(p[0], p[1]);
        tween(item.node).delay(0.1 * item.col)
            .to(duration, { angle: - 360 },
                {
                    onUpdate: (target: Node, ratio: number) => {
                        const pos = this.luoxuan(ratio * duration, begin.clone(), end.clone(), duration);
                        target.setPosition(pos.x, pos.y);
                    }
                }
            ).set({ angle: 0 }).start();
    }


    private anima_move_play(duration: number) {

        for (let row = 1; row <= this.level_cfg.rows; row++) {
            for (let col = 1; col <= this.level_cfg.cols; col++) {
                const item = this.gameGrid[row][col];
                item && this.anima_item_move_play(item, duration);
            }
        }

    }

    private anima_item_move_play(item: GameItem, duration: number) {
        const pos = this.gridToNode(item.row, item.col);
        tween(item.node).to(duration, { position: v3(pos[0], pos[1]) }, { easing: 'sineIn' }).start();
    }

    private anima_item_enter_play(item: GameItem, delay: number) {
        const opacity: UIOpacity = item.node.getComponent(UIOpacity);
        if (delay > 0) {
            tween(opacity).set({ opacity: 0 }).delay(delay).to(0.3, { opacity: 255 }).start();
            tween(item.node).set({ scale: v3(0, 0, 1) }).delay(delay).to(0.5, { scale: v3(item.originScale, item.originScale, 1) }, { easing: 'backOut' }).start();
        } else {
            tween(opacity).set({ opacity: 0 }).to(0.3, { opacity: 255 }).start();
            tween(item.node).set({ scale: v3(0, 0, 1) }).to(0.5, { scale: v3(item.originScale, item.originScale, 1) }, { easing: 'backOut' }).start();
        }
    }

    /** 提示动效：缩小一半后左右晃动，再恢复并重复 */
    private anima_item_tip_play(itemA: GameItem) {

        const node = itemA.node;
        Tween.stopAllByTarget(node);
        const scale = itemA.originScale * 0.7;
        tween(node).set({ angle: 0 })
            .repeatForever(
                tween()
                    .to(0.3, { scale: v3(scale, scale, 1) }, { easing: 'backIn' })
                    .to(0.1, { angle: 25 })
                    .to(0.1, { angle: -25 })
                    .to(0.1, { angle: 20 })
                    .to(0.1, { angle: -20 })
                    .to(0.1, { angle: 0 }, { easing: 'backInOut' })
                    .to(0.3, { scale: v3(itemA.originScale, itemA.originScale, itemA.originScale) }, { easing: 'backOut' })
                    .delay(0.3)
            )
            .start();
    }

    private anima_item_tip_stop() {
        this.tipItems?.forEach(item => {
            Tween.stopAllByTarget(item.node);
            tween(item.node).to(0.1, { scale: v3(item.originScale, item.originScale, item.originScale), angle: 0 }).start();
        });
        this.tipItems = null;
    }

    /** 绘制路径 */
    private drawPath(path: { row: number, col: number }[], duration: number = 0.3) {
        if (!path || path.length < 2) return;

        let first: { row: number, col: number } = path[0];
        let sec: { row: number, col: number } = path[1];
        const lines: Node[] = [];
        const stars: Node[] = [];
        path.push(null);
        // 绘制路径
        for (let i = 0; i < path.length; i++) {
            if (i === 0) {
                first = path[i];
            } else {
                first = sec;
            }
            sec = path[i + 1];

            if (sec) {
                let line = instantiate(this.prefab_line);
                lines.push(line);
                let pos = this.gridToNode(first.row, first.col);
                this.layer_effect.addChild(line);
                line.setPosition(pos[0], pos[1]);
                let angle = 0;
                let height = 30;
                if (first.col === sec.col) {
                    angle = first.row > sec.row ? 90 : -90;
                    height = Math.abs(first.row - sec.row);
                }
                if (first.row === sec.row) {
                    angle = first.col > sec.col ? 180 : 0;
                    height = Math.abs(first.col - sec.col);
                }

                line.angle = angle;
                line.getComponent(UITransform).width = height * this.itemSize;
            }

        }

        path.forEach(p => {
            if (p) {
                const pos = this.gridToNode(p.row, p.col);
                const star = instantiate(this.prefab_star);
                this.layer_effect.addChild(star);
                stars.push(star);
                star.setPosition(pos[0], pos[1]);
            }
        });

        lines.forEach(line => {
            const uio = line.getComponent(UIOpacity);
            uio.opacity = 0;
            tween(uio)
                .to(duration, { opacity: 255 })
                .delay(0.1)
                .call(() => line.destroy())
                .start();
        });

        stars.forEach((star, index) => {
            const uio = star.getComponent(UIOpacity);
            uio.opacity = 0;
            star.setScale(0, 0, 1);
            tween(uio).to(duration, { opacity: 255 }).start();
            tween(star)
                .to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .delay(0.1)
                .call(() => star.destroy())
                .start();
        });
    }

    private tipItems: [GameItem, GameItem] = null;
    /** 提示 */
    private tip() {
        const items: GameItem[] = [];
        this.gameGrid.forEach(rows => { rows.forEach(col => { col && items.push(col); }); });
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const res = this.tryConnect(items[i], items[j]);
                if (res) {
                    this.tipItems = [items[i], items[j]];
                    return;
                }
            }
        }
    }

    /** 使用道具 */
    private onUseProp(type: number) {
        console.log("使用道具：", type);
        switch (type) {
            case 0: this.useTipProp(); break;
            case 1: break;
            case 2: this.useRefreshProp(); break;
            case 3: break;
        }
    }

    /** 使用提示道具 */
    private useTipProp() {
        if (this.tipItems) return;
        this.tip();
        this.tipItems && this.tipItems.forEach(item => this.anima_item_tip_play(item));
    }

    private useRefreshProp() {

        this.shuffleUntilSolvable();
        this.anima_refresh_play2(1);
    }

    /**
     * 螺旋缓动
     * @param t 进度 0~1
     * @param b 起始位置
     * @param c 目标位置
     * @param d 持续时间（外部用来计算进度）
     * @returns 当前位置
     */
    private luoxuan(elapsed: number, b: Vec2, c: Vec2, d: number): Vec2 {
        // 归一化进度
        const t = Math.min(elapsed / d, 1);

        // 起点到终点的向量和距离
        const dir = c.subtract(b);
        const dis = dir.length();

        // 总圈数（可调）
        const turns = 1;
        const maxTheta = Math.PI * 2 * turns;

        // 当前角度
        const theta = t * maxTheta;

        // 半径与角度保持线性关系
        const r = (dis / maxTheta) * theta;

        const targetRadian = Math.atan2(dir.y, dir.x);
        // 坐标
        const x = r * Math.cos(targetRadian - theta);
        const y = r * Math.sin(targetRadian - theta);

        return v2(x, y).add(b);
    }


    /**
     *         // 播放动画
            this.anima_item_to_list(item, (i) => {
                if (this.elimi_list.length < 3) return;
                this.check_elimination(item.type)?.forEach(e => {
                    app.manager.game.putItem(e.node);
                    e.node = null;
                });
                this.rearrange_list();
                this.elimi_list.forEach(i => this.anima_item_move(i));
            });
     * 
     * 
     * 
     * 
     * 
     */




}