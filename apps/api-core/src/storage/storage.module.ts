import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LocalStorageService, UPLOAD_ROOT } from './local-storage.service';
import { STORAGE_SERVICE } from './storage.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_ROOT,
      serveRoot: '/uploads',
    }),
  ],
  providers: [{ provide: STORAGE_SERVICE, useClass: LocalStorageService }],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
