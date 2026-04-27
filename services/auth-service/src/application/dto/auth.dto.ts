import { z } from 'zod';

export const OIDCCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
export type OIDCCallbackDTO = z.infer<typeof OIDCCallbackSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    role: z.string(),
  }),
});
export type AuthResponseDTO = z.infer<typeof AuthResponseSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

export const UserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  tenants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: z.string(),
      isActive: z.boolean(),
    })
  ),
});
export type UserProfileResponseDTO = z.infer<typeof UserProfileResponseSchema>;

export const LogoutResponseSchema = z.object({
  success: z.boolean(),
});

export const AuthorizeResponseSchema = z.object({
  url: z.string(),
});

export const JwksResponseSchema = z.object({
  keys: z.array(z.record(z.string(), z.unknown())),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
