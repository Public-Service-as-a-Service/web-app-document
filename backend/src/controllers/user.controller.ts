import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import authMiddleware from '@middlewares/auth.middleware';
import { RequestWithUser } from '../interfaces/auth.interface';
import { UserData } from '../interfaces/user.interface';
import { HttpException } from '@exceptions/http.exception';
import { AUTH_TYPE } from '@config';
import { mockUsers } from '../mocks/mock-users';

@Controller()
export class UserController {
  @Get('/me')
  @UseBefore(authMiddleware)
  async getUser(@Req() req: RequestWithUser, @Res() response: any): Promise<UserData> {
    const user = req.user;

    if (!user || !user.name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: UserData = {
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
    };

    return response.send({ data: userData, message: 'success' });
  }

  @Get('/mock-users')
  async getMockUsers(@Res() response: any) {
    if (AUTH_TYPE !== 'token') {
      throw new HttpException(404, 'Not Found');
    }

    const users: UserData[] = mockUsers.map(
      ({ name, firstName, lastName, username, role, isAdmin, permissions }) => ({
        name,
        firstName,
        lastName,
        username,
        role,
        isAdmin,
        permissions,
      })
    );

    return response.send({ data: users, message: 'success' });
  }
}
