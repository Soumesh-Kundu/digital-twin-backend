
import { AlertStatus } from '@prisma/client';

export type GetAlertsQueryDto = {
  page?: number;      // default will be handled in service
  pageSize?: number; // default will be handled in service
  status?: AlertStatus;
};

export type UpdateAlertStatusDto = {
  status: AlertStatus;   // PENDING | RESOLVED | UNRESOLVED
  reason?: string;      // optional resolution reason
};
