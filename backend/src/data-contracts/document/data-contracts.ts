/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum Direction {
  ASC = "ASC",
  DESC = "DESC",
}

export interface Problem {
  title?: string;
  detail?: string;
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  /** @format int32 */
  status?: number;
}

/** Document responsibilities update request model. */
export interface DocumentResponsibilitiesUpdateRequest {
  /**
   * PersonId of the actor that performed this change.
   * @minLength 1
   */
  updatedBy: string;
  responsibilities: DocumentResponsibility[];
}

/** Document responsibility model. */
export interface DocumentResponsibility {
  /**
   * Person ID of the responsible party.
   * @minLength 1
   */
  personId: string;
}

export interface ConstraintViolationProblem {
  /** @format uri */
  type?: string;
  /** @format int32 */
  status?: number;
  violations?: Violation[];
  title?: string;
  causeAsProblem?: ThrowableProblem;
  detail?: string;
  /** @format uri */
  instance?: string;
}

export interface ThrowableProblem {
  /** @format uri */
  type?: string;
  title?: string;
  /** @format int32 */
  status?: number;
  detail?: string;
  /** @format uri */
  instance?: string;
  causeAsProblem?: any;
}

export interface Violation {
  field?: string;
  message?: string;
}

/** DocumentDataCreateRequest model. */
export interface DocumentDataCreateRequest {
  /**
   * PersonId of the actor that created this revision.
   * @minLength 1
   */
  createdBy: string;
  filesToDelete?: string[];
}

/** Confidentiality model. */
export interface Confidentiality {
  /**
   * A flag that can be set to alert administrative users handling the information that there are some special privacy policies to follow for the person in question.
   * If there are special privacy policies to follow for this record, this flag should be set to 'true', otherwise 'false'.
   */
  confidential?: boolean;
  /** Legal citation */
  legalCitation?: string;
}

/** DocumentCreateRequest model. */
export interface DocumentCreateRequest {
  /**
   * PersonId of the actor that created this revision (all modifications will create new revisions).
   * @minLength 1
   */
  createdBy: string;
  /** Confidentiality */
  confidentiality?: Confidentiality;
  /** Tells if the document is eligible for archiving */
  archive?: boolean;
  /**
   * Document title
   * @minLength 0
   * @maxLength 255
   */
  title: string;
  /**
   * Document description
   * @minLength 0
   * @maxLength 8192
   */
  description: string;
  /** List of DocumentMetadata objects. */
  metadataList?: DocumentMetadata[];
  /** Document responsibilities. */
  responsibilities?: DocumentResponsibility[];
  /**
   * The type of document (validated against a defined list of document types).
   * @minLength 1
   */
  type: string;
  /**
   * Start of validity period (inclusive). ISO date (yyyy-MM-dd).
   * @format date
   */
  validFrom?: string;
  /**
   * End of validity period (inclusive). ISO date (yyyy-MM-dd).
   * @format date
   */
  validTo?: string;
}

/** DocumentMetadata model */
export interface DocumentMetadata {
  /**
   * Metadata key
   * @minLength 1
   */
  key: string;
  /**
   * Metadata value
   * @minLength 1
   */
  value: string;
}

export interface DocumentParameters {
  /**
   * Page number
   * @format int32
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Result size per page. Maximum allowed value is dynamically configured
   * @format int32
   * @min 1
   */
  limit?: number;
  sortBy?: string[];
  /** The sort order direction */
  sortDirection?: Direction;
  /** Municipality identifier */
  municipalityId?: string;
  /** Filter by personId of the actor that created the document. */
  createdBy?: string;
  /**
   * Should the search include confidential documents?
   * @default false
   */
  includeConfidential?: boolean;
  /**
   * Should the search include only the latest revision of the documents?
   * @default false
   */
  onlyLatestRevision?: boolean;
  /** List of document types */
  documentTypes?: string[];
  metaData?: MetaData[];
  responsibilities?: DocumentResponsibility[];
  /**
   * Only include documents whose validity window covers this date. A null validFrom is treated as valid from the beginning of time; a null validTo is treated as valid forever. ISO date (yyyy-MM-dd).
   * @format date
   */
  validOn?: string;
  statuses?: DocumentParametersStatusesEnum[];
}

export interface MetaData {
  /** Metadata key */
  key?: string;
  matchesAny?: string[];
  matchesAll?: string[];
}

