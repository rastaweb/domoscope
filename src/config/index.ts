/**
 * Configuration management for domoscope diff operations
 * Implements Dependency Inversion Principle by providing abstractions for configuration
 */

import type {
  CompareOptions,
  ExtendedCompareOptions,
  StyleConfig,
  TrackingConfig,
  PerformanceConfig,
} from "../types/index.js";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  // Style defaults
  addedClass: "diff-added",
  removedClass: "diff-removed",
  elementChangeClass: "diff-elem-changed",
  attributeChangeClass: "diff-attr-changed",
  wrapperTag: "span",

  // Performance defaults
  maxTextLength: 10000,
  minSimilarityThreshold: 0,
  enableMemoization: true,
} as const;

/**
 * Interface for configuration providers
 */
export interface ConfigProvider {
  getStyleConfig(): StyleConfig;
  getTrackingConfig(): TrackingConfig;
  getPerformanceConfig(): PerformanceConfig;
  getFullConfig(): ExtendedCompareOptions;
}

/**
 * Default configuration provider implementation
 */
export class DefaultConfigProvider implements ConfigProvider {
  private config: ExtendedCompareOptions;

  constructor(customConfig: Partial<ExtendedCompareOptions> = {}) {
    this.config = this.mergeWithDefaults(customConfig);
  }

  getStyleConfig(): StyleConfig {
    const { addedClass, removedClass, elementChangeClass, attributeChangeClass, wrapperTag } = this.config;
    const result: StyleConfig = {};
    if (addedClass !== undefined) result.addedClass = addedClass;
    if (removedClass !== undefined) result.removedClass = removedClass;
    if (elementChangeClass !== undefined) result.elementChangeClass = elementChangeClass;
    if (attributeChangeClass !== undefined) result.attributeChangeClass = attributeChangeClass;
    if (wrapperTag !== undefined) result.wrapperTag = wrapperTag;
    return result;
  }

  getTrackingConfig(): TrackingConfig {
    const { watchedTags, trackedTags, trackedAttributes } = this.config;
    const result: TrackingConfig = {};
    if (watchedTags !== undefined) result.watchedTags = watchedTags;
    if (trackedTags !== undefined) result.trackedTags = trackedTags;
    if (trackedAttributes !== undefined) result.trackedAttributes = trackedAttributes;
    return result;
  }

  getPerformanceConfig(): PerformanceConfig {
    const { maxTextLength, minSimilarityThreshold, enableMemoization } = this.config;
    const result: PerformanceConfig = {};
    if (maxTextLength !== undefined) result.maxTextLength = maxTextLength;
    if (minSimilarityThreshold !== undefined) result.minSimilarityThreshold = minSimilarityThreshold;
    if (enableMemoization !== undefined) result.enableMemoization = enableMemoization;
    return result;
  }

  getFullConfig(): ExtendedCompareOptions {
    return { ...this.config };
  }

  private mergeWithDefaults(
    customConfig: Partial<ExtendedCompareOptions>
  ): ExtendedCompareOptions {
    return {
      ...DEFAULT_CONFIG,
      ...customConfig,
    };
  }
}

/**
 * Configuration builder for fluent configuration setup
 */
export class ConfigBuilder {
  private config: Partial<ExtendedCompareOptions> = {};

  /**
   * Set CSS classes for styling diff results
   */
  withStyles(styleConfig: Partial<StyleConfig>): ConfigBuilder {
    Object.assign(this.config, styleConfig);
    return this;
  }

  /**
   * Configure which tags and attributes to track
   */
  withTracking(trackingConfig: Partial<TrackingConfig>): ConfigBuilder {
    Object.assign(this.config, trackingConfig);
    return this;
  }

  /**
   * Set performance optimization options
   */
  withPerformance(
    performanceConfig: Partial<PerformanceConfig>
  ): ConfigBuilder {
    Object.assign(this.config, performanceConfig);
    return this;
  }

  /**
   * Set custom element change handler
   */
  withElementChangeHandler(
    handler: NonNullable<CompareOptions["onElementChange"]>
  ): ConfigBuilder {
    this.config.onElementChange = handler;
    return this;
  }

  /**
   * Configure specific tags to watch for additions/removals
   */
  watchTags(...tags: string[]): ConfigBuilder {
    this.config.watchedTags = tags;
    return this;
  }

  /**
   * Configure which tags to track for changes
   */
  trackTags(tags: string[] | Record<string, string[]>): ConfigBuilder {
    this.config.trackedTags = tags;
    return this;
  }

  /**
   * Configure which attributes to track globally
   */
  trackAttributes(...attributes: string[]): ConfigBuilder {
    this.config.trackedAttributes = attributes;
    return this;
  }

  /**
   * Build the final configuration
   */
  build(): ExtendedCompareOptions {
    return new DefaultConfigProvider(this.config).getFullConfig();
  }
}

/**
 * Configuration factory functions for common use cases
 */
export const ConfigPresets = {
  /**
   * Basic configuration with minimal tracking
   */
  basic(): ExtendedCompareOptions {
    return new ConfigBuilder().build();
  },

  /**
   * Configuration optimized for content management systems
   */
  cms(): ExtendedCompareOptions {
    return new ConfigBuilder()
      .trackTags(["p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "span"])
      .trackAttributes("class", "id", "style")
      .watchTags("img", "a", "video", "iframe")
      .build();
  },

  /**
   * Configuration optimized for form diffing
   */
  forms(): ExtendedCompareOptions {
    return new ConfigBuilder()
      .trackTags({
        input: ["type", "name", "value", "placeholder", "required"],
        select: ["name", "multiple", "required"],
        textarea: ["name", "placeholder", "required"],
        button: ["type", "name"],
        form: ["action", "method"],
      })
      .watchTags("input", "select", "textarea", "button")
      .build();
  },

  /**
   * Configuration optimized for navigation/link diffing
   */
  navigation(): ExtendedCompareOptions {
    return new ConfigBuilder()
      .trackTags({
        a: ["href", "title", "target"],
        nav: ["class", "id"],
        ul: ["class"],
        li: ["class"],
      })
      .watchTags("a", "nav")
      .trackAttributes("href", "title", "target", "class", "id")
      .build();
  },

  /**
   * High-performance configuration with minimal processing
   */
  performance(): ExtendedCompareOptions {
    return new ConfigBuilder()
      .withPerformance({
        maxTextLength: 5000,
        minSimilarityThreshold: 0.5,
        enableMemoization: true,
      })
      .trackTags(["img", "a"])
      .trackAttributes("src", "href")
      .build();
  },
};

/**
 * Validate configuration options
 */
export function validateConfig(config: ExtendedCompareOptions): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate CSS classes
  if (config.addedClass && !/^[a-zA-Z][\w-]*$/.test(config.addedClass)) {
    errors.push("addedClass must be a valid CSS class name");
  }

  if (config.removedClass && !/^[a-zA-Z][\w-]*$/.test(config.removedClass)) {
    errors.push("removedClass must be a valid CSS class name");
  }

  // Validate wrapper tag
  if (config.wrapperTag && !/^[a-zA-Z][a-zA-Z0-9]*$/.test(config.wrapperTag)) {
    errors.push("wrapperTag must be a valid HTML tag name");
  }

  // Validate performance settings
  if (config.maxTextLength !== undefined && config.maxTextLength < 0) {
    errors.push("maxTextLength must be non-negative");
  }

  if (
    config.minSimilarityThreshold !== undefined &&
    (config.minSimilarityThreshold < 0 || config.minSimilarityThreshold > 1)
  ) {
    errors.push("minSimilarityThreshold must be between 0 and 1");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
