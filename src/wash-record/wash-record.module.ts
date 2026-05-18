import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashRecordService } from './wash-record.service';
import { WashRecordController } from './wash-record.controller';
import { WashRecord } from './entities/wash-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WashRecord])],
  controllers: [WashRecordController],
  providers: [WashRecordService],
  exports: [WashRecordService],
})
export class WashRecordModule {}