/** Document model. */
export interface Document {
  /** ID of the document. */
  id?: string;
  /** Municipality ID */
  municipalityId?: string;
  /** Registration number on the format [YYYY-nnnn-nnnn]. */
  registrationNumber?: string;
  /**
   * Document revision.
   * @format int32
   */
  revision?: number;
  /** Confidentiality */
  confidentiality?: Confidentiality;
  /** Document title */
  title?: string;
  /** Document description */
  description?: string;
  /**
   * Timestamp when document revision was created.
   * @format date-time
   */
  created?: string;
  /** PersonId of the actor that created this revision. */
  createdBy?: string;
  /** PersonId of the actor that last updated this document. */
  updatedBy?: string;
  /** Tells if the document is eligible for archiving */
  archive?: boolean;
  /** List of DocumentMetadata objects. */
  metadataList?: DocumentMetadata[];
  /** Document data */
  documentData?: DocumentData[];
  /** Document responsibilities. */
  responsibilities?: DocumentResponsibility[];
  /** Document type */
  type?: string;
  /**
   * Start of validity period (inclusive). ISO date (yyyy-MM-dd).
   * @format date
   */
  validFrom?: string;
  /**
   * End of validity period (inclusive). ISO date (yyyy-MM-dd).
   * @format date
   */
  validTo?: string;
  /** Lifecycle status of this revision. */
  status?: DocumentStatusEnum;
}

/** DocumentData model. */
export interface DocumentData {
  /** ID of the document data. */
  id?: string;
  /** File name. */
  fileName?: string;
  /** The mime type of the file. */
  mimeType?: string;
  /**
   * File size in bytes
   * @format int64
   */
  fileSizeInBytes?: number;
}

/** Paged document response model */
export interface PagedDocumentResponse {
  documents?: Document[];
  /** PagingMetaData model */
  _meta?: PagingMetaData;
}

/** PagingMetaData model */
export interface PagingMetaData {
  /**
   * Current page
   * @format int32
   */
  page?: number;
  /**
   * Displayed objects per page
   * @format int32
   */
  limit?: number;
  /**
   * Displayed objects on current page
   * @format int32
   */
  count?: number;
  /**
   * Total amount of hits based on provided search parameters
   * @format int64
   */
  totalRecords?: number;
  /**
   * Total amount of pages based on provided search parameters
   * @format int32
   */
  totalPages?: number;
}

export interface DocumentTypeCreateRequest {
  /**
   * Identifier for the document type
   * @minLength 1
   */
  type: string;
  /**
   * Display name for the document type
   * @minLength 1
   */
  displayName: string;
  /**
   * PersonId of the actor that created this document type.
   * @minLength 1
   */
  createdBy: string;
}

/** DocumentUpdateRequest model. */
export interface DocumentUpdateRequest {
  /** PersonId of the actor that performed the update. */
  updatedBy?: string;
  /**
   * Document title
   * @minLength 0
   * @maxLength 255
   */
  title?: string;
  /**
   * Document description
   * @minLength 0
   * @maxLength 8192
   */
  description?: string;
  /** Tells if the document is eligible for archiving */
  archive?: boolean;
  /** List of DocumentMetadata objects. */
  metadataList?: DocumentMetadata[];
  /** The type of document (validated against a defined list of document types). */
  type?: string;
  /**
   * Start of validity period (inclusive). ISO date (yyyy-MM-dd). Omit to leave unchanged.
   * @format date
   */
  validFrom?: string;
  /**
   * End of validity period (inclusive). ISO date (yyyy-MM-dd). Omit to leave unchanged.
   * @format date
   */
  validTo?: string;
}

/** ConfidentialityUpdateRequest model. */
export interface ConfidentialityUpdateRequest {
  /**
   * A flag that can be set to alert administrative users handling the information that there are some special privacy policies to follow for the person in question.
   * If there are special privacy policies to follow for this record, this flag should be set to 'true', otherwise 'false'.
   * Please note: This will affect all revisions, not just the latest revision.
   */
  confidential: boolean;
  /** Legal citation */
  legalCitation?: string;
  /**
   * PersonId of the actor that performed this change.
   * @minLength 1
   */
  updatedBy: string;
}

