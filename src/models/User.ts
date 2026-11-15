import bcrypt from 'bcryptjs';
import { Model, Schema, HydratedDocument, Mongoose, Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  provider: 'local' | 'github' | 'google';
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters long'],
      // Excluded from queries by default; use .select('+password') to include
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    provider: {
      type: String,
      enum: ['local', 'github', 'google'],
      default: 'local'
    }
  },
  { timestamps: true }
);

// Hash password before saving (Mongoose 9: async function, no callback)
userSchema.pre<HydratedDocument<IUser>>('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Factory pattern with typed mongoose instance and overwrite protection
const createUserModel = (mongooseInstance: Mongoose): Model<IUser> => {
  return (
    (mongooseInstance.models.User as Model<IUser>) ||
    mongooseInstance.model<IUser>('User', userSchema)
  );
};

export default createUserModel;
