import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investor } from './entities/investor.entity';
import { CreateInvestorDto } from './dto/create-investor.dto';

@Injectable()
export class InvestorsService {
    constructor(
        @InjectRepository(Investor)
        private readonly investorRepository: Repository<Investor>,
    ) { }

    async create(userId: string, dto: CreateInvestorDto) {
        // Check if user already has an investor profile?
        // Let's allow multiple for now if needed, or strictly one.
        // For simplicity, let's assume a user can create multiple investor profiles (e.g. angel + VC fund)
        // bit usually it's one.

        const investor = this.investorRepository.create({
            ...dto,
            userId,
        });

        return this.investorRepository.save(investor);
    }

    async findMyInvestorProfile(userId: string) {
        return this.investorRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' } // Get latest if multiple
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
        return this.investorRepository.save(investor);
    }
}
