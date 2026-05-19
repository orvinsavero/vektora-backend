import { z } from "zod";
import {
  registerUserSchema,
  registerTalentSchema,
} from "@/modules/identity/validators";

export interface RouteDefinition {
  method: "get" | "post" | "put" | "delete" | "patch";
  path: string;
  summary: string;
  description: string;
  module: string;
  requestBody?: z.ZodSchema;
  responseBody?: z.ZodSchema;
}

export const API_ROUTES: RouteDefinition[] = [
  {
    method: "post",
    path: "/api/identity/register-user",
    summary: "Register a new user profile",
    description:
      "Validates inputs, checks for duplicates, hashes passwords, and saves the user record.",
    module: "Identity",
    requestBody: registerUserSchema,
  },
  {
    method: "post",
    path: "/api/identity/register-talent",
    summary: "Convert user profile to talent",
    description:
      "Upgrades a user profile to a talent profile and establishes skill records inside a secure transaction.",
    module: "Identity",
    requestBody: registerTalentSchema,
  },
];
