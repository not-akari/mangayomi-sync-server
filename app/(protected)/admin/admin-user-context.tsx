"use client";

import { createContext, useContext } from "react";
import type { AdminScope } from "@prisma/client";

interface AdminUserContextValue {
  userId: string;
  scopes: AdminScope[];
  emailConfigured: boolean;
}

const AdminUserContext = createContext<AdminUserContextValue | null>(null);

export function AdminUserProvider({
  value,
  children,
}: {
  value: AdminUserContextValue;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <AdminUserContext.Provider value={value}>
      {children}
    </AdminUserContext.Provider>
  );
}

export function useAdminUser(): AdminUserContextValue {
  const ctx = useContext(AdminUserContext);
  if (!ctx) {
    throw new Error("useAdminUser must be used within AdminUserProvider");
  }
  return ctx;
}
