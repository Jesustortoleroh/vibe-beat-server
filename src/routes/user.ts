import express, { Request, Response, NextFunction, Router } from 'express';
import * as userController from '../controllers/user';
import { userValidationRules, userUpdateRules, validate } from '../middlewares/validation';
import { ensureAuthenticated, ensureAdmin } from '../middlewares/auth';

const router: Router = express.Router();

// Middleware to check if user is owner of the resource or an admin
const isOwnerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user as { _id?: string; role?: string } | undefined;

  if (!user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  // Allow if admin OR if the user ID matches the requested :id
  if (user.role === 'admin' || user._id?.toString() === req.params.id) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Not authorized to perform this action' });
};

// GET all users (Admin only)
router.get('/', ensureAuthenticated, ensureAdmin, userController.getAllUsers);
// #swagger.tags = ['Users']
// #swagger.summary = 'Get all users'

// POST create new user (Public registration)
router.post('/', userValidationRules, validate, userController.createUser);
// #swagger.tags = ['Users']
// #swagger.summary = 'Create a new user'

// GET user by ID (Authenticated; ideally self or admin only)
router.get('/:id', ensureAuthenticated, userController.getUserById);
// #swagger.tags = ['Users']
// #swagger.summary = 'Get user by ID'
// #swagger.parameters['id'] = { description: 'User ID' }

// PUT update user (Self or admin only)
router.put(
  '/:id',
  ensureAuthenticated,
  isOwnerOrAdmin,
  userUpdateRules, // ✅ Reglas donde password es opcional
  validate,
  userController.updateUser
);
// #swagger.tags = ['Users']
// #swagger.summary = 'Update a user'
// #swagger.parameters['id'] = { description: 'User ID' }

// DELETE user (Self or admin only)
router.delete('/:id', ensureAuthenticated, isOwnerOrAdmin, userController.deleteUser);
// #swagger.tags = ['Users']
// #swagger.summary = 'Delete a user'
// #swagger.parameters['id'] = { description: 'User ID' }

export default router;
