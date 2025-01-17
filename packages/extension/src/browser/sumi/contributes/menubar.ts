import { Injectable, Autowired } from '@opensumi/di';
import { IMenuRegistry } from '@opensumi/ide-core-browser/lib/menu/next';
import { LifeCyclePhase, IJSONSchema, localize } from '@opensumi/ide-core-common';

import { VSCodeContributePoint, Contributes, LifeCycle } from '../../../common';
import { IContributeMenubarItem } from '../../../common/sumi/extension';

export type KtMenubarsSchema = IContributeMenubarItem[];

@Injectable()
@Contributes('menubars')
@LifeCycle(LifeCyclePhase.Starting)
export class MenubarsContributionPoint extends VSCodeContributePoint<KtMenubarsSchema> {
  @Autowired(IMenuRegistry)
  private readonly menuRegistry: IMenuRegistry;

  static schema: IJSONSchema = {
    description: localize('sumiContributes.menubars'),
    type: 'array',
    items: {
      type: 'object',
      required: ['id', 'title'],
      defaultSnippets: [
        {
          body: {
            id: '${1}',
            title: '${2}',
          },
        },
      ],
      properties: {
        id: {
          type: 'string',
          description: localize('sumiContributes.menubars.id'),
        },
        title: {
          type: 'string',
          description: localize('sumiContributes.menubars.title'),
        },
        order: {
          type: 'number',
          description: localize('sumiContributes.menubars.order'),
        },
        nativeRole: {
          type: 'string',
          description: localize('sumiContributes.menubars.order'),
        },
      },
    },
  };

  contribute() {
    for (const contrib of this.contributesMap) {
      const { extensionId, contributes } = contrib;
      for (const menubarItem of contributes) {
        this.addDispose(
          this.menuRegistry.registerMenubarItem(menubarItem.id, {
            label: this.getLocalizeFromNlsJSON(menubarItem.title, extensionId),
            order: menubarItem.order,
            nativeRole: menubarItem.nativeRole,
          }),
        );
      }
    }
  }
}
