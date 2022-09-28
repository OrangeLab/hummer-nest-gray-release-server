import { PartialType } from '@nestjs/mapped-types';
import { CreateToggleDto } from './create-toggle.dto';

export class UpdateToggleDto extends PartialType(CreateToggleDto) {}