export interface DocumentTypeUpdateRequest {
  /** Display name for the document type */
  displayName?: string;
  /** Identifier for the document type */
  type?: string;
  /**
   * PersonId of the actor that updated this document type.
   * @minLength 1
   */
  updatedBy: string;
}

/** Aggregated usage statistics for a document. */
export interface DocumentStatistics {
  /** Municipality ID. */
  municipalityId?: string;
  /** Registration number. */
  registrationNumber?: string;
  /**
   * Inclusive lower bound of the aggregation window. Null if unbounded.
   * @format date-time
   */
  from?: string;
  /**
   * Exclusive upper bound of the aggregation window. Null if unbounded.
   * @format date-time
   */
  to?: string;
  /**
   * Total accesses across all revisions and files within the aggregation window.
   * @format int64
   */
  totalAccesses?: number;
  /** Per-revision breakdown. */
  perRevision?: RevisionStatistics[];
}

/** Per-file usage statistics within a document revision. */
export interface FileStatistics {
  /** Document data ID. */
  documentDataId?: string;
  /** File name. May be null if the file no longer exists in any revision of the document. */
  fileName?: string;
  /**
   * Number of download accesses (Content-Disposition: attachment).
   * @format int64
   */
  downloads?: number;
  /**
   * Number of view accesses (Content-Disposition: inline).
   * @format int64
   */
  views?: number;
}

/** Per-revision usage statistics for a document. */
export interface RevisionStatistics {
  /**
   * Document revision number.
   * @format int32
   */
  revision?: number;
  /**
   * Total download accesses across all files in this revision.
   * @format int64
   */
  downloads?: number;
  /**
   * Total view accesses across all files in this revision.
   * @format int64
   */
  views?: number;
  /** Per-file breakdown. */
  perFile?: FileStatistics[];
}

/** Confidentiality split. */
export interface ConfidentialityCounts {
  /**
   * Number of confidential documents.
   * @format int64
   */
  confidential?: number;
  /**
   * Number of non-confidential documents.
   * @format int64
   */
  nonConfidential?: number;
}

/** Aggregated overview statistics across a document corpus. Counts are computed over the latest revision per registration number. */
export interface DocumentStatisticsOverview {
  /** Municipality ID. */
  municipalityId?: string;
  /** Aggregation scope. USER when counts are filtered by createdBy, MUNICIPALITY otherwise. */
  scope?: DocumentStatisticsOverviewScopeEnum;
  /** personId of the user the aggregation is scoped to. Null when scope is MUNICIPALITY. */
  createdBy?: string;
  /**
   * Server time when the response was generated.
   * @format date-time
   */
  generatedAt?: string;
  /**
   * Total number of distinct documents (unique registration numbers) in scope.
   * @format int64
   */
  totalDocuments?: number;
  /** Number of documents per lifecycle status. Every DocumentStatus value is included; zero counts are represented as 0. */
  byStatus?: Record<string, number>;
  /** Number of documents split by confidentiality. */
  byConfidentiality?: ConfidentialityCounts;
  /** Number of documents per document type. All types that have at least one document in scope are listed, sorted by count (descending). */
  byDocumentType?: DocumentTypeCount[];
  /** Number of documents per registration-number year. */
  byRegistrationYear?: YearCount[];
  /** Revision count distribution across documents in scope. */
  revisionDistribution?: RevisionDistribution;
  /**
   * Number of documents (latest revision) that currently have no files attached.
   * @format int64
   */
  documentsWithoutFiles?: number;
  /** Documents with ACTIVE status whose validTo falls within the fixed 30-day look-ahead window. */
  expiringSoon?: ExpiringSoon;
}

/** Count for a single document type. */
export interface DocumentTypeCount {
  /** Document type. */
  type?: string;
  /**
   * Number of documents of this type.
   * @format int64
   */
  count?: number;
}

/** Documents expiring within the fixed 30-day look-ahead window. */
export interface ExpiringSoon {
  /**
   * Look-ahead window size in days (fixed at 30).
   * @format int32
   */
  withinDays?: number;
  /**
   * Number of ACTIVE documents whose validTo falls within the window.
   * @format int64
   */
  count?: number;
}

