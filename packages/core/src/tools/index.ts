import listContainerFiles from './listContainerFiles';
import readFileContents from './readFileContents';
import readTypesIndex from './readTypesIndex';

export const tools = {
  readTypesIndex,
  readFileContents,
  listContainerFiles,
};

export type AnimaTools = typeof tools;
