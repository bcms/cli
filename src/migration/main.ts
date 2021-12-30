import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createFS } from '@banez/fs';
import { ChildProcess } from '@banez/child_process';
import type { Args } from '../util';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';
import {prompt} from 'inquirer'
import {
  ApiKeyV2,
  ApiKeyV3,
  GroupV2,
  GroupV3,
  IdCounterV3,
  LanguageV2,
  LanguageV3,
  MediaV2,
  MediaV3,
  MigrationConfig,
  PropV2,
  PropV2EntryPointer,
  PropV2Enum,
  PropV2GroupPointer,
  PropV2Type,
  PropV3,
  PropV3EntryPointerData,
  PropV3EnumData,
  PropV3GroupPointerData,
  PropV3MediaData,
  PropV3Type,
  TemplateV2,
  TemplateV3,
  WidgetV2,
  WidgetV3,
} from '../types';
import {
  Terminal,
  createTerminalProgressBar,
  createTerminalList,
  createTerminalTitle,
} from '../terminal';

export class Migration {
  private static basePath = path.join(process.cwd(), 'migration');
  private static fs = createFS({
    base: this.basePath,
  });
  private static collectionNames = {
    v2: [
      '_api_keys',
      '_languages',
      '_medias',
      '_statuses',
      '_users',
      '_groups',
      '_templates',
      '_widgets',
      '_entries',
    ],
    v2v3Map: {
      _api_keys: '_api_keys',
      _entries: '_entries',
      _groups: '_groups',
      _languages: '_languages',
      _medias: '_medias',
      _statuses: '_statuses',
      _templates: '_templates',
      _users: '_users',
      _widgets: '_widgets',
    },
    v3: [
      '_api_keys',
      '_changes',
      '_colors',
      '_entries',
      '_groups',
      '_id_counters',
      '_languages',
      '_medias',
      '_statuses',
      '_tags',
      '_template_organizers',
      '_templates',
      '_users',
      '_widgets',
    ],
  };

