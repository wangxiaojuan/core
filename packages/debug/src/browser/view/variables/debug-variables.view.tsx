import * as React from 'react';
import { useInjectable, getIcon } from '@ali/ide-core-browser';
import { observer } from 'mobx-react-lite';
import { ViewState } from '@ali/ide-core-browser';
import { INodeRendererProps, ClasslistComposite, IRecycleTreeHandle, TreeNodeType, RecycleTree, INodeRendererWrapProps, TreeModel, CompositeTreeNode } from '@ali/ide-components';
import { ExpressionContainer, ExpressionNode, DebugVariableContainer, DebugVariable } from '../../tree/debug-tree-node.define';
import { DebugVariablesModelService } from './debug-variables-tree.model.service';
import * as styles from './debug-variables.module.less';
import * as cls from 'classnames';
import { Loading } from '@ali/ide-core-browser/lib/components/loading';

export const DEBUG_VARIABLE_TREE_FIELD_NAME = 'DEBUG_VARIABLE_TREE_FIELD';

export const DebugVariableView = observer(({
  viewState,
}: React.PropsWithChildren<{ viewState: ViewState }>) => {
  const DEBUG_VARIABLE_ITEM_HEIGHT = 22;

  const { width, height } = viewState;

  const wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  const [model, setModel] = React.useState<TreeModel>();

  const debugVariablesModelService = useInjectable<DebugVariablesModelService>(DebugVariablesModelService);

  React.useEffect(() => {
    debugVariablesModelService.onDidUpdateTreeModel(async (model: TreeModel) => {
      if (model) {
        await debugVariablesModelService.treeModel!.root.ensureLoaded();
      }
      setModel(model);
    });
    return () => {
      debugVariablesModelService.removeNodeDecoration();
    };
  }, []);

  const handleTreeReady = (handle: IRecycleTreeHandle) => {
    debugVariablesModelService.handleTreeHandler({
      ...handle,
      getModel: () => model!,
      hasDirectFocus: () => wrapperRef.current === document.activeElement,
    });
  };

  const handleTwistierClick = (ev: React.MouseEvent, item: ExpressionNode | ExpressionContainer, type: TreeNodeType) => {
    // 阻止点击事件冒泡
    ev.stopPropagation();

    const { handleTwistierClick } = debugVariablesModelService;
    if (!item) {
      return;
    }
    handleTwistierClick(item, type);
  };

  const handlerContextMenu = (ev: React.MouseEvent, node: ExpressionNode | ExpressionContainer) => {
    const { handleContextMenu } = debugVariablesModelService;
    handleContextMenu(ev, node);
  };

  const handleOuterContextMenu = (ev: React.MouseEvent) => {
    const { handleContextMenu } = debugVariablesModelService;
    // 空白区域右键菜单
    handleContextMenu(ev);
  };

  const handleOuterClick = (ev: React.MouseEvent) => {
    // 空白区域点击，取消焦点状态
    const { enactiveNodeDecoration } = debugVariablesModelService;
    enactiveNodeDecoration();
  };

  const handleOuterBlur = (ev: React.FocusEvent) => {
    // 空白区域点击，取消焦点状态
    const { enactiveNodeDecoration } = debugVariablesModelService;
    enactiveNodeDecoration();
  };

  const renderContent = () => {
    if (!model) {
      return <span></span>;
    } else {
      return <RecycleTree
        height={height}
        width={width}
        itemHeight={DEBUG_VARIABLE_ITEM_HEIGHT}
        onReady={handleTreeReady}
        model={model!}
        placeholder={() => {
          return <span></span>;
        }}
      >
        {(props: INodeRendererWrapProps) => {
          const decorations = debugVariablesModelService.decorations.getDecorations(props.item as any);
          return <DebugVariableNode
            item={props.item}
            itemType={props.itemType}
            decorations={decorations}
            onClick={handleTwistierClick}
            onTwistierClick={handleTwistierClick}
            onContextMenu={handlerContextMenu}
            defaultLeftPadding={8}
            leftPadding={8}
          />;
        }}
      </RecycleTree>;
    }
  };

  return <div
    className={styles.debug_variables_container}
    tabIndex={-1}
    ref={wrapperRef}
    onContextMenu={handleOuterContextMenu}
    onClick={handleOuterClick}
    onBlur={handleOuterBlur}
    data-name={DEBUG_VARIABLE_TREE_FIELD_NAME}
  >
    {renderContent()}
  </div>;
});

export interface IDebugVariableNodeProps {
  item: any;
  defaultLeftPadding?: number;
  leftPadding?: number;
  decorations?: ClasslistComposite;
  onClick: (ev: React.MouseEvent, item: ExpressionNode | ExpressionContainer, type: TreeNodeType) => void;
  onTwistierClick: (ev: React.MouseEvent, item: ExpressionNode | ExpressionContainer, type: TreeNodeType) => void;
  onContextMenu?: (ev: React.MouseEvent, item: ExpressionNode | ExpressionContainer, type: TreeNodeType) => void;
}

