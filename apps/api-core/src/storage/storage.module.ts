import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { LocalStorageService, UPLOAD_ROOT } from './local-storage.service';
import { STORAGE_SERVICE } from './storage.service';

@Module({
  imports: [
    // Reste actif avec Cloudinary : les fichiers déjà présents sous /uploads continuent d'être servis.
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_ROOT,
      serveRoot: '/uploads',
    }),
  ],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: () =>
        process.env.CLOUDINARY_URL
          ? new CloudinaryStorageService(process.env.CLOUDINARY_URL)
          : new LocalStorageService(),
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
