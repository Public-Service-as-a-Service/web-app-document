import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import authMiddleware from '@middlewares/auth.middleware';
import { RequestWithUser } from '../interfaces/auth.interface';
import { UserData } from '../interfaces/user.interface';
import { HttpException } from '@exceptions/http.exception';

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
      permissions: user.permissions,
    };

    return response.send({ data: userData, message: 'success' });
  }
}
