import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    data: T;
    statusCode: number;
    timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            map(data => {
                // If data already has our response structure, return as-is
                if (data && typeof data === 'object' && 'data' in data && 'statusCode' in data) {
                    return data;
                }

                // Otherwise, wrap it
                return {
                    data,
                    statusCode: response.statusCode,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
