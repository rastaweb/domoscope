/**
 * Core types for the domoscope HTML diff engine
 */

/**
 * Represents the type of change in a diff token
 */
export type TokenType = "equal" | "added" | "removed";

/**
 * A single token in a word-level diff, representing a piece of text with its change type
 */
export type Token = {
  type: TokenType;
  text: string;
};

/**
 * Comprehensive statistics about changes detected in a diff operation
 */
export type DiffStats = {
  /** Number of elements with tag or attribute changes */
  totalChangedTags: number;

  /** Number of added text spans/nodes */
  totalAddedTexts: number;

  /** Number of removed text spans/nodes */
  totalRemovedTexts: number;

  /** Number of newly added elements */
  totalAddedTags: number;

  /** Number of removed elements */
  totalRemovedTags: number;

  /** Per-tag statistics for added elements (e.g., { a: 5, img: 2 }) */
  addedTags?: Record<string, number>;

  /** Per-tag statistics for removed elements (e.g., { a: 2, span: 10 }) */
  removedTags?: Record<string, number>;

  /** Per-tag statistics for changed elements with detailed attribute info */
  changedTags?: Record<
    string,
    {
      count: number;
      changedAttributes: string[];
    }
  >;
};
