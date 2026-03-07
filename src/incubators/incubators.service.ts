import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incubator } from './entities/incubator.entity';
import { User } from '../users/entities/user.entity';
import { CreateIncubatorDto } from './dto/create-incubator.dto';

@Injectable()
export class IncubatorsService {
    constructor(
        @InjectRepository(Incubator)
        private readonly incubatorRepository: Repository<Incubator>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(userId: string, dto: CreateIncubatorDto) {
        const incubator = this.incubatorRepository.create({
            ...dto,
            userId,
        });

        const saved = await this.incubatorRepository.save(incubator);

        // Sync registration name & logo to the users table so UI shows
        // incubator identity rather than the Google email prefix.
        const userUpdate: Partial<User> = {};
        if (dto.name) userUpdate.fullName = dto.name;
        if (dto.logoUrl) userUpdate.avatarUrl = dto.logoUrl;
        if (Object.keys(userUpdate).length > 0) {
            await this.userRepository.update({ id: userId }, userUpdate);
        }

        return saved;
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

    async updateMyProfile(userId: string, dto: Partial<CreateIncubatorDto>) {
        const incubator = await this.findMyIncubatorProfile(userId);
        if (!incubator) {
            throw new NotFoundException('Incubator profile not found');
        }

        Object.assign(incubator, dto);
        const saved = await this.incubatorRepository.save(incubator);

        const userUpdate: Partial<User> = {};
        if (dto.name) userUpdate.fullName = dto.name;
        if (dto.logoUrl) userUpdate.avatarUrl = dto.logoUrl;
        if (Object.keys(userUpdate).length > 0) {
            await this.userRepository.update({ id: userId }, userUpdate);
        }

        return saved;
    }
}
