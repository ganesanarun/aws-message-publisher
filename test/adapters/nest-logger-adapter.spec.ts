import { NestLoggerAdapter } from '../../src/adapters/nest-logger-adapter';

describe('NestLoggerAdapter', () => {
  let mockNestLogger: any;
  let adapter: NestLoggerAdapter;

  beforeEach(() => {
    mockNestLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    adapter = new NestLoggerAdapter(mockNestLogger);
  });

  describe('debug', () => {
    it('should call NestJS logger debug method', () => {
      adapter.debug('Test debug message');

      expect(mockNestLogger.debug).toHaveBeenCalledWith('Test debug message', undefined);
    });

    it('should pass context to NestJS logger debug', () => {
      const context = { key: 'value' };
      adapter.debug('Test debug', context);

      expect(mockNestLogger.debug).toHaveBeenCalledWith('Test debug', context);
    });
  });

  describe('info', () => {
    it('should call NestJS logger log method (not info)', () => {
      adapter.info('Test info message');

      expect(mockNestLogger.log).toHaveBeenCalledWith('Test info message', undefined);
    });

    it('should pass context to NestJS logger log', () => {
      const context = { requestId: '123' };
      adapter.info('Test info', context);

      expect(mockNestLogger.log).toHaveBeenCalledWith('Test info', context);
    });
  });

  describe('warn', () => {
    it('should call NestJS logger warn method', () => {
      adapter.warn('Test warning message');

      expect(mockNestLogger.warn).toHaveBeenCalledWith('Test warning message', undefined);
    });

    it('should pass context to NestJS logger warn', () => {
      const context = { warning: 'details' };
      adapter.warn('Test warn', context);

      expect(mockNestLogger.warn).toHaveBeenCalledWith('Test warn', context);
    });
  });

  describe('error', () => {
    it('should call NestJS logger error method', () => {
      adapter.error('Test error message');

      expect(mockNestLogger.error).toHaveBeenCalledWith('Test error message', undefined);
    });

    it('should pass context to NestJS logger error', () => {
      const context = { error: 'details', stack: 'trace' };
      adapter.error('Test error', context);

      expect(mockNestLogger.error).toHaveBeenCalledWith('Test error', context);
    });
  });

  describe('integration', () => {
    it('should work with all log levels', () => {
      adapter.debug('Debug message', { level: 'debug' });
      adapter.info('Info message', { level: 'info' });
      adapter.warn('Warn message', { level: 'warn' });
      adapter.error('Error message', { level: 'error' });

      expect(mockNestLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockNestLogger.log).toHaveBeenCalledTimes(1);
      expect(mockNestLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockNestLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
