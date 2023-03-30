export const FunctionTemplates = {
  create(data: {name: string, public: boolean}): string {
    return `
import {createBcmsFunction} from '@becomes/cms-backend/function'

export default createBcmsFunction(async () => {
  return {
    config: {
      name: '${data.name}',
      public: ${data.public},
    },
    async handler() {
      // ---------------------------
      // Function logic goes here...
      // ---------------------------
    },
  };
});
    `;
  },
};
