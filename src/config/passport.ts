import { PassportStatic } from 'passport';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import * as userService from '../services/user.service';
import { IUser } from '../models/User';

// Real Passport verify callback signature (includes optional `info`)
type VerifyCallback = (error: any, user?: IUser | false, info?: any) => void;

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string | null;
}

export default (passport: PassportStatic) => {
  // Skip real OAuth strategies in test environment
  if (process.env.NODE_ENV !== 'test') {
    // --- GITHUB STRATEGY ---
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          // Configurable callback URL, no hardcoded production domain
          callbackURL:
            process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
          passReqToCallback: false,
          proxy: true
        },
        async (
          accessToken: string,
          _refreshToken: string,
          profile: GitHubProfile,
          done: VerifyCallback
        ) => {
          try {
            let email =
              profile.emails?.find(
                (candidate) =>
                  (candidate as { primary?: boolean; verified?: boolean }).primary &&
                  (candidate as { verified?: boolean }).verified
              )?.value ?? null;

            // GitHub may not expose emails in the profile; fetch them explicitly
            if (!email) {
              const response = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `token ${accessToken}` }
              });
              if (!response.ok) {
                throw new Error(`GitHub email fetch failed: ${response.status}`);
              }
              const emails = (await response.json()) as GitHubEmail[];
              const primaryEmail = emails.find((e) => e.primary && e.verified);
              email = primaryEmail?.email ?? null;
            }
            if (!email) {
              return done(new Error('GitHub account did not provide a verified email address'));
            }

            const userData = {
              email: email,
              name: profile.displayName ?? profile.username ?? 'GitHub User'
            };

            const user = await userService.findOrCreateOAuthUser(userData, 'github');
            if (!user) {
              return done(null, false, {
                message: 'This email is already linked to another provider'
              });
            }
            return done(null, user);
          } catch (err: unknown) {
            return done(err instanceof Error ? err : new Error('OAuth error'));
          }
        }
      )
    );

    // --- GOOGLE STRATEGY ---
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          // Configurable callback URL, no hardcoded production domain
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
          passReqToCallback: false,
          proxy: true
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: GoogleProfile,
          done: VerifyCallback
        ) => {
          try {
            const email = profile.emails?.find(
              (candidate) => (candidate as { verified?: boolean }).verified
            )?.value;
            if (!email) {
              return done(new Error('Google account did not provide a verified email address'));
            }

            const userData = {
              email,
              name: profile.displayName ?? profile.name?.givenName ?? 'Google User'
            };

            const user = await userService.findOrCreateOAuthUser(userData, 'google');
            if (!user) {
              return done(null, false, {
                message: 'This email is already linked to another provider'
              });
            }
            return done(null, user);
          } catch (err: unknown) {
            return done(err instanceof Error ? err : new Error('OAuth error'));
          }
        }
      )
    );
  }

  // Serialize only the user ID into the session
  passport.serializeUser((user, done) => {
    // Support both Mongoose documents (ObjectId) and plain objects (string id)
    const passportUser = user as {
      _id?: { toString(): string } | string;
      id?: string;
    };

    const userId =
      (typeof passportUser._id === 'string' ? passportUser._id : passportUser._id?.toString?.()) ??
      passportUser.id;

    if (!userId) {
      return done(new Error('User ID not found during serialization'));
    }
    done(null, userId);
  });

  // Deserialize the user from the session ID
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userService.getUserByIdForAuth(id);
      // Passport expects `false` when the user is not found
      done(null, user ?? false);
    } catch (err: unknown) {
      done(err instanceof Error ? err : new Error('Deserialization error'));
    }
  });
};
