/**
 * Generally useful utilities for sending templated emails.
 */
import type { DB } from '../integrations/postgres';
import { Permission } from '../../shared/user_auth';
import { KeyData } from '../model/key_data';
import { DataKey } from '../../shared/data_keys';
import { siteTitle, siteSubtitle } from '../lib/site_info';

export type EmailType =
  | DataKey.NewAccountEmail
  | DataKey.PasswordResetLinkEmail
  | DataKey.NewPasswordEmail;

import type { UserInfo } from '../../shared/user_auth';
import sgMail from '@sendgrid/mail';

const subjectMarker = 'subject:';

interface Email {
  subject: string;
  body: string;
}

export async function sendEmail(
  db: DB,
  emailType: EmailType,
  userInfo: UserInfo,
  extraParams: any
) {
  const email = await loadEmail(db, emailType);
  await sgMail.send({
    to: userInfo.email,
    from: process.env.CAVESITE_SENDER_EMAIL!,
    subject: replaceParams(email.subject, userInfo, extraParams),
    text: replaceParams(email.body, userInfo, extraParams)
  });
}

async function loadEmail(db: DB, emailType: DataKey): Promise<Email> {
  const email = await KeyData.read(db, null, Permission.Admin, emailType);
  if (email === null) {
    throw Error('Invalid email template for ' + emailType);
  }
  const firstCR = email.indexOf('\n');
  const subject = email.substring(subjectMarker.length, firstCR).trim();
  const body = email.substring(firstCR).trim();
  return { subject, body };
}

function replaceParams(
  text: string,
  userInfo: UserInfo,
  extraParams: Record<string, any>
): string {
  const paramRegex = /([{][^}]+[}])/;
  const splits = text.split(paramRegex);
  let expandedText = '';
  for (const split of splits) {
    let segment = split;
    if (split[0] == '{') {
      const param = split.toLowerCase().substring(1, split.length - 1);
      switch (param) {
        case 'website-title':
          segment = siteTitle;
          break;
        case 'website-subtitle':
          segment = siteSubtitle;
          break;
        case 'first-name':
          segment = userInfo.firstName;
          break;
        case 'last-name':
          segment = userInfo.lastName;
          break;
        case 'user-email':
          segment = userInfo.email;
          break;
        case 'sender-email':
          segment = process.env.CAVESITE_SENDER_EMAIL!;
          break;
        default:
          const value = extraParams[param];
          if (value) segment = value;
      }
    }
    expandedText += segment;
  }
  return expandedText;
}
