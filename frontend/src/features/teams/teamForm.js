import { validateRequired } from '../../lib/validation';

export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 500;

export const TYPE_OPTIONS = [
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    hint: 'A shared workspace for a team or company.',
  },
  {
    value: 'PERSONAL',
    label: 'Personal',
    hint: 'A private workspace just for you.',
  },
];

export const TYPE_LABEL = Object.fromEntries(
  TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function validateName(value) {
  const requiredError = validateRequired(value, 'Team name');
  if (requiredError) return requiredError;
  if (value.trim().length > NAME_MAX) return `Team name must be ${NAME_MAX} characters or fewer.`;
  return null;
}

export function validateDescription(value) {
  if (value.trim().length > DESCRIPTION_MAX) {
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  return null;
}
