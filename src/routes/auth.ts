import express, { Request, Response, NextFunction, Router } from 'express';
import passport from 'passport';

const router: Router = express.Router();

// Reusable authentication guard
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.status(401).json({ success: false, message: 'Not authenticated' });
};

// --- GITHUB ROUTES ---
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/login?error=github' }),
  (_req: Request, res: Response) => res.redirect('/auth/profile')
);

// --- GOOGLE ROUTES ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=google' }),
  (_req: Request, res: Response) => res.redirect('/auth/profile')
);

// --- PROTECTED PROFILE ROUTE ---
router.get('/profile', ensureAuthenticated, (req: Request, res: Response) => {
  const user = req.user as { _id?: string; name?: string; email?: string; role?: string };
  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// --- LOGOUT ROUTE (POST recommended by Passport docs) ---
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Error logging out';
      res.status(500).json({ success: false, message });
      return;
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
