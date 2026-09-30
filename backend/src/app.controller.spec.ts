import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('returns whatever AppService.getHello() returns (pure delegation)', () => {
      jest.spyOn(appService, 'getHello').mockReturnValue('mocked response');

      expect(appController.getHello()).toBe('mocked response');
    });

    it('returns a non-empty string with the real service wired in', () => {
      const result = appController.getHello();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