export type EditorNodeRenderedProps = IDebugVariableNodeProps & INodeRendererProps;

export const DebugVariableNode: React.FC<EditorNodeRenderedProps> = ({
  item,
  decorations,
  defaultLeftPadding,
  leftPadding,
  onClick,
  onTwistierClick,
  onContextMenu,
  itemType,
}: EditorNodeRenderedProps) => {

  const handleClick = (ev: React.MouseEvent) => {
    onClick(ev, item, CompositeTreeNode.is(item) ? TreeNodeType.CompositeTreeNode : TreeNodeType.TreeNode);
  };

  const handleContextMenu = (ev: React.MouseEvent) => {
    if (ev.nativeEvent.which === 0) {
      return;
    }
    if (itemType === TreeNodeType.TreeNode || itemType === TreeNodeType.CompositeTreeNode) {
      onContextMenu && onContextMenu(ev, item as ExpressionNode, itemType);
    }
  };

  const paddingLeft = `${(defaultLeftPadding || 8) + (item.depth || 0) * (leftPadding || 0) + (ExpressionContainer.is(item) ? 0 : 16)}px`;

  const editorNodeStyle = {
    height: DEBUG_VARIABLE_TREE_NODE_HEIGHT,
    lineHeight: `${DEBUG_VARIABLE_TREE_NODE_HEIGHT}px`,
    paddingLeft,
  } as React.CSSProperties;

  const renderDisplayName = (node: ExpressionContainer | ExpressionNode) => {
    return <div
      className={cls(styles.debug_variables_node_segment, styles.debug_variables_node_display_name, styles.debug_variables_variable, (node as DebugVariable).description ? styles.name : '')}
    >
      {node.name}
      {(node as DebugVariable).description ? ':' : ''}
    </div>;
  };

  const renderDescription = (node: ExpressionContainer | ExpressionNode) => {
    const booleanRegex = /^true|false$/i;
    const stringRegex = /^(['"]).*\1$/;
    const description = (node as DebugVariableContainer).description ? (node as DebugVariableContainer).description.replace('function', 'f') : '';
    const addonClass = [styles.debug_variables_variable];
    if (item.variableType === 'number' || item.variableType === 'boolean' || item.variableType === 'string') {
      addonClass.push(styles[item.variableType]);
    } else if (!isNaN(+description)) {
      addonClass.push(styles.number);
    } else if (booleanRegex.test(description)) {
      addonClass.push(styles.boolean);
    } else if (stringRegex.test(description)) {
      addonClass.push(styles.string);
    }
    return <div className={cls(styles.debug_variables_node_segment_grow, styles.debug_variables_node_description, ...addonClass)}>
      {description}
    </div>;
  };

  const renderStatusTail = () => {
    return <div className={cls(styles.debug_variables_node_segment, styles.debug_variables_node_tail)}>
      {renderBadge()}
    </div>;
  };

  const renderBadge = () => {
    return <div className={styles.debug_variables_node_status}>
      {item.badge}
    </div>;
  };

  const getItemTooltip = () => {
    const tooltip = item.tooltip;
    return tooltip;
  };

  const renderToggle = (node: ExpressionContainer, clickHandler: any) => {
    const handleTwiceClick = (ev: React.MouseEvent) => {
      clickHandler(ev, node, itemType);
    };
    if (decorations && decorations?.classlist.indexOf(styles.mod_loading) > -1) {
      return <Loading />;
    }
    return <div
      onClick={handleTwiceClick}
      className={cls(
        styles.debug_variables_node_segment,
        styles.expansion_toggle,
        getIcon('right'),
        { [`${styles.mod_collapsed}`]: !(node as ExpressionContainer).expanded },
      )}
    />;

  };

  const renderTwice = (item) => {
    if (CompositeTreeNode.is(item)) {
      return renderToggle(item as ExpressionContainer, onTwistierClick);
    }
  };

  return (
    <div
      key={item.id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={getItemTooltip()}
      className={cls(
        styles.debug_variables_node,
        decorations ? decorations.classlist : null,
      )}
      style={editorNodeStyle}
      data-id={item.id}
    >
      <div className={cls(styles.debug_variables_node_content)}>
        {renderTwice(item)}
        <div
          className={styles.debug_variables_node_overflow_wrap}
        >
          {renderDisplayName(item)}
          {renderDescription(item)}
        </div>
        {renderStatusTail()}
      </div>
    </div>
  );
};

export const DEBUG_VARIABLE_TREE_NODE_HEIGHT = 22;