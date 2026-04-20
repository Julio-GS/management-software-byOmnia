import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  describe('username validation', () => {
    it('should pass validation with valid username and password', async () => {
      const dto = new LoginDto();
      dto.username = 'admin';
      dto.password = 'Admin123!';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when username is empty', async () => {
      const dto = new LoginDto();
      dto.username = '';
      dto.password = 'Admin123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('username');
    });

    it('should fail validation when username is missing', async () => {
      const dto = new LoginDto();
      dto.password = 'Admin123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const usernameError = errors.find((e) => e.property === 'username');
      expect(usernameError).toBeDefined();
    });

    it('should fail validation when password is too short', async () => {
      const dto = new LoginDto();
      dto.username = 'admin';
      dto.password = 'short';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail validation when password is missing', async () => {
      const dto = new LoginDto();
      dto.username = 'admin';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });
  });

  describe('LoginRequest interface compliance', () => {
    it('should implement LoginRequest with username field', () => {
      const dto = new LoginDto();
      dto.username = 'testuser';
      dto.password = 'Test123!';

      expect(dto.username).toBe('testuser');
      expect(dto.password).toBe('Test123!');
    });
  });
});
