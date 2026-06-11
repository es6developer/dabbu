import { PrismaService } from './prisma.service';

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  async create(data: CreateDto): Promise<T> {
    return this.model.create({ data });
  }

  async findAll(where: any = {}, options: any = {}): Promise<T[]> {
    return this.model.findMany({
      where: { ...where, deletedAt: null },
      ...options,
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async findFirst(where: any): Promise<T | null> {
    return this.model.findFirst({ where: { ...where, deletedAt: null } });
  }

  async update(id: string, data: UpdateDto | any): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<T> {
    return this.model.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async hardDelete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async count(where: any = {}): Promise<number> {
    return this.model.count({ where: { ...where, deletedAt: null } });
  }
}
