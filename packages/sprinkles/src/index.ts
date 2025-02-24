import { style, CSSProperties } from '@vanilla-extract/css';
import { addRecipe } from '@vanilla-extract/css/recipe';

import {
  AtomsFn,
  createAtomsFn as internalCreateAtomsFn,
} from './createAtomsFn';
import { AtomicStyles, ResponsiveArrayConfig } from './types';

export { createNormalizeValueFn, createMapValueFn } from './createUtils';
export type { ConditionalValue } from './createUtils';

interface Condition {
  '@media'?: string;
  '@supports'?: string;
  selector?: string;
}

type BaseConditions = { [conditionName: string]: Condition };

type AtomicProperties = {
  [Property in keyof CSSProperties]?:
    | Record<string, CSSProperties[Property]>
    | ReadonlyArray<CSSProperties[Property]>;
};

type ShorthandOptions<
  Properties extends AtomicProperties,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> }
> = {
  shorthands: Shorthands;
};

type UnconditionalAtomicOptions<Properties extends AtomicProperties> = {
  properties: Properties;
};

type ResponsiveArrayOptions<
  Conditions extends { [conditionName: string]: Condition },
  ResponsiveLength extends number
> = {
  responsiveArray: ResponsiveArrayConfig<keyof Conditions> & {
    length: ResponsiveLength;
  };
};

type ConditionalAtomicOptions<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  DefaultCondition extends keyof Conditions | false
> = UnconditionalAtomicOptions<Properties> & {
  conditions: Conditions;
  defaultCondition: DefaultCondition;
};

type Values<Property, Result> = {
  [Value in Property extends ReadonlyArray<any>
    ? Property[number]
    : Property extends Array<any>
    ? Property[number]
    : keyof Property]: Result;
};

type UnconditionalAtomicStyles<Properties extends AtomicProperties> = {
  conditions: never;
  styles: {
    [Property in keyof Properties]: {
      values: Values<Properties[Property], { defaultClass: string }>;
    };
  };
};

type ConditionalAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  DefaultCondition extends keyof Conditions | false
> = {
  conditions: {
    defaultCondition: DefaultCondition;
    conditionNames: Array<keyof Conditions>;
  };
  styles: {
    [Property in keyof Properties]: {
      values: Values<
        Properties[Property],
        {
          defaultClass: DefaultCondition extends string ? string : undefined;
          conditions: {
            [Rule in keyof Conditions]: string;
          };
        }
      >;
    };
  };
};

type ConditionalWithResponsiveArrayAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  ResponsiveLength extends number,
  DefaultCondition extends keyof Conditions | false
> = {
  conditions: {
    defaultCondition: DefaultCondition;
    conditionNames: Array<keyof Conditions>;
    responsiveArray: Array<keyof Conditions> & { length: ResponsiveLength };
  };
  styles: {
    [Property in keyof Properties]: {
      responsiveArray: Array<keyof Conditions> & { length: ResponsiveLength };
      values: Values<
        Properties[Property],
        {
          defaultClass: DefaultCondition extends string ? string : undefined;
          conditions: {
            [Rule in keyof Conditions]: string;
          };
        }
      >;
    };
  };
};

type ShorthandAtomicStyles<
  Shorthands extends {
    [shorthandName: string]: Array<string | number | symbol>;
  }
> = {
  styles: {
    [Shorthand in keyof Shorthands]: {
      mappings: Shorthands[Shorthand];
    };
  };
};

// Conditional + Shorthands + ResponsiveArray
export function createAtomicStyles<
  Properties extends AtomicProperties,
  ResponsiveLength extends number,
  Conditions extends BaseConditions,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
  DefaultCondition extends keyof Conditions | false
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ShorthandOptions<Properties, Shorthands> &
    ResponsiveArrayOptions<Conditions, ResponsiveLength>,
): ConditionalWithResponsiveArrayAtomicStyles<
  Properties,
  Conditions,
  ResponsiveLength,
  DefaultCondition
