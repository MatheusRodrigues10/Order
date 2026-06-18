declare namespace Express {
  export interface Request {
    admin?: string | import("jsonwebtoken").JwtPayload;
  }
}
