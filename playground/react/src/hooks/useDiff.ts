import { getCustomDiffStats } from '@rastaweb/domoscope';
export const useDiff = (oldContent: string, newContent: string) => {
  const { diffResult, stats } = getCustomDiffStats(oldContent, newContent);
  return { diffResult, stats };
};
