import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentMetadataDto, DocumentResponsibilityDto } from '@/dtos/document.dto';
import { DOCUMENT_STATUSES, type DocumentStatus } from '@/interfaces/document.interface';

/**
 * One file attached to a document.
 */
export class DocumentDataDto {
  @IsString()
  id!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  fileSizeInBytes!: number;
}

/**
 * Public document shape — upstream `confidentiality` field is stripped by the
 * controller before responses are returned.
 */
export class DocumentDto {
  @IsString()
  id!: string;

  @IsString()
  municipalityId!: string;

  @IsString()
  registrationNumber!: string;

  @IsNumber()
  revision!: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  description!: string;

  @IsString()
  created!: string;

  @IsString()
  createdBy!: string;

  @IsString()
  @IsOptional()
  updatedBy?: string;

  @IsBoolean()
  archive!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentMetadataDto)
  metadataList!: DocumentMetadataDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDataDto)
  documentData!: DocumentDataDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentResponsibilityDto)
  responsibilities?: DocumentResponsibilityDto[];

  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  validFrom?: string;

  @IsString()
  @IsOptional()
  validTo?: string;

  @IsOptional()
  @IsIn(DOCUMENT_STATUSES)
  status?: DocumentStatus;
}

export class PageMetaDto {
  @IsNumber()
  page!: number;

  @IsNumber()
  limit!: number;

  @IsNumber()
  count!: number;

  @IsNumber()
  totalRecords!: number;

  @IsNumber()
  totalPages!: number;
}

export class PagedDocumentResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents!: DocumentDto[];

  @ValidateNested()
  @Type(() => PageMetaDto)
  _meta!: PageMetaDto;
}

export class DocumentTypeDto {
  @IsString()
  type!: string;

  @IsString()
  displayName!: string;
}
