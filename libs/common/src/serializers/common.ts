import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class Pagination {
  @IsNotEmpty()
  page: number;

  @IsNotEmpty()
  perPage: number;
}

export class Order {
  @IsNotEmpty()
  sort: string;

  @IsNotEmpty()
  order: 'asc' | 'desc';
}

export class ListDto {
  @IsString()
  search: string;

  @ValidateNested()
  @Type(() => Pagination)
  paginate: Pagination;

  @ValidateNested()
  @Type(() => Order)
  orderBy: Order;
}

interface ISearch {
  search: string;
  paginate: string;
  orderBy: string;
}

import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export class ListDtoSerializer {
  static async fromQuery(query: ISearch): Promise<ListDto> {
    const paginate = query.paginate
      ? JSON.parse(query.paginate)
      : { page: 1, perPage: 5 };
    const orderBy = query.orderBy
      ? JSON.parse(query.orderBy)
      : { sort: 'id', order: 'asc' };

    const dto = plainToClass(ListDto, {
      search: query.search,
      paginate,
      orderBy,
    });

    await validateOrReject(dto);

    return dto;
  }
}
