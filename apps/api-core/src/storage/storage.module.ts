import { Logger, Module } from '@nestjs/common';
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
      useFactory: () => {
        // Tolère une valeur collée avec son nom (« CLOUDINARY_URL=… ») ou des guillemets.
        const cloudinaryUrl = (process.env.CLOUDINARY_URL ?? '')
          .trim()
          .replace(/^CLOUDINARY_URL=/, '')
          .replace(/^["']|["']$/g, '');
        if (!cloudinaryUrl) return new LocalStorageService();
        try {
          return new CloudinaryStorageService(cloudinaryUrl);
        } catch {
          // Une variable mal saisie ne doit pas empêcher l'API de démarrer.
          new Logger('StorageModule').error(
            'CLOUDINARY_URL invalide (attendu : cloudinary://API_KEY:API_SECRET@CLOUD_NAME). Stockage local utilisé.',
          );
          return new LocalStorageService();
        }
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
