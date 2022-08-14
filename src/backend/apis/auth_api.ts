/**
 * This module provides the web API for initially connecting to the server.
 */

import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import type { AppInfo } from '../../shared/app_info';

export const router = Router();

router.post('/connect', async (_req, res) => {
  return res.status(StatusCodes.OK).send(getAppInfo());
});

let appInfo: AppInfo;
function getAppInfo() {
  const hiddenRoutes: string[] = [];
  if (process.env.CAVESITE_HIDDEN_TABS) {
    const rawHiddenTabs = process.env.CAVESITE_HIDDEN_TABS.split(',');
    for (const hiddenTab of rawHiddenTabs) {
      hiddenRoutes.push('/' + hiddenTab.trim().toLowerCase());
    }
  }

  if (!appInfo) {
    appInfo = {
      appTitle: process.env.CAVESITE_TITLE!,
      appSubtitle: process.env.CAVESITE_SUBTITLE!,
      hiddenRoutes,
      mapToken: process.env.MAPBOX_ACCESS_TOKEN!
    };
  }
  return appInfo;
}
