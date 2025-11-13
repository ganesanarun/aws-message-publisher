import { Logger } from '../../src/interfaces/logger.interface';
import { LoggerWrapper } from '../../src/logging/logger-wrapper';

describe('LoggerWrapper', () => {
  let mockLogger: jest.Mocked<Logger>;
  let wrapper: LoggerWrapper;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('debug', () => {
    it('should call underlying logger debug method', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.debug('Test message');

      expect(mockLogger.debug).toHaveBeenCalledWith('Test message', {});
    });

    it('should pass dynamic context to underlying logger', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.debug('Test message', { requestId: '123' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test message', { requestId: '123' });
    });

    it('should merge static and dynamic context', () => {
      wrapper = new LoggerWrapper(mockLogger, { service: 'test-service' });

      wrapper.debug('Test message', { requestId: '123' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test message', {
        service: 'test-service',
        requestId: '123',
      });
    });

    it('should prioritize dynamic context over static context', () => {
      wrapper = new LoggerWrapper(mockLogger, { env: 'dev', service: 'test' });

      wrapper.debug('Test message', { env: 'prod' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test message', {
        env: 'prod',
        service: 'test',
      });
    });

    it('should not throw when underlying logger throws', () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error('Logger error');
      });
      wrapper = new LoggerWrapper(mockLogger);

      expect(() => wrapper.debug('Test message')).not.toThrow();
    });
  });

  describe('info', () => {
    it('should call underlying logger info method', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.info('Test message');

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {});
    });

    it('should pass dynamic context to underlying logger', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.info('Test message', { userId: '456' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', { userId: '456' });
    });

    it('should merge static and dynamic context', () => {
      wrapper = new LoggerWrapper(mockLogger, { service: 'test-service' });

      wrapper.info('Test message', { userId: '456' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        service: 'test-service',
        userId: '456',
      });
    });

    it('should prioritize dynamic context over static context', () => {
      wrapper = new LoggerWrapper(mockLogger, { env: 'dev', service: 'test' });

      wrapper.info('Test message', { env: 'prod' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        env: 'prod',
        service: 'test',
      });
    });

    it('should not throw when underlying logger throws', () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });
      wrapper = new LoggerWrapper(mockLogger);

      expect(() => wrapper.info('Test message')).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should call underlying logger warn method', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.warn('Test message');

      expect(mockLogger.warn).toHaveBeenCalledWith('Test message', {});
    });

    it('should pass dynamic context to underlying logger', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.warn('Test message', { attempt: 2 });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test message', { attempt: 2 });
    });

    it('should merge static and dynamic context', () => {
      wrapper = new LoggerWrapper(mockLogger, { service: 'test-service' });

      wrapper.warn('Test message', { attempt: 2 });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test message', {
        service: 'test-service',
        attempt: 2,
      });
    });

    it('should prioritize dynamic context over static context', () => {
      wrapper = new LoggerWrapper(mockLogger, { env: 'dev', service: 'test' });

      wrapper.warn('Test message', { env: 'prod' });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test message', {
        env: 'prod',
        service: 'test',
      });
    });

    it('should not throw when underlying logger throws', () => {
      mockLogger.warn.mockImplementation(() => {
        throw new Error('Logger error');
      });
      wrapper = new LoggerWrapper(mockLogger);

      expect(() => wrapper.warn('Test message')).not.toThrow();
    });
  });

  describe('error', () => {
    it('should call underlying logger error method', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.error('Test message');

      expect(mockLogger.error).toHaveBeenCalledWith('Test message', {});
    });

    it('should pass dynamic context to underlying logger', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.error('Test message', { errorCode: 'E001' });

      expect(mockLogger.error).toHaveBeenCalledWith('Test message', { errorCode: 'E001' });
    });

    it('should merge static and dynamic context', () => {
      wrapper = new LoggerWrapper(mockLogger, { service: 'test-service' });

      wrapper.error('Test message', { errorCode: 'E001' });

      expect(mockLogger.error).toHaveBeenCalledWith('Test message', {
        service: 'test-service',
        errorCode: 'E001',
      });
    });

    it('should prioritize dynamic context over static context', () => {
      wrapper = new LoggerWrapper(mockLogger, { env: 'dev', service: 'test' });

      wrapper.error('Test message', { env: 'prod' });

      expect(mockLogger.error).toHaveBeenCalledWith('Test message', {
        env: 'prod',
        service: 'test',
      });
    });

    it('should not throw when underlying logger throws', () => {
      mockLogger.error.mockImplementation(() => {
        throw new Error('Logger error');
      });
      wrapper = new LoggerWrapper(mockLogger);

      expect(() => wrapper.error('Test message')).not.toThrow();
    });
  });

  describe('context merging', () => {
    it('should use static context when no dynamic context provided', () => {
      wrapper = new LoggerWrapper(mockLogger, { service: 'test', env: 'dev' });

      wrapper.info('Test message');

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        service: 'test',
        env: 'dev',
      });
    });

    it('should handle empty static context', () => {
      wrapper = new LoggerWrapper(mockLogger, {});

      wrapper.info('Test message', { requestId: '123' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', { requestId: '123' });
    });

    it('should handle undefined static context', () => {
      wrapper = new LoggerWrapper(mockLogger);

      wrapper.info('Test message', { requestId: '123' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', { requestId: '123' });
    });
  });
});
