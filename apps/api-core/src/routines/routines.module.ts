import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProduitsModule } from '../produits/produits.module';
import { Routine, RoutineSchema } from './routine.schema';
import { RoutinesService } from './routines.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Routine.name, schema: RoutineSchema }]), ProduitsModule],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
