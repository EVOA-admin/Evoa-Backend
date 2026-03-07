import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investor } from './entities/investor.entity';
import { User } from '../users/entities/user.entity';
import { CreateInvestorDto } from './dto/create-investor.dto';

@Injectable()
export class InvestorsService {
    constructor(
        @InjectRepository(Investor)
        private readonly investorRepository: Repository<Investor>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(userId: string, dto: CreateInvestorDto) {
        const investor = this.investorRepository.create({
            ...dto,
            userId,
        });

        const saved = await this.investorRepository.save(investor);

        // Sync registration name & avatar back to the users table so that
        // story bubbles, post headers, and all UI components show the
        // user's chosen identity instead of the Google email prefix.
        const userUpdate: Partial<User> = {};
        if (dto.name) userUpdate.fullName = dto.name;
        if (dto.logoUrl) userUpdate.avatarUrl = dto.logoUrl;
        if (Object.keys(userUpdate).length > 0) {
            await this.userRepository.update({ id: userId }, userUpdate);
        }

        return saved;
    }

    async findMyInvestorProfile(userId: string) {
        return this.investorRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string) {
        return this.investorRepository.findOne({ where: { id } });
    }

    async updateMyProfile(userId: string, dto: Partial<CreateInvestorDto>) {
        const investor = await this.findMyInvestorProfile(userId);
        if (!investor) {
            throw new NotFoundException('Investor profile not found');
        }

        Object.assign(investor, dto);
        const saved = await this.investorRepository.save(investor);

        // Keep users table in sync when profile is updated too
        const userUpdate: Partial<User> = {};
        if (dto.name) userUpdate.fullName = dto.name;
        if (dto.logoUrl) userUpdate.avatarUrl = dto.logoUrl;
        if (Object.keys(userUpdate).length > 0) {
            await this.userRepository.update({ id: userId }, userUpdate);
        }

        return saved;
    }
}