> &
  ShorthandAtomicStyles<Shorthands>;
// Conditional + Shorthands
export function createAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
  DefaultCondition extends keyof Conditions | false
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ShorthandOptions<Properties, Shorthands>,
): ConditionalAtomicStyles<Properties, Conditions, DefaultCondition> &
  ShorthandAtomicStyles<Shorthands>;
// Conditional + ResponsiveArray
export function createAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  ResponsiveLength extends number,
  DefaultCondition extends keyof Conditions | false
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ResponsiveArrayOptions<Conditions, ResponsiveLength>,
): ConditionalWithResponsiveArrayAtomicStyles<
  Properties,
  Conditions,
  ResponsiveLength,
  DefaultCondition
>;
// Conditional
export function createAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  DefaultCondition extends keyof Conditions | false
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition>,
): ConditionalAtomicStyles<Properties, Conditions, DefaultCondition>;
// Unconditional + Shorthands
export function createAtomicStyles<
  Properties extends AtomicProperties,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> }
>(
  options: UnconditionalAtomicOptions<Properties> &
    ShorthandOptions<Properties, Shorthands>,
): UnconditionalAtomicStyles<Properties> & ShorthandAtomicStyles<Shorthands>;
// Unconditional
export function createAtomicStyles<Properties extends AtomicProperties>(
  options: UnconditionalAtomicOptions<Properties>,
): UnconditionalAtomicStyles<Properties>;
export function createAtomicStyles(options: any): any {
  let styles: any =
    'shorthands' in options
      ? Object.fromEntries(
          Object.entries(options.shorthands).map(([prop, mappings]) => [
            prop,
            { mappings },
          ]),
        )
      : {};

  for (const key in options.properties) {
    const property = options.properties[key as keyof typeof options.properties];
    styles[key] = {
      values: {},
    };

    if ('responsiveArray' in options) {
      styles[key].responsiveArray = options.responsiveArray;
    }

    const processValue = (
      valueName: keyof typeof property,
      value: string | number,
    ) => {
      if ('conditions' in options) {
        styles[key].values[valueName] = {
          conditions: {},
        };

        for (const conditionName in options.conditions) {
          const condition =
            options.conditions[
              conditionName as keyof typeof options.conditions
            ];

          let styleValue = {
            [key]: value,
          } as any;

          if (condition['@supports']) {
            styleValue = {
              '@supports': {
                [condition['@supports']]: styleValue,
              },
            };
          }

          if (condition['@media']) {
            styleValue = {
              '@media': {
                [condition['@media']]: styleValue,
              },
            };
          }

          if (condition.selector) {
            styleValue = {
              selectors: {
                [condition.selector]: styleValue,
              },
            };
          }

          const className = style(
            styleValue,
            `${key}_${String(valueName)}_${conditionName}`,
          );

          styles[key].values[valueName].conditions[conditionName] = className;

          if (conditionName === options.defaultCondition) {
            styles[key].values[valueName].defaultClass = className;
          }
        }
      } else {
        styles[key].values[valueName] = {
          defaultClass: style({ [key]: value }, `${key}_${String(valueName)}`),
        };
      }
    };

    if (Array.isArray(property)) {
      for (const value of property) {
        processValue(value, value);
      }
    } else {
      for (const valueName in property) {
        const value = property[valueName];
        processValue(valueName, value);
      }
    }
  }

  const conditions =
    'conditions' in options
      ? {
          defaultCondition: options.defaultCondition,
          conditionNames: Object.keys(options.conditions),
          responsiveArray: options.responsiveArray,
        }
      : undefined;

  return { conditions, styles };
}

export function createAtomsFn<Args extends ReadonlyArray<AtomicStyles>>(
  ...config: Args
): AtomsFn<Args> {
  const atoms = internalCreateAtomsFn(...config);

  return addRecipe(atoms, {
    importPath: '@vanilla-extract/sprinkles/createAtomsFn',
    importName: 'createAtomsFn',
    args: config,
  });
}
