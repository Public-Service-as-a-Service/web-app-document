import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import authMiddleware from '@middlewares/auth.middleware';
import { RequestWithUser } from '../interfaces/auth.interface';
import { UserDto } from '@/responses/user.response';
import { HttpException } from '@exceptions/http.exception';
import { AUTH_TYPE } from '@config';
import { mockUsers } from '../mocks/mock-users';

@Controller()
export class UserController {
  @Get('/me')
  @UseBefore(authMiddleware)
  @OpenAPI({ summary: 'Get the authenticated user' })
  @ResponseSchema(UserDto)
  async getUser(@Req() req: RequestWithUser, @Res() response: any): Promise<UserDto> {
    const user = req.user;

    if (!user || !user.name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: UserDto = {
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      permissions: user.permissions,
    };

    return response.send({ data: userData, message: 'success' });
  }

  @Get('/mock-users')
  @OpenAPI({ summary: 'List available mock users (dev-only, AUTH_TYPE=token)' })
  @ResponseSchema(UserDto, { isArray: true })
  async getMockUsers(@Res() response: any) {
    if (AUTH_TYPE !== 'token') {
      throw new HttpException(404, 'Not Found');
    }

    const users: UserDto[] = mockUsers.map(
      ({ name, firstName, lastName, username, permissions }) => ({
        name,
        firstName,
        lastName,
        username,
        permissions,
      })
    );

    return response.send({ data: users, message: 'success' });
  }
}
