export function personName(person, fallback = 'Unknown user') {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
  return name || person?.email || fallback;
}
