import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { RotateSecretDto } from './dto/rotate-secret.dto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const keyHex = this.configService.get<string>('secrets.encryptionKey', '');
    if (keyHex && keyHex.length >= 32) {
      this.encryptionKey = Buffer.from(keyHex.slice(0, 32), 'utf8');
    } else {
      // Fallback key for development — NEVER use in production
      this.encryptionKey = crypto
        .createHash('sha256')
        .update('dev-fallback-key')
        .digest();
      this.logger.warn(
        'Using fallback encryption key — set SECRETS_ENCRYPTION_KEY in production!',
      );
    }
  }

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    // Format: iv:tag:ciphertext (all hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encValue: string): string {
    const parts = encValue.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid encrypted value format');
    }
    const [ivHex, tagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async create(dto: CreateSecretDto) {
    const existing = await this.prisma.secretKey.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Secret "${dto.name}" already exists`);
    }

    const encValue = this.encrypt(dto.value);

    const secret = await this.prisma.secretKey.create({
      data: {
        name: dto.name,
        purpose: dto.purpose,
        encValue,
        algorithm: ALGORITHM,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(`Secret created: ${dto.name}`);

    return {
      id: secret.id,
      name: secret.name,
      purpose: secret.purpose,
      version: secret.version,
      status: secret.status,
      algorithm: secret.algorithm,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
    };
  }

  async findAll() {
    const secrets = await this.prisma.secretKey.findMany({
      select: {
        id: true,
        name: true,
        purpose: true,
        algorithm: true,
        version: true,
        status: true,
        rotatedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return secrets.map((s) => ({
      ...s,
      isExpired: s.expiresAt ? s.expiresAt < new Date() : false,
      needsRotation: this.needsRotation(s),
    }));
  }

  async findOne(id: string) {
    const secret = await this.prisma.secretKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        purpose: true,
        algorithm: true,
        version: true,
        status: true,
        rotatedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }
    return {
      ...secret,
      isExpired: secret.expiresAt ? secret.expiresAt < new Date() : false,
      needsRotation: this.needsRotation(secret),
    };
  }

  async rotate(id: string, dto: RotateSecretDto) {
    const secret = await this.prisma.secretKey.findUnique({
      where: { id },
    });
    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    if (secret.status === 'REVOKED') {
      throw new BadRequestException('Cannot rotate a revoked secret');
    }

    const encValue = this.encrypt(dto.newValue);

    const updated = await this.prisma.secretKey.update({
      where: { id },
      data: {
        encValue,
        version: secret.version + 1,
        rotatedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : secret.expiresAt,
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `Secret rotated: ${secret.name} v${secret.version} → v${updated.version}`,
    );

    return {
      id: updated.id,
      name: updated.name,
      version: updated.version,
      status: updated.status,
      rotatedAt: updated.rotatedAt,
      expiresAt: updated.expiresAt,
    };
  }

  async revoke(id: string) {
    const secret = await this.prisma.secretKey.findUnique({
      where: { id },
    });
    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    await this.prisma.secretKey.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    this.logger.log(`Secret revoked: ${secret.name}`);
    return { id, name: secret.name, status: 'REVOKED' };
  }

  async getDecryptedValue(name: string): Promise<string> {
    const secret = await this.prisma.secretKey.findUnique({
      where: { name },
    });
    if (!secret) {
      throw new NotFoundException(`Secret "${name}" not found`);
    }
    if (secret.status === 'REVOKED') {
      throw new BadRequestException(`Secret "${name}" has been revoked`);
    }
    return this.decrypt(secret.encValue);
  }

  async checkExpiring(daysAhead: number = 30) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);

    const expiring = await this.prisma.secretKey.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: threshold },
      },
      select: {
        id: true,
        name: true,
        purpose: true,
        version: true,
        expiresAt: true,
      },
    });

    return {
      count: expiring.length,
      daysAhead,
      secrets: expiring,
    };
  }

  private needsRotation(secret: {
    rotatedAt: Date | null;
    expiresAt: Date | null;
    status: string;
  }): boolean {
    if (secret.status === 'REVOKED') return false;

    const rotationDays = this.configService.get<number>(
      'secrets.rotationIntervalDays',
      90,
    );

    const lastRotated = secret.rotatedAt || new Date(0);
    const daysSinceRotation =
      (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRotation > rotationDays) return true;

    if (secret.expiresAt && secret.expiresAt < new Date()) return true;

    return false;
  }
}
