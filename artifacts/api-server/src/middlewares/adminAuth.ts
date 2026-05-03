import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ error: "Admin access not configured." });
  }
  const provided = req.headers["x-admin-password"];
  if (!provided || provided !== adminPassword) {
    return res.status(401).json({ error: "Unauthorized. Admin password required." });
  }
  return next();
}
