/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import c from 'classnames';
import React from 'react';
import { Nullable } from 'tsdef';

import { makeGlobalChonkyStyles } from '../../util/styles';

export interface FileThumbnailProps {
  className: string;
  thumbnailUrl: Nullable<string>;
}

export const FileThumbnail: React.FC<FileThumbnailProps> = React.memo((props) => {
  const { className, thumbnailUrl } = props;

  const classes = useStyles();
  return (
    <div className={c(className, classes.fileThumbnail)}>
      {thumbnailUrl && (
        <img
          key={thumbnailUrl}
          src={thumbnailUrl}
          alt=""
          draggable={false}
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
          }}
        />
      )}
    </div>
  );
});
FileThumbnail.displayName = 'FileThumbnail';

const useStyles = makeGlobalChonkyStyles(() => ({
  fileThumbnail: {
    overflow: 'hidden',
    '& > img': { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  },
}));
