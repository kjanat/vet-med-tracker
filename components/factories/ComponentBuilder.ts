/**
 * Component Builder - Builder Pattern Implementation
 * Fluent interface for constructing complex components with multiple decorators and strategies
 */

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';
import { ComponentRegistry } from './ComponentRegistry';
import type { ComponentConfig, ComponentFactoryOptions, PlatformStrategy } from './types';

export class ComponentBuilder {
  private componentName?: string;
  private decorators: string[] = [];
  private strategy?: PlatformStrategy;
  private props: Record<string, any> = {};
  private options: ComponentFactoryOptions = {};
  private registry: ComponentRegistry;

  constructor() {
    this.registry = ComponentRegistry.getInstance();
  }

  /**
   * Reset builder state for reuse
   */
  reset(): ComponentBuilder {
    this.componentName = undefined;
    this.decorators = [];
    this.strategy = undefined;
    this.props = {};
    this.options = {};
    return this;
  }

  /**
   * Set the base component to build
   */
  setComponent(name: string): ComponentBuilder {
    this.componentName = name;
    return this;
  }

  /**
   * Add a decorator to the component
   */
  withDecorator(decoratorName: string): ComponentBuilder {
    if (!this.decorators.includes(decoratorName)) {
      this.decorators.push(decoratorName);
    }
    return this;
  }

  /**
   * Add multiple decorators
   */
  withDecorators(decoratorNames: string[]): ComponentBuilder {
    decoratorNames.forEach(name => this.withDecorator(name));
    return this;
  }

  /**
   * Set rendering strategy
   */
  withStrategy(strategy: PlatformStrategy): ComponentBuilder {
    this.strategy = strategy;
    return this;
  }

  /**
   * Add default props to the component
   */
  withProps(props: Record<string, any>): ComponentBuilder {
    this.props = { ...this.props, ...props };
    return this;
  }

  /**
   * Set factory options
   */
  withOptions(options: Partial<ComponentFactoryOptions>): ComponentBuilder {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Add loading decorator with skeleton fallback
   */
  withLoading(skeleton?: ComponentType): ComponentBuilder {
    this.withDecorator('loading');
    if (skeleton) {
      this.withProps({ loadingSkeleton: skeleton });
    }
    return this;
  }

  /**
   * Add error boundary decorator
   */
  withErrorBoundary(fallback?: ComponentType): ComponentBuilder {
    this.withDecorator('error-boundary');
    if (fallback) {
      this.withProps({ errorFallback: fallback });
    }
    return this;
  }

  /**
   * Add permission decorator with access control
   */
  withPermissions(permissions: string[]): ComponentBuilder {
    this.withDecorator('permission');
    this.withProps({ requiredPermissions: permissions });
    return this;
  }

  /**
   * Configure for mobile optimization
   */
  forMobile(): ComponentBuilder {
    return this.withStrategy('mobile')
      .withDecorator('responsive')
      .withProps({ isMobile: true });
  }

  /**
   * Configure for desktop optimization
   */
  forDesktop(): ComponentBuilder {
    return this.withStrategy('desktop')
      .withProps({ isDesktop: true });
  }

  /**
   * Configure for responsive design
   */
  responsive(): ComponentBuilder {
    return this.withStrategy('responsive')
      .withDecorator('responsive');
  }

  /**
   * Add accessibility enhancements
   */
  accessible(level: 'basic' | 'enhanced' = 'basic'): ComponentBuilder {
    this.withDecorator('accessibility');
    this.withProps({ accessibilityLevel: level });
    return this;
  }

  /**
   * Enable performance optimizations
   */
  optimized(): ComponentBuilder {
    this.options.enableMemoization = true;
    this.options.enableLazyLoading = true;
    return this;
  }

  /**
   * Build the final component
   */
  build<T = any>(): LazyExoticComponent<ComponentType<T>> {
    if (!this.componentName) {
      throw new Error('Component name must be set before building');
    }

    const config = this.registry.getComponent(this.componentName);
    if (!config) {
      throw new Error(`Component "${this.componentName}" not found in registry`);
    }

    // Merge builder decorators with component defaults
    const allDecorators = [...(config.decorators || []), ...this.decorators];
    const finalOptions: ComponentFactoryOptions = {
      ...this.options,
      strategy: this.strategy || this.options.strategy,
      includeDecorators: true,
      customDecorators: allDecorators,
      defaultProps: this.props
    };

    return lazy(async () => {
      const component = await this.buildComponentWithConfig(config, finalOptions);
      return { default: component };
    });
  }

  /**
   * Build and return metadata about the built component
   */
  buildWithMetadata<T = any>(): {
    component: LazyExoticComponent<ComponentType<T>>;
    metadata: {
      name: string;
      decorators: string[];
      strategy?: PlatformStrategy;
      props: Record<string, any>;
      options: ComponentFactoryOptions;
    };
  } {
    const component = this.build<T>();
    
    return {
      component,
      metadata: {
        name: this.componentName!,
        decorators: this.decorators,
        strategy: this.strategy,
        props: this.props,
        options: this.options
      }
    };
  }

  private async buildComponentWithConfig(
    config: ComponentConfig,
    options: ComponentFactoryOptions
  ): Promise<ComponentType<any>> {
    // Load base component
    const BaseComponent = await config.loader();

    // Apply strategy first
    let BuiltComponent = BaseComponent;
    if (options.strategy && config.strategies?.[options.strategy]) {
      BuiltComponent = config.strategies[options.strategy](BuiltComponent);
    }

    // Apply decorators in sequence
    if (options.customDecorators) {
      BuiltComponent = options.customDecorators.reduce((Component, decoratorName) => {
        const decorator = this.registry.getDecorator(decoratorName);
        if (decorator) {
          return decorator(Component, options);
        }
        return Component;
      }, BuiltComponent);
    }

    // Apply default props
    if (options.defaultProps) {
      const ComponentWithProps = (props: any) => (
        <BuiltComponent {...options.defaultProps} {...props}/>
      );
      ComponentWithProps.displayName = `${BuiltComponent.displayName || 'Component'}WithDefaultProps`;
      return ComponentWithProps;
    }

    return BuiltComponent;
  }
}

// Convenience builder functions
export const buildComponent = (name: string): ComponentBuilder => 
  new ComponentBuilder().setComponent(name);

export const buildPrimitive = (name: string): ComponentBuilder =>
  new ComponentBuilder().setComponent(name).withOptions({ type: 'primitive' });

export const buildBusinessComponent = (name: string): ComponentBuilder =>
  new ComponentBuilder().setComponent(name).withOptions({ type: 'business' });