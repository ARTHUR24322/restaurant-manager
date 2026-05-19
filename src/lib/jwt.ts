/* eslint-disable @typescript-eslint/no-unused-vars */
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing!");
}
const secret = JWT_SECRET || "development-only-secret-key-123456789";
const key = new TextEncoder().encode(secret);

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3d")
    .sign(key);
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (_e) {
        return null;
    }
}
