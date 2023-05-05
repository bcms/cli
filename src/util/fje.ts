import type { InstanceFjeWithOptionalCode } from '@becomes/cms-cloud-client';

export function fjeToCode(fje: InstanceFjeWithOptionalCode): string | null {
  if (!fje.code) {
    return null;
  }
  if (fje.external) {
    if (fje.code.raw) {
      return fje.code.raw;
    }
    return null;
  }
  if (fje.code.F) {
    return `
    const { createBcmsFunction } = require('../src/function');
    ${fje.code.imports}
    module.exports.default = createBcmsFunction(async () => {
      ${fje.code.init}
      return {
        config: {
          name: '${fje.name}',
          public: ${fje.code.F.public}
        },
        async handler({request, errorHandler, logger, auth}) {
          ${fje.code.handler}
        }
      }
    })
    `;
  } else if (fje.code.E) {
    return `
    const { createBcmsEvent } = require('../src/event');
    ${fje.code.imports}
    module.exports.default = createBcmsEvent(async () => {
      ${fje.code.init}
      return {
        config: {
          scope: '${fje.code.E.scope}',
          method: '${fje.code.E.method}'
        },
        async handler({scope, method, payload}) {
          ${fje.code.handler}
        }
      }
    })
    `;
  } else if (fje.code.J) {
    return `
    const { createBcmsJob } = require('../src/job');
    ${fje.code.imports}
    module.exports.default = createBcmsJob(async () => {
      ${fje.code.init}
      return {
        cron: {
          minute: '${fje.code.J.minute}',
          hour: '${fje.code.J.hour}',
          dayOfMonth: '${fje.code.J.dayOfMonth}',
          month: '${fje.code.J.month}',
          dayOfWeek: '${fje.code.J.dayOfWeek}',
        },
        async handler() {
          ${fje.code.handler}
        }
      }
    })
    `;
  }
  return null;
}
