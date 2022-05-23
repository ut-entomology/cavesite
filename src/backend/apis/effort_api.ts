import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { LocationVisit } from '../sampling/location_visit';

export const router = Router();

router.post('/get_points', async (_req: Request, res) => {
  const effort = await LocationVisit.tallyCavePoints(getDB());
  return res.status(StatusCodes.OK).send({ effort });
});
