import { Request, Response, NextFunction } from 'express';

/**
 * Reusable middleware to ensure the user is authenticated.
 * Returns 401 if not authenticated.
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    message: 'You must be logged in to perform this action'
  });
};

/**
 * Middleware to ensure the authenticated user has the 'admin' role.
 * Returns 403 if authenticated but not an admin.
 */
export const ensureAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Cast req.user to access the role property, as Passport's default type doesn't include it
  const user = req.user as { role?: string } | undefined;

  if (user?.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};
