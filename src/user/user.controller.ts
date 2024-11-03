import { RolesGuard } from '@auth/guards/roles.guard';
import { JwtPayload } from '@auth/interfaces';
import { CurrentUser, Roles } from '@common/decorators';
import { ManyAndCountResponse } from '@common/responses';
import { ListDto, ListDtoSerializer } from '@common/serializers/common';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update.dto';
import { UserForAdminResponse, UserResponse } from './responses';
import { UserService } from './user.service';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findOneUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    return new UserResponse(user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  async findMany(
    @Query('search') search: string = '',
    @Query('paginate') paginate: string,
    @Query('orderBy') orderBy: string,
  ): Promise<ManyAndCountResponse> {
    const formattedParams: ListDto = await ListDtoSerializer.fromQuery({
      search,
      paginate,
      orderBy,
    });
    const data = await this.userService.findManyAndCount(formattedParams);

    return {
      ...data,
      nodes: data.nodes.map((user) => new UserForAdminResponse(user)),
    };
  }

  @UseGuards(RolesGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Put(':email')
  async updateUser(
    @Param('email', UpdateUserDto['email']) email: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.userService.save({ ...dto, email });
    return new UserResponse(user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.delete(id, user);
  }
}
