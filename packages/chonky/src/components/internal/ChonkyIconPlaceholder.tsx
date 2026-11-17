/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React from 'react';
import { useIntl } from 'react-intl';

import { ChonkyIconProps } from '../../types/icons.types';
import { getI18nId, I18nNamespace } from '../../util/i18n';

export const ChonkyIconPlaceholder: React.FC<ChonkyIconProps> = () => {
  // This component should not be rendered unless the user has misconfigured Chonky
  const intl = useIntl();
  const title = intl.formatMessage({
    id: getI18nId(I18nNamespace.FileList, 'missingIconComponent'),
    defaultMessage:
      'No icon component found. Please follow Chonky installation instructions to ' +
      'provide a pre-made icon component (or a custom icon).',
  });
  return <span title={title}>⚠️</span>;
};
