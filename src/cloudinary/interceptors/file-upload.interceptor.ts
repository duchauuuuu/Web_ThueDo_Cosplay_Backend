import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Express } from 'express';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;
    const files = request.files;

    if (file) {
      // Convert single file to buffer if needed
      if (!file.buffer && file.path) {
        // Handle file from disk storage
        const fs = require('fs');
        file.buffer = fs.readFileSync(file.path);
      }
    }

    if (files) {
      // Convert multiple files to buffers if needed
      files.forEach((f: Express.Multer.File) => {
        if (!f.buffer && f.path) {
          const fs = require('fs');
          f.buffer = fs.readFileSync(f.path);
        }
      });
    }

    return next.handle();
  }
}

