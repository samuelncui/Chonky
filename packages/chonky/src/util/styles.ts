import { Theme as MuiTheme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import classnames from 'classnames';
import { css } from '@emotion/css';
import { DeepPartial } from 'tsdef';

export const lightTheme = {
  colors: {
    debugRed: '#fabdbd',
    debugBlue: '#bdd8fa',
    debugGreen: '#d2fabd',
    debugPurple: '#d2bdfa',
    debugYellow: '#fae9bd',

    textActive: '#09f',
  },

  fontSizes: {
    rootPrimary: 15,
  },

  margins: {
    rootLayoutMargin: 8,
  },

  root: {
    borderRadius: 4,
    borderStyle: 'solid 1px',
    height: '100%',
  },

  toolbar: {
    size: 30,
    lineHeight: '30px', // `px` suffix is required for `line-height` fields to work
    buttonPadding: 8,
    fontSize: 15,
    buttonRadius: 4,
  },

  dnd: {
    canDropColor: 'green',
    cannotDropColor: 'red',
    canDropMask: 'rgba(180, 235, 180, 0.75)',
    cannotDropMask: 'rgba(235, 180, 180, 0.75)',
    fileListCanDropMaskOne: 'rgba(180, 235, 180, 0.1)',
    fileListCanDropMaskTwo: 'rgba(180, 235, 180, 0.2)',
    fileListCannotDropMaskOne: 'rgba(235, 180, 180, 0.1)',
    fileListCannotDropMaskTwo: 'rgba(235, 180, 180, 0.2)',
  },

  dragLayer: {
    border: 'solid 2px #09f',
    padding: '7px 10px',
    borderRadius: 2,
  },

  fileList: {
    desktopGridGutter: 8,
    mobileGridGutter: 5,
  },

  gridFileEntry: {
    childrenCountSize: '1.6em',
    iconColorFocused: '#000',
    iconSize: '2.4em',
    iconColor: '#fff',
    borderRadius: 5,
    fontSize: 14,

    fileColorTint: 'rgba(255, 255, 255, 0.4)',
    folderBackColorTint: 'rgba(255, 255, 255, 0.1)',
    folderFrontColorTint: 'rgba(255, 255, 255, 0.4)',
  },

  listFileEntry: {
    propertyFontSize: 14,
    iconFontSize: '1.1em',
    iconBorderRadius: 5,
    fontSize: 14,
  },
};

export type ChonkyTheme = typeof lightTheme;

export const darkThemeOverride: DeepPartial<ChonkyTheme> = {
  gridFileEntry: {
    fileColorTint: 'rgba(50, 50, 50, 0.4)',
    folderBackColorTint: 'rgba(50, 50, 50, 0.4)',
    folderFrontColorTint: 'rgba(50, 50, 50, 0.15)',
  },
};

export const mobileThemeOverride: DeepPartial<ChonkyTheme> = {
  fontSizes: {
    rootPrimary: 13,
  },
  margins: {
    rootLayoutMargin: 4,
  },
  toolbar: {
    size: 28,
    lineHeight: '28px',
    fontSize: 13,
  },
  gridFileEntry: {
    fontSize: 13,
  },
  listFileEntry: {
    propertyFontSize: 12,
    iconFontSize: '1em',
    fontSize: 13,
  },
};

export const useIsMobileBreakpoint = () => {
  return useMediaQuery('(max-width:480px)');
};

export const getStripeGradient = (colorOne: string, colorTwo: string) =>
  'repeating-linear-gradient(' +
  '45deg,' +
  `${colorOne},` +
  `${colorOne} 10px,` +
  `${colorTwo} 0,` +
  `${colorTwo} 20px` +
  ')';

type StyleMap<C extends string> = Record<C, Record<string, unknown>>;
type ClassMap<C extends string> = Record<C, string>;

const importantMarker = Symbol('chonky-important');
type ImportantValue = {
  [importantMarker]: true;
  value: unknown;
};

const isImportantValue = (value: unknown): value is ImportantValue =>
  !!value && typeof value === 'object' && importantMarker in value;

const formatCSSValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(formatCSSValue).join(' ');
  if (typeof value === 'number') return value === 0 ? '0' : `${value}px`;
  return String(value);
};

const resolveStyles = (value: unknown, state: unknown): unknown => {
  if (typeof value === 'function') return resolveStyles(value(state), state);
  if (isImportantValue(value)) return `${formatCSSValue(value.value)} !important`;
  if (Array.isArray(value)) return formatCSSValue(value);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveStyles(child, state)]));
};

const makeChonkyStyles = <C extends string>(
  makeStyles: (theme: ChonkyTheme & MuiTheme) => StyleMap<C>,
  globalClassNames: boolean,
) => {
  return (state?: unknown): ClassMap<C> => {
    const theme = useTheme<ChonkyTheme & MuiTheme>();
    const classes = {} as ClassMap<C>;
    for (const [name, styles] of Object.entries(makeStyles(theme)) as [C, Record<string, unknown>][]) {
      const generatedClassName = css(resolveStyles(styles, state) as any);
      classes[name] = globalClassNames ? `chonky-${name} ${generatedClassName}` : generatedClassName;
    }
    return classes;
  };
};

export const makeLocalChonkyStyles = <C extends string = string>(
  makeStyles: (theme: ChonkyTheme & MuiTheme) => StyleMap<C>,
) => makeChonkyStyles(makeStyles, false);

export const makeGlobalChonkyStyles = <C extends string = string>(
  makeStyles: (theme: ChonkyTheme & MuiTheme) => StyleMap<C>,
) => makeChonkyStyles(makeStyles, true);

export const important = <T>(value: T): ImportantValue => ({
  [importantMarker]: true,
  value,
});

export const c: typeof classnames = classnames;
