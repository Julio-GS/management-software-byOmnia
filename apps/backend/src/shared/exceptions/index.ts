/**
 * Shared Exception Classes
 * 
 * Provides custom exception hierarchy for the application:
 * - BusinessException: For business rule violations (400)
 * - TechnicalException: For infrastructure/technical failures (500)
 * - RepositoryException: For data layer errors (legacy, to be migrated to TechnicalException)
 */

export { BusinessException } from './business.exception';
export { TechnicalException } from './technical.exception';
export { RepositoryException } from './repository.exception';
