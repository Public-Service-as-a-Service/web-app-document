import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
  ArrayMinSize,
  ArrayUnique,
  MaxLength,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type {
  DocumentUpdateRequest,
  DocumentFilterParameters,
  DocumentMetadata,
  DocumentResponsibility,
  DocumentResponsibilitiesUpdateRequest,
  DocumentStatus,
  DocumentTypeCreateRequest,
  DocumentTypeUpdateRequest,
} from '@/interfaces/document.interface';
import { DOCUMENT_STATUSES } from '@/interfaces/document.interface';

export class DocumentMetadataDto implements DocumentMetadata {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

export class DocumentResponsibilityDto implements DocumentResponsibility {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  username!: string;
}

export class MetadataFilterDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  matchesAny?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  matchesAll?: string[];
}

export class DocumentFilterParametersDto implements DocumentFilterParameters {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  sortBy?: string[];

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortDirection?: 'ASC' | 'DESC';

  @IsBoolean()
  @IsOptional()
  onlyLatestRevision?: boolean;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  documentTypes?: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  metaData?: MetadataFilterDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayUnique((r: DocumentResponsibility) => r?.username)
  @Type(() => DocumentResponsibilityDto)
  responsibilities?: DocumentResponsibilityDto[];

  @IsDateString()
  @IsOptional()
  validOn?: string;

  @IsArray()
  @IsOptional()
  @IsIn(DOCUMENT_STATUSES, { each: true })
  statuses?: DocumentStatus[];
}

export class DocumentUpdateDto implements DocumentUpdateRequest {
  @IsString()
  updatedBy!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  archive?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DocumentMetadataDto)
  metadataList?: DocumentMetadataDto[];

  @IsString()
  @IsOptional()
  type?: string;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}

export class DocumentResponsibilitiesUpdateDto implements DocumentResponsibilitiesUpdateRequest {
  @IsString()
  @IsNotEmpty()
  changedBy!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @ArrayUnique((r: DocumentResponsibility) => r?.username)
  @Type(() => DocumentResponsibilityDto)
  responsibilities!: DocumentResponsibilityDto[];
}

export class DocumentTypeCreateDto implements DocumentTypeCreateRequest {
  @IsString()
  type!: string;

  @IsString()
  displayName!: string;

  @IsString()
  createdBy!: string;
}

export class DocumentTypeUpdateDto implements DocumentTypeUpdateRequest {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  updatedBy!: string;
}
