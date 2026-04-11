export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: { code: 'unauthorized', status: 401, message: 'Missing or invalid token' },
  FORBIDDEN: { code: 'forbidden', status: 403, message: 'Insufficient permissions' },

  // Skills
  SKILL_NOT_FOUND: { code: 'skill_not_found', status: 404, message: 'Skill not found' },
  VERSION_NOT_FOUND: { code: 'version_not_found', status: 404, message: 'Version not found' },
  VERSION_EXISTS: {
    code: 'version_exists',
    status: 409,
    message: 'Version already published. Version numbers are immutable.',
  },

  // Validation
  VALIDATION_ERROR: { code: 'validation_error', status: 422, message: 'Invalid request data' },
  PUBLISH_BLOCKED: {
    code: 'publish_blocked',
    status: 422,
    message: 'Security scan blocked publication',
  },

  // Name
  NAME_TAKEN: { code: 'name_taken', status: 409, message: 'Skill name already registered' },
  NAME_INVALID: { code: 'name_invalid', status: 422, message: 'Invalid skill name' },
  NAME_RESERVED: { code: 'name_reserved', status: 422, message: 'This name is reserved' },
  NAME_SIMILAR: {
    code: 'name_similar',
    status: 422,
    message: 'Name too similar to existing skill',
  },

  // Organizations
  ORG_NOT_FOUND: { code: 'org_not_found', status: 404, message: 'Organization not found' },
  ORG_NAME_TAKEN: { code: 'org_name_taken', status: 409, message: 'Organization name already taken' },
  ORG_MEMBER_EXISTS: {
    code: 'org_member_exists',
    status: 409,
    message: 'User is already a member of this organization',
  },
  ORG_NOT_MEMBER: {
    code: 'org_not_member',
    status: 403,
    message: 'You are not a member of this organization',
  },
  ORG_LAST_OWNER: {
    code: 'org_last_owner',
    status: 422,
    message: 'Cannot remove or demote the last owner of an organization',
  },
  SCOPE_NOT_FOUND: {
    code: 'scope_not_found',
    status: 403,
    message: 'Scope does not exist. Create it with: spm org create <name>',
  },

  // Rate limiting
  RATE_LIMITED: { code: 'rate_limited', status: 429, message: 'Too many requests' },

  // Server
  INTERNAL_ERROR: { code: 'internal_error', status: 500, message: 'Internal server error' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiError {
  error: string;
  message: string;
  suggestion?: string;
  details?: Record<string, unknown>;
}

export const createApiError = (code: ErrorCode, overrides?: Partial<ApiError>): ApiError => {
  const base = ERROR_CODES[code];
  return {
    error: base.code,
    message: overrides?.message ?? base.message,
    suggestion: overrides?.suggestion,
    details: overrides?.details,
  };
};
