import { z } from 'zod';

export const OIDCCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
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
  refreshToken: z.string(),
});
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;
