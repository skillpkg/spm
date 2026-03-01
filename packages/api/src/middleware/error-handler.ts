import type { Context } from 'hono';
import { ZodError } from 'zod';
import { ERROR_CODES, createApiError } from '@spm/shared';
import type { AppEnv } from '../types.js';

export const errorHandler = (err: Error, c: Context<AppEnv>) => {
  if (err instanceof ZodError) {
    const apiError = createApiError('VALIDATION_ERROR', {
      details: {
        issues: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return c.json(apiError, ERROR_CODES.VALIDATION_ERROR.status);
  }

  const env = c.env.ENVIRONMENT;
  if (env !== 'production') {
    console.error('[spm-api] unhandled error:', err.message, err.stack);
  }

  const apiError = createApiError('INTERNAL_ERROR', {
    ...(env !== 'production' ? { details: { message: err.message } } : {}),
  });
  return c.json(apiError, ERROR_CODES.INTERNAL_ERROR.status);
};
