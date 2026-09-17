import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import { FileData } from '../../types/file.types';

export const FileEntryStatus = ({ status, reserve = false }: { status?: FileData['status']; reserve?: boolean }) => {
  if (!status)
    return reserve ? <span aria-hidden="true" data-chonky-status-slot style={{ flex: '0 0 28px', width: 28 }} /> : null;
  return (
    <Tooltip title={status.label} placement="left" arrow>
      <span
        role="img"
        aria-label={status.label}
        tabIndex={0}
        data-chonky-status-slot
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 28px',
          width: 28,
          height: 24,
          position: 'relative',
          zIndex: 20,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status.color }} />
        {status.marker && (
          <span
            aria-hidden="true"
            style={{ color: status.marker.color, fontSize: 11, fontWeight: 700, lineHeight: 1, marginLeft: 2 }}
          >
            {status.marker.kind === 'unknown' ? '?' : status.marker.kind === 'changed' ? 'Δ' : '!'}
          </span>
        )}
      </span>
    </Tooltip>
  );
};
