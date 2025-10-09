// Genera/propaga un X-Request-Id por request
import { randomUUID } from "crypto";

export const requestId = () => (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    (typeof incoming === "string" && incoming) ||
    randomUUID?.() ||
    `${Date.now()}-${Math.random()}`;
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
