// Limita intentos de login (10 cada 15 min por IP)
import { rateLimit } from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Try again later."
    }
  }
});
