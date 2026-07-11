import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PanierLigne, PanierLigneSchema } from './panier.schema';
import { PanierService } from './panier.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: PanierLigne.name, schema: PanierLigneSchema }])],
  providers: [PanierService],
  exports: [PanierService],
})
export class PanierModule {}
