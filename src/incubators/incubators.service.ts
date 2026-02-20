import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incubator } from './entities/incubator.entity';
import { CreateIncubatorDto } from './dto/create-incubator.dto';

@Injectable()
export class IncubatorsService {
    constructor(
        @InjectRepository(Incubator)
        private readonly incubatorRepository: Repository<Incubator>,
    ) { }

    async create(userId: string, dto: CreateIncubatorDto) {
        const incubator = this.incubatorRepository.create({
            ...dto,
            userId,
        });

        return this.incubatorRepository.save(incubator);
    }

    async findMyIncubatorProfile(userId: string) {
        return this.incubatorRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string) {
        return this.incubatorRepository.findOne({ where: { id } });
    }
}
