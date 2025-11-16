import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);

    constructor() {
        super({
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
                {
                    emit: 'event',
                    level: 'error',
                },
                {
                    emit: 'event',
                    level: 'info',
                },
                {
                    emit: 'event',
                    level: 'warn',
                },
            ],
        });

        // Log database queries in development
        this.$on('query', (e) => {
            this.logger.debug(`Query: ${e.query} -- Params: ${e.params} -- Duration: ${e.duration}ms`);
        });

        // Log database errors
        this.$on('error', (e) => {
            this.logger.error(`Database Error: ${e.message}`);
        });

        // Log database info
        this.$on('info', (e) => {
            this.logger.log(`Database Info: ${e.message}`);
        });

        // Log database warnings
        this.$on('warn', (e) => {
            this.logger.warn(`Database Warning: ${e.message}`);
        });
    }

    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('Successfully connected to database');
        } catch (error) {
            this.logger.error('Failed to connect to database', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Successfully disconnected from database');
        } catch (error) {
            this.logger.error('Error disconnecting from database', error);
        }
    }

    // Helper method for health checks
    async isHealthy(): Promise<boolean> {
        try {
            await this.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            this.logger.error('Database health check failed', error);
            return false;
        }
    }

    // Helper method to get database info
    async getDatabaseInfo() {
        try {
            const result = await this.$queryRaw`SELECT version()`;
            return result;
        } catch (error) {
            this.logger.error('Failed to get database info', error);
            throw error;
        }
    }
}