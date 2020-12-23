import { IDebugSessionManager, DEBUG_REPORT_NAME } from '../../common';
import { Autowired, Injectable } from '@ali/common-di';
import { DebugSessionManager } from '../debug-session-manager';
import { DisposableCollection, Emitter, Event, ILogger, IReporterService } from '@ali/ide-core-browser';
import throttle = require('lodash.throttle');
import { DebugWatchRoot, DebugWatchNode } from '../tree/debug-tree-node.define';
import { DEBUG_COMMANDS } from '../debug-contribution';

export class DebugWatchData {
  getRoot: () => Promise<DebugWatchRoot | void>;
  updateWatchExpressions: (data: string[]) => Promise<void>;
  addWatchExpression: (value: string) => void;
  clear: () => Promise<void>;
  onDidChange: Event<void>;
  onDidVariableChange: Event<void>;
  onDidExpressionChange: Event<void>;
}

@Injectable()
export class DebugWatch implements DebugWatchData {

  @Autowired(IDebugSessionManager)
  protected readonly manager: DebugSessionManager;

  @Autowired(IReporterService)
  protected readonly reporterService: IReporterService;

  @Autowired(ILogger)
  logger: ILogger;

  protected readonly toDispose = new DisposableCollection();

  protected fireDidChange: any = throttle(() => this.onDidChangeEmitter.fire(), 50);
  protected fireVariableChange: any = throttle(() => this.onDidVariableChangeEmitter.fire(), 50);
  protected fireExpressionChange: any = throttle(() => this.onDidExExpressionChangeEmitter.fire(), 50);

  private _expressions: string[] = [];
  private _root: DebugWatchRoot;

  whenReady: Promise<any>;

  private onDidChangeEmitter: Emitter<void> = new Emitter();
  private onDidVariableChangeEmitter: Emitter<void> = new Emitter();
  private onDidExExpressionChangeEmitter: Emitter<void> = new Emitter();

  constructor() {
    this.whenReady = this.init();
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  get onDidVariableChange(): Event<void> {
    return this.onDidVariableChangeEmitter.event;
  }

  get onDidExpressionChange(): Event<void> {
    return this.onDidExExpressionChangeEmitter.event;
  }

  async getRoot() {
    const presets: DebugWatchNode[] = [];
    const root = new DebugWatchRoot(this.manager.currentSession);
    for (const expression of this._expressions) {
      const node = new DebugWatchNode(this.manager.currentSession, expression, root);
      // 执行运算以获取节点信息
      await node.evaluate();
      presets.push(node);
    }
    root.updatePresetChildren(presets);
    this._root = root;
    return this._root;
  }

  async init() {
    this.toDispose.push(this.manager.onDidStopDebugSession(() => {
      this.fireDidChange();
    }));
    this.toDispose.push(this.manager.onDidDestroyDebugSession(() => {
      this.fireDidChange();
    }));
    this.toDispose.push(this.manager.onDidChangeActiveDebugSession(() => {
      const thread = this.manager.currentThread;
      const session = this.manager.currentSession;
      if (thread) {
        thread.onDidChanged(() => {
          this.fireVariableChange();
        });
      }
      if (session) {
        session.onVariableChange(() => {
          this.fireVariableChange();
        });
      }
    }));
  }

  async clear() {
    this._expressions = [];
    this.fireExpressionChange();
    this.fireDidChange();
  }

  async updateWatchExpressions(data: string[]) {
    this._expressions = data;
  }

  addWatchExpression(value: string) {
    this.reporterService.point(DEBUG_REPORT_NAME?.DEBUG_WATCH, DEBUG_COMMANDS.ADD_WATCHER.id, { value });
    const index = this._expressions.indexOf(value);
    if (index === -1) {
      this._expressions.push(value);
      this.fireExpressionChange();
    }
  }

  renameWatchExpression(value: string, newValue: string) {
    const index = this._expressions.indexOf(value);
    if (index >= 0) {
      this._expressions.splice(index, 1, newValue);
    }
    this.fireExpressionChange();
  }

  removeWatchExpression(value: string) {
    const index = this._expressions.indexOf(value);
    if (index >= 0) {
      this._expressions.splice(index, 1);
    }
    this.fireExpressionChange();
  }
}
