export interface PropV2QuillOption {
  insert: string;
  attributes?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    list?: string;
    indent?: number;
    link?: string;
    header?: number;
  };
}
