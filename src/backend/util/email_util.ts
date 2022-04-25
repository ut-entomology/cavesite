import * as path from 'path';
import * as fsp from 'fs/promises';

export enum EmailType {
  NewAccount = 'new-account-email',
  PasswordReset = 'password-reset-email'
}

import type { UserInfo } from '../../shared/user_auth';
import sgMail from '@sendgrid/mail';

const validParams = [
  'cavesite-title',
  'cavesite-subtitle',
  'first-name',
  'last-name',
  'user-email',
  'password',
  'sender-name',
  'sender-email',
  'reset-link'
];
const subjectMarker = 'subject:';

interface Email {
  subject: string;
  body: string;
}

export async function checkAllEmails() {
  let foundErrors = false;
  let unrecognizedParams = false;

  for (const emailType of Object.values(EmailType)) {
    const errors = await checkEmail(emailType);
    if (errors && errors.length > 0) {
      foundErrors = true;
      console.log(`\nErrors in email file ${toFilepath(emailType)}:`);
      for (const error of errors) {
        console.log(`- ${error}`);
        if (error.includes('parameter')) {
          unrecognizedParams = true;
        }
      }
    }
  }
  if (foundErrors) {
    if (unrecognizedParams) {
      console.log('\nOnly the following parameters are recognized:');
      for (const param of validParams) {
        console.log(`- {${param}}`);
      }
    }
    process.exit(1);
  }
}

export async function checkEmail(emailType: EmailType): Promise<string[] | null> {
  const paramRegex = /[{]([^}]+)[}]/g;

  const errors: string[] = [];
  const email = await loadEmail(emailType, errors);
  const matches = email.body.matchAll(paramRegex);

  for (const match of matches) {
    const param = match[1].toLowerCase();
    if (!validParams.includes(param)) {
      errors.push(`Unrecognized parameter {${match[1]}}`);
    }
  }
  return errors.length > 0 ? errors : null;
}

export async function sendEmail(
  emailType: EmailType,
  userInfo: UserInfo,
  extraParams: any
) {
  const email = await loadEmail(emailType, []);
  await sgMail.send({
    to: userInfo.email,
    from: process.env.CAVESITE_SENDER_EMAIL!,
    subject: replaceParams(email.subject, userInfo, extraParams),
    text: replaceParams(email.body, userInfo, extraParams)
  });
}

async function loadEmail(emailType: EmailType, errors: string[]): Promise<Email> {
  const filepath = toFilepath(emailType);
  const email = (await fsp.readFile(filepath)).toString().trim();
  const firstCR = email.indexOf('\n');
  if (firstCR == -1) {
    errors.push(`Invalid`);
    throw Error();
  }
  const subjectLine = email.substring(0, firstCR).trim();
  if (!subjectLine.toLowerCase().startsWith(subjectMarker)) {
    errors.push(`First line does not begin with '${subjectMarker}'`);
  }
  const subject = email.substring(subjectMarker.length, firstCR).trim();
  if (subject == '') {
    errors.push(`No subject`);
  }
  const text = email.substring(firstCR).trim();
  if (text.length == 0) {
    errors.push(`No body`);
  }
  return { subject, body: text };
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
        case 'cavesite-title':
          segment = process.env.CAVESITE_TITLE!;
          break;
        case 'cavesite-subtitle':
          segment = process.env.CAVESITE_SUBTITLE!;
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
        case 'sender-name':
          segment = process.env.CAVESITE_SENDER_NAME!;
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

function toFilepath(emailType: EmailType): string {
  return path.join(__dirname, '../../../emails', emailType + '.txt');
}
