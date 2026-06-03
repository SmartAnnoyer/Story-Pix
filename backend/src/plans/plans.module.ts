import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PlanService } from './plans.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }])],
  providers: [PlanService],
  exports: [PlanService, MongooseModule],
})
export class PlansModule {}
