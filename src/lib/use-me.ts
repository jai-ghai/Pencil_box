"use client";

import { useEffect, useState } from "react";
import type { Perm, Role } from "./permissions";

export interface Me {
  username: string;
  role: Role;
  permissions: Perm[];
}

let cached: Promise<Me | null> | null = null;

/** Who is signed in and what they may do (asked once per page load, then shared). Null while loading or when signed out. */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    cached ??= fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .catch(() => null);
    cached.then((m) => live && setMe(m));
    return () => {
      live = false;
    };
  }, []);
  return me;
}

export const can = (me: Me | null, perm: Perm): boolean => !!me && me.permissions.includes(perm);
