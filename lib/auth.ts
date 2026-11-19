import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getPrisma } from "./prisma";

const COOKIE_NAME = "nx-session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-change-me"
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.id !== "string" || typeof payload.email !== "string") return null;
    return {
      id: payload.id,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role: typeof payload.role === "string" ? payload.role : "VIEWER",
      organizationId:
        typeof payload.organizationId === "string" ? payload.organizationId : null,
    };
  } catch {
    return null;
  }
}

/** Load the full org for the session user (null when DB is unavailable). */
export async function getSessionOrg() {
  const user = await getSessionUser();
  if (!user || !user.organizationId) return { user, org: null };
  try {
    const org = await getPrisma().organization.findUnique({
      where: { id: user.organizationId },
    });
    return { user, org };
  } catch {
    return { user, org: null };
  }
}

export const ROLE_RANK: Record<string, number> = {
  VIEWER: 1,
  ANALYST: 2,
  MANAGER: 3,
  ADMIN: 4,
  ORG_OWNER: 5,
  SUPER_ADMIN: 6,
};

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  return !!user && roles.includes(user.role);
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}
