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
  detail?: string;
  causeAsProblem?: ThrowableProblem;
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
