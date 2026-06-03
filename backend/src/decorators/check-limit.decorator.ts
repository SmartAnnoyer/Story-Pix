import { SetMetadata } from '@nestjs/common';
import { LimitType } from '../common/enums';

export const CHECK_LIMIT_KEY = 'checkLimit';
export const CheckLimit = (type: LimitType) => SetMetadata(CHECK_LIMIT_KEY, type);
