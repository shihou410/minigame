import { Node } from 'cc';
import BaseController from '../../../extensions/app/assets/base/BaseController';

/** 道具类型 */
export enum PropType {
    /** 提示 */
    TS = 1 << 0,
    /** 消除 */
    XC = 1 << 1,
    /** 刷新 */
    SX = 1 << 2,
    /** 撤回 */
    CH = 1 << 3,
}

export class GameController extends BaseController<GameController, {
    // 定义了事件，并同时定义参数列表和返回值
    UseProp: (type: PropType, node: Node) => void;
    NextLevel: (level: number) => void;
    GameStart: (level: number) => void;
    GameEnd: (suc: boolean) => void;
    RefreshLevel: (level: number) => void;
    GamePause: () => void;
    GameRestore: () => void;
}>() {
    // Controller中发射事件, UI中监听事件:
    // 1、UI中需要将 「extends BaseView」 改为=> 「extends BaseView.bindController(GameController)」
    // 2、UI中使用「this.controller.on/once」监听事件, 使用「this.controller.emit」发射事件, 使用「this.controller.off/targetOff」取消监听事件
    // 3、在外部(无法使用this.controller的地方)可以通过「app.controller.xxx」来调用对外导出的方法, 比如下面的refresh方法
    useProp(type: PropType, node: Node) { this.emit(GameController.Event.UseProp, type, node); }
    gameEnd(suc: boolean) { this.emit(GameController.Event.GameEnd, suc); }
    nextLevel(level: number) { this.emit(GameController.Event.NextLevel, level); }
    refreshLevel(level: number) { this.emit(GameController.Event.RefreshLevel, level); }
    gamePause() { this.emit(GameController.Event.GamePause); }
    gameRestore() { this.emit(GameController.Event.GameRestore); }
    gameStart(level: number) { this.emit(GameController.Event.GameStart, level); }
}