import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  // Les fichiers envoyés (logos, couvertures, audio) sont affichés par l'app web,
  // servie depuis une autre origine : helmet les bloquerait (CORP same-origin).
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.enableCors({
    origin: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // PORT est imposé par l'hébergeur (Render, etc.) ; PORT_API_CORE sert en local.
  const port = process.env.PORT ?? process.env.PORT_API_CORE ?? 3001;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
