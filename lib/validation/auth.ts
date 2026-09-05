import { z } from "zod";
import {
  USERNAME_LENGTH,
  PASSWORD_LENGTH,
  INVITE_CODE_LENGTH,
} from "@/lib/config";

export const loginSchema = z.object({
  email: z.string().min(USERNAME_LENGTH.min).max(USERNAME_LENGTH.max),
  password: z.string().min(PASSWORD_LENGTH.min).max(PASSWORD_LENGTH.max),
  stayLoggedIn: z.boolean().optional(),
});

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const registerSchema = z.object({
  email: z
    .string()
    .min(USERNAME_LENGTH.min)
    .max(USERNAME_LENGTH.max)
    .regex(USERNAME_PATTERN),
  password: z.string().min(PASSWORD_LENGTH.min).max(PASSWORD_LENGTH.max),
  inviteCode: z.string().min(1).max(INVITE_CODE_LENGTH.max).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_LENGTH.max),
  newPassword: z.string().min(PASSWORD_LENGTH.min).max(PASSWORD_LENGTH.max),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
