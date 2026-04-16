import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  DocumentUpdateRequest,
  DocumentFilterParameters,
  DocumentMetadata,
  DocumentTypeCreateRequest,
  DocumentTypeUpdateRequest,
} from '@/interfaces/document.interface';

export class DocumentMetadataDto implements DocumentMetadata {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
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
}

export class DocumentUpdateDto implements DocumentUpdateRequest {
  @IsString()
  createdBy!: string;

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
