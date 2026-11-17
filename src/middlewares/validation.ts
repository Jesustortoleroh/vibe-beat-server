import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// --- USER RULES ---
export const userValidationRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email required'),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0
    })
    .withMessage(
      'Password must be at least 8 characters long and include a mix of uppercase, lowercase, and numbers.'
    )
];

// Add this new set for updates (This fixes your TypeScript error)
export const userUpdateRules: ValidationChain[] = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('password')
    .optional()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0
    })
    .withMessage(
      'Password must be at least 8 characters long and include a mix of uppercase, lowercase, and numbers.'
    )
];

// --- PLAYLIST RULES ---
export const playlistCreateRules: ValidationChain[] = [
  body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('genre')
    .isIn([
      'rock',
      'pop',
      'jazz',
      'classical',
      'electronic',
      'hip-hop',
      'reggae',
      'blues',
      'folk',
      'other'
    ])
    .withMessage('Invalid genre'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('songs').optional().isArray().withMessage('Songs must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('coverImage').optional().isString().withMessage('coverImage must be a string')
];

export const playlistUpdateRules: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Name must be at least 3 characters'),
  body('genre')
    .optional()
    .isIn([
      'rock',
      'pop',
      'jazz',
      'classical',
      'electronic',
      'hip-hop',
      'reggae',
      'blues',
      'folk',
      'other'
    ])
    .withMessage('Invalid genre'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('songs').optional().isArray().withMessage('Songs must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('coverImage').optional().isString().withMessage('coverImage must be a string')
];

// --- MIDDLEWARE ---
export const validate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};