  private static getPrefix({
    args,
    migrationConfig,
  }: {
    args: Args;
    migrationConfig: MigrationConfig;
  }): [string, string] {
    const prfx = args.collectionPrfx
      ? args.collectionPrfx
      : migrationConfig.database &&
        migrationConfig.database.from &&
        migrationConfig.database.from.collectionPrefix
      ? migrationConfig.database.from.collectionPrefix
      : 'bcms';
    const toPrfx = args.toCollectionPrfx
      ? args.toCollectionPrfx
      : migrationConfig.database &&
        migrationConfig.database.to &&
        migrationConfig.database.to.collectionPrefix
      ? migrationConfig.database.to.collectionPrefix
      : prfx;
    return [prfx, toPrfx];
  }
  static get media(): {
    v2(data: { inputMedia: MediaV2; v2Media: MediaV2[] }): MediaV3;
  } {
    return {
      v2({ inputMedia, v2Media }) {
        const output: MediaV3 = {
          _id: inputMedia._id.$oid,
          createdAt: inputMedia.createdAt,
          updatedAt: inputMedia.updatedAt,
          altText: '',
          caption: '',
          __v: 0,
          hasChildren: inputMedia.hasChildren,
          height: -1,
          width: -1,
          isInRoot: false,
          mimetype: inputMedia.mimetype,
          name: inputMedia.name,
          parentId: '',
          size: inputMedia.size,
          type: inputMedia.type as never,
          userId: inputMedia.userId,
        };
        if (inputMedia.isInRoot) {
          output.isInRoot = true;
        } else {
          const pathParts = inputMedia.path.split('/').slice(1);
          if (pathParts.length > 0) {
            const parentName = pathParts[pathParts.length - 1];
            const parentMedia = v2Media.find((e) => e.name === parentName);
            if (parentMedia) {
              output.parentId = parentMedia._id.$oid;
            } else {
              output.isInRoot = true;
            }
          } else {
            output.isInRoot = true;
          }
        }
        return output;
      },
    };
  }
  static get props(): {
    v2(data: { inputProps: PropV2[]; v2Media: MediaV2[] }): PropV3[];
  } {
    return {
      v2({ inputProps, v2Media }) {
        const output: PropV3[] = [];
        for (let i = 0; i < inputProps.length; i++) {
          const inputProp = inputProps[i];
          const outputProp: PropV3 = {
            array: inputProp.array,
            id: uuidv4(),
            label: inputProp.label,
            name: inputProp.name,
            required: inputProp.required,
            type: PropV3Type.STRING,
            defaultData: [],
          };
          if (inputProp.type === PropV2Type.STRING) {
            outputProp.type = PropV3Type.STRING;
            outputProp.defaultData = inputProp.value as string[];
          } else if (inputProp.type === PropV2Type.NUMBER) {
            outputProp.type = PropV3Type.NUMBER;
            outputProp.defaultData = inputProp.value as number[];
          } else if (inputProp.type === PropV2Type.BOOLEAN) {
            outputProp.type = PropV3Type.BOOLEAN;
            outputProp.defaultData = inputProp.value as boolean[];
          } else if (inputProp.type === PropV2Type.DATE) {
            outputProp.type = PropV3Type.DATE;
            outputProp.defaultData = inputProp.value as number[];
          } else if (inputProp.type === PropV2Type.ENTRY_POINTER) {
            outputProp.type = PropV3Type.ENTRY_POINTER;
            const value = inputProp.value as PropV2EntryPointer;
            outputProp.defaultData = {
              templateId: value.templateId,
              entryIds: value.entryIds,
              displayProp: 'title',
            } as PropV3EntryPointerData;
          } else if (inputProp.type === PropV2Type.ENUMERATION) {
            outputProp.type = PropV3Type.ENUMERATION;
            const value = inputProp.value as PropV2Enum;
            outputProp.defaultData = {
              items: value.items,
              selected: value.selected,
            } as PropV3EnumData;
          } else if (inputProp.type === PropV2Type.GROUP_POINTER) {
            outputProp.type = PropV3Type.GROUP_POINTER;
            const value = inputProp.value as PropV2GroupPointer;
            outputProp.defaultData = {
              _id: value._id,
            } as PropV3GroupPointerData;
          } else if (inputProp.type === PropV2Type.MEDIA) {
            outputProp.type = PropV3Type.MEDIA;
            const value = inputProp.value as string[];
            const defaultData: PropV3MediaData[] = [];
            for (let j = 0; j < value.length; j++) {
              const mediaPath = value[j];
              const media = v2Media.find(
                (e) => `${e.path}/${e.name}` === mediaPath,
              );
              if (media) {
                defaultData.push(media._id.$oid);
              }
            }
            outputProp.defaultData = defaultData;
          }
          output.push(outputProp);
        }
        return output;
      },
    };
  }
  static get transform(): {
    v2({
      args,
    }: {
      args: Args;
      migrationConfig: MigrationConfig;
    }): Promise<void>;
  } {
    return {
      async v2({ args, migrationConfig }) {
        const idc: { [name: string]: IdCounterV3 } = {
          groups: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'groups',
            name: 'Groups',
            __v: 0,
          },
          colors: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'colors',
            name: 'Colors',
            __v: 0,
          },
          entries: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'entries',
            name: 'Entires',
            __v: 0,
          },
          templates: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'templates',
            name: 'Templates',
            __v: 0,
          },
          orgs: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'orgs',
            name: 'Organizations',
            __v: 0,
          },
          tags: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'tags',
            name: 'Tags',
            __v: 0,
          },
          widgets: {
            _id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count: 1,
            forId: 'widgets',
            name: 'Widgets',
            __v: 0,
          },
        };
        const terminalListItems: {
          [name: string]: {
            name: string;
            maker: string;
          };
        } = {};
        for (let i = 0; i < Migration.collectionNames.v2.length; i++) {
          const item = Migration.collectionNames.v2[i];
          terminalListItems[item] = {
            name: item
              .split('_')
              .filter((e) => e)
              .map(
                (e) =>
                  e.substring(0, 1).toUpperCase() +
                  e.substring(1).toLocaleLowerCase(),
              )
              .join(' '),
            maker: '♺',
          };
        }
        function updateTerminalList() {
          terminalList.update({
            state: {
              items: Object.keys(terminalListItems).map((name) => {
                const item = terminalListItems[name];
                return {
                  text: item.name + ' ' + item.maker,
                };
              }),
            },
          });
          Terminal.render();
        }
        function updateProgress(
          progressName: string,
          itemsLength: number,
          currentItem: number,
        ) {
          const progress = (100 / itemsLength) * (currentItem + 1);
          progressBar.update({
            state: {
              name: progressName,
              progress,
            },
          });
          Terminal.render();
        }
        const terminalList = createTerminalList({
          state: {
            items: Object.keys(terminalListItems).map((name) => {
              const item = terminalListItems[name];
              return {
                text: item.name + ' ' + item.maker,
              };
            }),
          },
        });
        const progressBar = createTerminalProgressBar({
          state: {
            name: 'Test',
            progress: 0,
          },
        });
        Terminal.pushComponent(
          {
            name: 'list',
            component: terminalList,
          },
          {
            name: 'progress',
            component: progressBar,
          },
        );
        const [fromPrfx, toPrfx] = Migration.getPrefix({
          args,
          migrationConfig,
        });
        const inputFs = createFS({
          base: path.join(Migration.basePath, 'v2_data'),
        });
        const outputFs = createFS({
          base: path.join(Migration.basePath, 'v3_data'),
        });
        for (let i = 0; i < Migration.collectionNames.v2.length; i++) {
          const cName = Migration.collectionNames.v2[i];
          let dbData = [];
          if (await inputFs.exist(`${fromPrfx}${cName}.json`, true)) {
            dbData = JSON.parse(
              await inputFs.readString(`${fromPrfx}${cName}.json`),
            );
          }
          const progress = 0;
          const progressName = `[${i + 1}/${
            Migration.collectionNames.v2.length
          }] ${terminalListItems[cName].name}`;
          progressBar.update({
            state: {
              name: progressName,
              progress,
            },
          });
          Terminal.render();

          switch (cName) {
            case '_api_keys':
              {
                const items = dbData as ApiKeyV2[];
                const output: ApiKeyV3[] = [];
                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push({
                    _id: item._id.$oid,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    access: item.access,
                    blocked: item.blocked,
                    desc: item.desc,
                    name: item.name,
                    secret: item.secret,
                    userId: item.userId,
                    __v: 0,
                  });
                  updateProgress(progressName, items.length, j);
                }
                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
            case '_languages':
              {
                const items = dbData as LanguageV2[];
                const output: LanguageV3[] = [];
                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push({
                    _id: item._id.$oid,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    code: item.code,
                    def: item.def,
                    name: item.name,
                    nativeName: item.nativeName,
                    userId: item.userId,
                    __v: 0,
                  });
                  updateProgress(progressName, items.length, j);
                }
                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
            case '_medias':
              {
                const items = dbData as MediaV2[];
                const output: MediaV3[] = [];
                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push(
                    Migration.media.v2({ inputMedia: item, v2Media: items }),
                  );
                  updateProgress(progressName, items.length, j);
                }
                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
            case '_groups':
              {
                const items = dbData as GroupV2[];
                const output: GroupV3[] = [];
                idc.groups.count = items.length;

                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push({
                    _id: item._id.$oid,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    cid: (j + 1).toString(16),
                    desc: item.desc,
                    label: item.label,
                    name: item.name,
                    props: Migration.props.v2({
                      inputProps: item.props,
                      v2Media: JSON.parse(
                        await inputFs.readString(`${fromPrfx}${cName}.json`),
                      ),
                    }),
                    __v: 0,
                  });
                }

                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
            case '_templates':
              {
                const items = dbData as TemplateV2[];
                const output: TemplateV3[] = [];
                idc.templates.count = items.length;

                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push({
                    _id: item._id.$oid,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    cid: (j + 1).toString(16),
                    desc: item.desc,
                    label: item.label,
                    name: item.name,
                    singleEntry: false,
                    userId: item.userId,
                    props: Migration.props.v2({
                      inputProps: item.props,
                      v2Media: JSON.parse(
                        await inputFs.readString(`${fromPrfx}${cName}.json`),
                      ),
                    }),
                    __v: 0,
                  });
                }

                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
            case '_widgets':
              {
                const items = dbData as WidgetV2[];
                const output: WidgetV3[] = [];
                idc.widgets.count = items.length;

                for (let j = 0; j < items.length; j++) {
                  const item = items[j];
                  output.push({
                    _id: item._id.$oid,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    cid: (j + 1).toString(16),
                    desc: item.desc,
                    label: item.label,
                    name: item.name,
                    // TODO: User image pointer
                    previewImage: item.previewImage,
                    previewScript: item.previewScript,
                    previewStyle: item.previewStyle,
                    props: Migration.props.v2({
                      inputProps: item.props,
                      v2Media: JSON.parse(
                        await inputFs.readString(`${fromPrfx}${cName}.json`),
                      ),
                    }),
                    __v: 0,
                  });
                }

                await outputFs.save(
                  `${toPrfx}${Migration.collectionNames.v2v3Map[cName]}.json`,
                  JSON.stringify(output, null, '  '),
                );
              }
              break;
          }
          terminalListItems[cName].maker = '✓';
          updateTerminalList();
        }
        await outputFs.save(
          `${toPrfx}_id_counters.json`,
          JSON.stringify(
            Object.keys(idc).map((e) => e),
            null,
            '  ',
          ),
        );
      },
    };
  }
  static get pull(): {
    v2({
      args,
    }: {
      args: Args;
      migrationConfig: MigrationConfig;
    }): Promise<void>;
  } {
    return {
      async v2({ args, migrationConfig }) {
        Terminal.pushComponent({
          name: 'title',
          component: createTerminalTitle({
            state: {
              text: 'Migration V2 - Pulling data',
            },
          }),
        });
        const [prfx] = Migration.getPrefix({ args, migrationConfig });
        const url = args.dbUrl
          ? args.dbUrl
          : migrationConfig.database &&
            migrationConfig.database.from &&
            migrationConfig.database.from.url
          ? migrationConfig.database.from.url
          : '';
        if (!url) {
          throw Error(
            'Missing MongoDB database URL. Provide it in configuration' +
              ' file or in arguments.',
          );
        }
        const outputDir = 'v2_data';
        if (!(await Migration.fs.exist(outputDir))) {
          await Migration.fs.save([outputDir, 'tmp.txt'], ' ');
          await Migration.fs.deleteFile([outputDir, 'tmp.txt']);
        }
        /**
         * Check if mongoexport CLI is installed on the system
         */
        {
          const exo: ChildProcessOnChunkHelperOutput = {
            err: '',
            out: '',
          };
          await ChildProcess.advancedExec(['mongoexport', '--version'], {
            onChunk: ChildProcess.onChunkHelper(exo),
            doNotThrowError: true,
          }).awaiter;
          if (exo.err) {
            console.error(exo.err);
            throw Error(
              'It appears that "mongoexport" command is not installed on your system.',
            );
          }
        }
        for (let i = 0; i < Migration.collectionNames.v2.length; i++) {
          const cName = Migration.collectionNames.v2[i];
          await ChildProcess.spawn('mongoexport', [
            '--uri',
            url,
            '--collection',
            `${prfx}${cName}`,
            '--type',
            'json',
            '--out',
            path.join(Migration.basePath, outputDir, `${prfx}${cName}.json`),
            '--jsonArray',
            '--pretty',
          ]);
        }

        const pullMedia = (await prompt<{yes: boolean}>([
          {
            name: 'yes',
            message: ''
          }
        ])).yes

        console.log('All collections pulled.');
      },
    };
  }
}
