import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE = "admin_session";
export const adminEnabled = () => !!process.env.ADMIN_PASSWORD;

const sign = (v: string) => createHmac("sha256", process.env.ADMIN_PASSWORD ?? "").update(v).digest("hex");
const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function passwordOk(pw: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  return !!real && safeEq(sign(pw), sign(real));
}
export const sessionToken = () => sign("admin-session-v1");

export function isAuthed(req: Request): boolean {
  if (!adminEnabled()) return false;
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`${COOKIE}=([a-f0-9]+)`));
  return !!m && safeEq(m[1], sessionToken());
}
