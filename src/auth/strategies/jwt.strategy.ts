import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService } from '../auth.service';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uocfornrjfikdajrhzog.supabase.co';
const SUPABASE_JWKS_URI = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const SUPABASE_ISSUER = `${SUPABASE_URL}/auth/v1`;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Use JWKS to validate ES256 tokens issued by Supabase
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: SUPABASE_JWKS_URI,
            }),
            issuer: SUPABASE_ISSUER,
            algorithms: ['ES256', 'RS256'],
        });
    }

    async validate(payload: any) {
        if (!payload?.sub) {
            throw new UnauthorizedException('Invalid token payload');
        }
        // For Supabase JWTs, sub is the Supabase user UUID — return raw payload
        // so downstream guards using supabaseAdmin.auth.getUser() still work
        return payload;
    }
}
