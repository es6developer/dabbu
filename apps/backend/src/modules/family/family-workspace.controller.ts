import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces';
import { FamilyWorkspaceService } from './family-workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@ApiTags('Family Workspace')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('family/workspace')
export class FamilyWorkspaceController {
  constructor(private readonly service: FamilyWorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a family workspace' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(user.id, dto);
  }

  @Get(':familyId')
  @ApiOperation({ summary: 'Get workspace by family ID' })
  findByFamily(@Param('familyId') familyId: string) {
    return this.service.findByFamily(familyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.service.update(id, user.id, dto);
  }
}