/** Revision count distribution across documents in scope. */
export interface RevisionDistribution {
  /**
   * Documents that only have one revision.
   * @format int64
   */
  single?: number;
  /**
   * Documents with exactly two revisions.
   * @format int64
   */
  two?: number;
  /**
   * Documents with three or more revisions.
   * @format int64
   */
  threeOrMore?: number;
  /**
   * Highest revision number observed across documents in scope.
   * @format int32
   */
  maxRevision?: number;
}

/** Count for a single registration-number year. */
export interface YearCount {
  /**
   * Registration-number year.
   * @format int32
   */
  year?: number;
  /**
   * Number of documents registered that year.
   * @format int64
   */
  count?: number;
}

/** Document match — a document that contains one or more files matching a fulltext search. */
export interface DocumentMatch {
  /** ID of the matching document (revision-specific, copy-on-write creates a new ID per revision). */
  id?: string;
  /** Registration number of the matching document. */
  registrationNumber?: string;
  /**
   * Revision that the matched files belong to.
   * @format int32
   */
  revision?: number;
  files?: FileMatch[];
}

/** File match — identifies a file that matched a fulltext search. */
export interface FileMatch {
  /** ID of the matching file. */
  id?: string;
  /** File name. */
  fileName?: string;
  /** Highlighted fragments grouped by matched field (e.g. extractedText, title, description, fileName). Matches are wrapped in <em>…</em>. Only fields with matches appear. */
  highlights?: Record<string, string[]>;
  /**
   * Total page count for the file. Populated for PDF and PPTX; null for formats without pages or files not yet reprocessed by the page-extraction backfill.
   * @format int32
   */
  pageCount?: number;
  matches?: Match[];
  /** Status of text extraction for this file — determines whether matches/highlights on extractedText are available. */
  extractionStatus?: FileMatchExtractionStatusEnum;
  /**
   * Relevance score assigned by the search engine. Higher is more relevant.
   * @format float
   */
  score?: number;
  /** Confidentiality flag for the parent document revision. */
  confidential?: boolean;
}

/** A match location inside a file's extracted text. Offsets reference the Tika-extracted text stream (not the rendered document). */
export interface Match {
  /** Field the match occurred in. */
  field?: string;
  /**
   * Start offset (inclusive, 0-based) into the extracted text.
   * @format int32
   */
  start?: number;
  /**
   * End offset (exclusive) into the extracted text.
   * @format int32
   */
  end?: number;
  /**
   * 1-based page number the match falls on (PDF/PPTX only; null for formats without pages).
   * @format int32
   */
  page?: number;
}

/** Paged document match response — documents that matched a fulltext search, stripped to the matching files. */
export interface PagedDocumentMatchResponse {
  documents?: DocumentMatch[];
  /** PagingMetaData model */
  _meta?: PagingMetaData;
}

/** DocumentType model. */
export interface DocumentType {
  /**
   * Identifier for the document type
   * @minLength 1
   */
  type: string;
  /**
   * Display name for the document type
   * @minLength 1
   */
  displayName: string;
}

/** Lifecycle statuses to include. Defaults to published statuses (SCHEDULED, ACTIVE, EXPIRED) - DRAFT and REVOKED are excluded. When set explicitly, the list is used as-is. */
export enum DocumentParametersStatusesEnum {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

/** Lifecycle status of this revision. */
export enum DocumentStatusEnum {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

/** Aggregation scope. USER when counts are filtered by createdBy, MUNICIPALITY otherwise. */
export enum DocumentStatisticsOverviewScopeEnum {
  USER = "USER",
  MUNICIPALITY = "MUNICIPALITY",
}

/** Status of text extraction for this file — determines whether matches/highlights on extractedText are available. */
export enum FileMatchExtractionStatusEnum {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  UNSUPPORTED = "UNSUPPORTED",
  PENDING_REINDEX = "PENDING_REINDEX",
}

/**
 * How this access should be classified in usage statistics.
 * @default "DOWNLOAD"
 * @example "DOWNLOAD"
 */
export enum ReadFileRevisionParamsAccessTypeEnum {
  DOWNLOAD = "DOWNLOAD",
  VIEW = "VIEW",
}

/**
 * How this access should be classified in usage statistics.
 * @default "DOWNLOAD"
 * @example "DOWNLOAD"
 */
export enum ReadFileParamsAccessTypeEnum {
  DOWNLOAD = "DOWNLOAD",
  VIEW = "VIEW",
}

export enum SearchFileMatchesParamsStatusesEnum {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}
